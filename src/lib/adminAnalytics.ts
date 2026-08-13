import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDataRefresh } from "@/lib/refreshBus";
import {
  getBrazilTodayStr,
  getBrazilWeekStartStr,
  getBrazilMonthStartStr,
  addDaysToDateStr,
} from "@/lib/brazilTime";

/**
 * Camada de leitura compartilhada dos painéis analíticos do ADM.
 * IMPORTANTE: apenas LEITURA. Nenhum dado é criado, alterado ou apagado aqui.
 * Faturamento bruto = entradas reais do caixa (cash_entries.kind = 'in'),
 * mantendo a mesma fonte já usada pelo módulo financeiro (sem duplicar valores).
 */

export type Appt = {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
};

export type CashEntry = {
  id: string;
  entry_date: string;
  kind: string;
  amount: number;
  category: string;
  description: string;
  appointment_id: string | null;
};

export type ServicePrice = { name: string; price: number };

export type AnalyticsData = {
  appts: Appt[];
  entries: CashEntry[];
  services: ServicePrice[];
  loading: boolean;
  reload: () => void;
};

export const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
export const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const WEEKDAYS_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const fmtBR = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR");

export const weekdayOf = (dateStr: string) => new Date(dateStr + "T12:00:00").getDay();

export const useAdminAnalytics = (): AnalyticsData => {
  const [appts, setAppts] = useState<Appt[]>([]);
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [services, setServices] = useState<ServicePrice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [a, c, s] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, customer_name, customer_phone, service_name, appointment_date, appointment_time, status")
        .order("appointment_date", { ascending: false })
        .limit(5000),
      (supabase as any)
        .from("cash_entries")
        .select("id, entry_date, kind, amount, category, description, appointment_id")
        .order("entry_date", { ascending: false })
        .limit(5000),
      supabase.from("services").select("name, price"),
    ]);
    setAppts((a.data as Appt[]) || []);
    setEntries(((c.data as any[]) || []).map((e) => ({ ...e, amount: Number(e.amount || 0) })));
    setServices((s.data as ServicePrice[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-analytics-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "cash_entries" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  useDataRefresh(["appointments", "cash", "all"], load);

  return { appts, entries, services, loading, reload: load };
};

// ---------- períodos ----------
export type PeriodKey =
  | "today" | "yesterday" | "week" | "lastweek" | "month" | "lastmonth" | "year" | "lastyear" | "all";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  week: "Esta semana",
  lastweek: "Semana passada",
  month: "Este mês",
  lastmonth: "Mês passado",
  year: "Este ano",
  lastyear: "Ano anterior",
  all: "Histórico total",
};

export const periodRange = (p: PeriodKey): { start: string; end: string } => {
  const today = getBrazilTodayStr();
  const year = today.slice(0, 4);
  switch (p) {
    case "today":
      return { start: today, end: today };
    case "yesterday": {
      const y = addDaysToDateStr(today, -1);
      return { start: y, end: y };
    }
    case "week":
      return { start: getBrazilWeekStartStr(), end: today };
    case "lastweek": {
      const ws = getBrazilWeekStartStr();
      return { start: addDaysToDateStr(ws, -7), end: addDaysToDateStr(ws, -1) };
    }
    case "month":
      return { start: getBrazilMonthStartStr(), end: today };
    case "lastmonth": {
      const ms = getBrazilMonthStartStr();
      const [y, m] = ms.split("-").map(Number);
      const prevY = m === 1 ? y - 1 : y;
      const prevM = m === 1 ? 12 : m - 1;
      const start = `${prevY}-${String(prevM).padStart(2, "0")}-01`;
      return { start, end: addDaysToDateStr(ms, -1) };
    }
    case "year":
      return { start: `${year}-01-01`, end: today };
    case "lastyear": {
      const py = Number(year) - 1;
      return { start: `${py}-01-01`, end: `${py}-12-31` };
    }
    default:
      return { start: "0000-01-01", end: "9999-12-31" };
  }
};

export const inRange = (date: string, r: { start: string; end: string }) =>
  date >= r.start && date <= r.end;

/** Faturamento bruto real do período: somente entradas do caixa. */
export const grossIn = (entries: CashEntry[], r: { start: string; end: string }) =>
  entries.filter((e) => e.kind === "in" && inRange(e.entry_date, r)).reduce((s, e) => s + e.amount, 0);

/** Saídas reais do período (não reduzem o faturamento bruto, apenas o saldo). */
export const totalOut = (entries: CashEntry[], r: { start: string; end: string }) =>
  entries.filter((e) => e.kind === "out" && inRange(e.entry_date, r)).reduce((s, e) => s + e.amount, 0);

export const completedIn = (appts: Appt[], r: { start: string; end: string }) =>
  appts.filter((a) => a.status === "completed" && inRange(a.appointment_date, r));

export const trendArrow = (curr: number, prev: number) => {
  if (prev <= 0) return { icon: "→", pct: 0, color: "text-muted-foreground" };
  const pct = ((curr - prev) / prev) * 100;
  if (pct > 2) return { icon: "↑", pct, color: "text-green-500" };
  if (pct < -2) return { icon: "↓", pct, color: "text-red-500" };
  return { icon: "→", pct, color: "text-muted-foreground" };
};
