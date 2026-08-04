// Horário de funcionamento configurável (fuso America/Sao_Paulo)
export type BusinessHours = {
  open: string;
  lunch_start: string;
  lunch_end: string;
  close: string;
  investment_rule_min: number;
  investment_rule_amount: number;
};

export const DEFAULT_HOURS: BusinessHours = {
  open: "08:00",
  lunch_start: "12:00",
  lunch_end: "13:00",
  close: "19:00",
  investment_rule_min: 20,
  investment_rule_amount: 5,
};

export const timeToMinutes = (t: string) => {
  const [h, m] = (t || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const minutesToTime = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export const parseHours = (value: unknown): BusinessHours => {
  const v = (value || {}) as Partial<BusinessHours>;
  return {
    open: v.open || DEFAULT_HOURS.open,
    lunch_start: v.lunch_start || DEFAULT_HOURS.lunch_start,
    lunch_end: v.lunch_end || DEFAULT_HOURS.lunch_end,
    close: v.close || DEFAULT_HOURS.close,
    investment_rule_min: Number(v.investment_rule_min ?? DEFAULT_HOURS.investment_rule_min),
    investment_rule_amount: Number(v.investment_rule_amount ?? DEFAULT_HOURS.investment_rule_amount),
  };
};

// Gera os horários disponíveis de 10 em 10 minutos respeitando o intervalo de almoço
export const buildTimeSlots = (h: BusinessHours, step = 10): string[] => {
  const slots: string[] = [];
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
