// Horário de funcionamento configurável (fuso America/Sao_Paulo)
export type DayHours = {
  closed: boolean;
  open: string;
  lunch_start: string;
  lunch_end: string;
  close: string;
};

export type BusinessHours = {
  // Horário base (compatibilidade com telas antigas / regra de caixa)
  open: string;
  lunch_start: string;
  lunch_end: string;
  close: string;
  investment_rule_min: number;
  investment_rule_amount: number;
  // Horário por dia da semana: 0 = domingo ... 6 = sábado
  days: DayHours[];
};

export const DAY_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const BASE_DAY: Omit<DayHours, "closed"> = {
  open: "08:00",
  lunch_start: "12:00",
  lunch_end: "13:00",
  close: "19:00",
};

export const DEFAULT_HOURS: BusinessHours = {
  ...BASE_DAY,
  investment_rule_min: 20,
  investment_rule_amount: 5,
  days: Array.from({ length: 7 }, (_, i) => ({ ...BASE_DAY, closed: i === 0 })),
};

export const timeToMinutes = (t: string) => {
  const [h, m] = (t || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const minutesToTime = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export const parseHours = (value: unknown): BusinessHours => {
  const v = (value || {}) as Partial<BusinessHours>;
  const base = {
    open: v.open || DEFAULT_HOURS.open,
    lunch_start: v.lunch_start || DEFAULT_HOURS.lunch_start,
    lunch_end: v.lunch_end || DEFAULT_HOURS.lunch_end,
    close: v.close || DEFAULT_HOURS.close,
  };

  const rawDays = Array.isArray(v.days) ? v.days : [];
  const days: DayHours[] = Array.from({ length: 7 }, (_, i) => {
    const d = (rawDays[i] || {}) as Partial<DayHours>;
    return {
      closed: typeof d.closed === "boolean" ? d.closed : i === 0,
      open: d.open || base.open,
      lunch_start: d.lunch_start || base.lunch_start,
      lunch_end: d.lunch_end || base.lunch_end,
      close: d.close || base.close,
    };
  });

  return {
    ...base,
    investment_rule_min: Number(v.investment_rule_min ?? DEFAULT_HOURS.investment_rule_min),
    investment_rule_amount: Number(v.investment_rule_amount ?? DEFAULT_HOURS.investment_rule_amount),
    days,
  };
};

// Dia da semana (0-6) de uma data YYYY-MM-DD sem sofrer com fuso
export const weekdayOf = (dateStr: string) => new Date(`${dateStr}T12:00:00`).getDay();

export const getDayHours = (h: BusinessHours, weekday: number): DayHours =>
  h.days?.[weekday] || { ...DEFAULT_HOURS.days[weekday] };

export const isClosedDay = (h: BusinessHours, dateStr: string) =>
  getDayHours(h, weekdayOf(dateStr)).closed;

// Gera os horários disponíveis de 10 em 10 minutos respeitando o intervalo de almoço
export const buildTimeSlots = (h: BusinessHours | DayHours, step = 10): string[] => {
  const slots: string[] = [];
  if ((h as DayHours).closed) return slots;
  const open = timeToMinutes(h.open);
  const close = timeToMinutes(h.close);
  const lunchStart = timeToMinutes(h.lunch_start);
  const lunchEnd = timeToMinutes(h.lunch_end);

  for (let m = open; m <= close; m += step) {
    if (lunchEnd > lunchStart && m >= lunchStart && m < lunchEnd) continue;
    slots.push(minutesToTime(m));
  }
  return slots;
};

// Horários de um dia específico (data YYYY-MM-DD)
export const slotsForDate = (h: BusinessHours, dateStr: string, step = 10): string[] =>
  buildTimeSlots(getDayHours(h, weekdayOf(dateStr)), step);
