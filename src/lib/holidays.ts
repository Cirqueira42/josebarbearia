// Feriados nacionais (Brasil) — apenas INFORMATIVO.
// Não fecha a agenda automaticamente: o bloqueio continua sendo feito
// pelo sistema de bloqueio de horários/dias que já existe no painel.

const easterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const shift = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);

const cache: Record<number, Record<string, string>> = {};

export const holidaysOfYear = (year: number): Record<string, string> => {
  if (cache[year]) return cache[year];
  const easter = easterSunday(year);
  const map: Record<string, string> = {
    [`${year}-01-01`]: "Confraternização Universal",
    [`${year}-04-21`]: "Tiradentes",
    [`${year}-05-01`]: "Dia do Trabalho",
    [`${year}-09-07`]: "Independência do Brasil",
    [`${year}-10-12`]: "Nossa Senhora Aparecida",
    [`${year}-11-02`]: "Finados",
    [`${year}-11-15`]: "Proclamação da República",
    [`${year}-11-20`]: "Consciência Negra",
    [`${year}-12-25`]: "Natal",
    [iso(shift(easter, -48))]: "Carnaval",
    [iso(shift(easter, -47))]: "Carnaval",
    [iso(shift(easter, -2))]: "Sexta-feira Santa",
    [iso(easter)]: "Páscoa",
    [iso(shift(easter, 60))]: "Corpus Christi",
  };
  cache[year] = map;
  return map;
};

/** Nome do feriado para uma data YYYY-MM-DD, ou null. */
export const holidayName = (dateStr: string): string | null => {
  if (!dateStr || dateStr.length < 10) return null;
  const year = Number(dateStr.slice(0, 4));
  return holidaysOfYear(year)[dateStr] || null;
};

/** Próximos feriados a partir de hoje (YYYY-MM-DD) dentro de N dias. */
export const upcomingHolidays = (todayStr: string, days = 45) => {
  const year = Number(todayStr.slice(0, 4));
  const all = { ...holidaysOfYear(year), ...holidaysOfYear(year + 1) };
  const limit = new Date(new Date(todayStr + "T12:00:00").getTime() + days * 86400000)
    .toISOString().slice(0, 10);
  return Object.entries(all)
    .filter(([d]) => d >= todayStr && d <= limit)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, name]) => ({ date, name }));
};
