// Utilitários de data/hora para o fuso America/Sao_Paulo (Brasil)
// IMPORTANTE: Nunca use new Date().toISOString().split("T")[0] para "data de hoje no Brasil",
// porque isso converte de volta para UTC e pode pular para o dia seguinte perto da meia-noite.

const BRAZIL_TZ = "America/Sao_Paulo";

// Retorna { year, month, day, hour, minute, second, weekday } no fuso de São Paulo
const getBrazilParts = () => {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: BRAZIL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  const wkMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    hour: parseInt(get("hour"), 10) % 24, // Intl pode retornar "24" à meia-noite
    minute: parseInt(get("minute"), 10),
    second: parseInt(get("second"), 10),
    weekday: wkMap[get("weekday")] ?? 0,
  };
};

// "YYYY-MM-DD" referente a hoje em São Paulo
export const getBrazilTodayStr = (): string => {
  const p = getBrazilParts();
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
};

// Minutos desde 00:00 no horário atual de São Paulo
export const getBrazilNowMinutes = (): number => {
  const p = getBrazilParts();
  return p.hour * 60 + p.minute;
};

// Dia da semana atual (0=Domingo ... 6=Sábado) em São Paulo
export const getBrazilWeekday = (): number => getBrazilParts().weekday;

// Soma N dias a uma string YYYY-MM-DD (sem riscos de fuso)
export const addDaysToDateStr = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

// Início da semana (segunda) atual em São Paulo, formato YYYY-MM-DD
export const getBrazilWeekStartStr = (): string => {
  const today = getBrazilTodayStr();
  const dow = getBrazilWeekday();
  const offset = dow === 0 ? 6 : dow - 1;
  return addDaysToDateStr(today, -offset);
};

// Primeiro dia do mês atual em São Paulo, formato YYYY-MM-DD
export const getBrazilMonthStartStr = (): string => {
  const p = getBrazilParts();
  return `${p.year}-${String(p.month).padStart(2, "0")}-01`;
};

// Subtrai N meses de hoje (Brasil) e retorna YYYY-MM-DD
export const subtractMonthsFromTodayStr = (months: number): string => {
  const p = getBrazilParts();
  const dt = new Date(Date.UTC(p.year, p.month - 1, p.day));
  dt.setUTCMonth(dt.getUTCMonth() - months);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};
