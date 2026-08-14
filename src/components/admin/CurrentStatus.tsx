import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Target, Users, Scissors, Package, TrendingUp, TrendingDown } from "lucide-react";
import { useAdminAnalytics, PeriodKey, PERIOD_LABELS, periodRange, inRange, fmtBR } from "@/lib/adminAnalytics";
import { totalsOf, RawEntry } from "@/lib/businessData";
import { getBrazilTodayStr } from "@/lib/brazilTime";
import { parseHours, DEFAULT_HOURS, BusinessHours } from "@/lib/businessHours";

const GOAL_KEY = "monthly_revenue_goal";

const PERIODS: PeriodKey[] = ["today", "yesterday", "week", "month", "lastmonth", "year", "all"];

const prevRangeOf = (p: PeriodKey) => {
  const map: Partial<Record<PeriodKey, PeriodKey>> = {
    today: "yesterday",
    week: "lastweek",
    month: "lastmonth",
    year: "lastyear",
  };
  const prev = map[p];
  return prev ? periodRange(prev) : null;
};

const CurrentStatus = () => {
  const { entries, appts, loading } = useAdminAnalytics();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [goal, setGoal] = useState(2500);
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS);

  useEffect(() => {
    (async () => {
      const [g, h] = await Promise.all([
        supabase.from("app_settings").select("value").eq("key", GOAL_KEY).maybeSingle(),
        supabase.from("app_settings").select("value").eq("key", "business_hours").maybeSingle(),
      ]);
      if (g.data?.value) setGoal(Number(g.data.value) || 2500);
      if (h.data?.value) setHours(parseHours(h.data.value));
    })();
  }, []);

  const range = useMemo(() => periodRange(period), [period]);

  const current = useMemo(() => {
    const list = (entries as unknown as RawEntry[]).filter((e) => inRange(e.entry_date, range));
    return totalsOf(list);
  }, [entries, range]);

  const previous = useMemo(() => {
    const r = prevRangeOf(period);
    if (!r) return null;
    const list = (entries as unknown as RawEntry[]).filter((e) => inRange(e.entry_date, r));
    return totalsOf(list);
  }, [entries, period]);

  const uniqueClients = useMemo(() => {
    const set = new Set(
      appts
        .filter((a) => a.status === "completed" && inRange(a.appointment_date, range))
        .map((a) => (a.customer_phone || "").replace(/\D/g, "")),
    );
    set.delete("");
    return set.size;
  }, [appts, range]);

  const visits = useMemo(
    () => appts.filter((a) => a.status === "completed" && inRange(a.appointment_date, range)).length,
    [appts, range],
  );

  // Dias de trabalho restantes no mês (usa horário de funcionamento já configurado)
  const remaining = useMemo(() => {
    const today = getBrazilTodayStr();
    const [y, m] = today.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    let count = 0;
    for (let d = Number(today.slice(8, 10)); d <= lastDay; d++) {
      const wd = new Date(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00`).getDay();
      if (!hours.days?.[wd]?.closed) count++;
    }
    return count;
  }, [hours]);

  const isMonth = period === "month";
  const pct = goal > 0 ? Math.min(100, (current.gross / goal) * 100) : 0;
  const missing = Math.max(0, goal - current.gross);
  const perDay = remaining > 0 ? missing / remaining : 0;

  const delta = (curr: number, prev: number) => {
    if (!prev) return null;
    return ((curr - prev) / prev) * 100;
  };
  const grossDelta = previous ? delta(current.gross, previous.gross) : null;

  return (
    <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-3 sm:p-4 w-full min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Activity className="w-5 h-5 text-primary shrink-0" />
        <h2 className="text-base sm:text-lg font-bold">Situação Atual</h2>
        <div className="ml-auto min-w-0">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">{PERIOD_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Carregando…</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="bg-background/60 rounded p-2 text-center min-w-0">
              <Scissors className="w-4 h-4 text-primary mx-auto" />
              <p className="text-[10px] text-muted-foreground">Serviços</p>
              <p className="text-xs sm:text-sm font-bold break-all">{fmtBR(current.services)}</p>
            </div>
            <div className="bg-background/60 rounded p-2 text-center min-w-0">
              <Package className="w-4 h-4 text-amber-500 mx-auto" />
              <p className="text-[10px] text-muted-foreground">Produtos</p>
              <p className="text-xs sm:text-sm font-bold break-all">{fmtBR(current.products)}</p>
            </div>
            <div className="bg-primary/10 border border-primary/30 rounded p-2 text-center min-w-0">
              <p className="text-[10px] text-muted-foreground">Bruto total</p>
              <p className="text-xs sm:text-sm font-bold text-primary break-all">{fmtBR(current.gross)}</p>
              {grossDelta !== null && (
                <p className={`text-[10px] flex items-center justify-center gap-0.5 ${grossDelta >= 0 ? "text-green-500" : "text-destructive"}`}>
                  {grossDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {grossDelta.toFixed(0)}%
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <div className="bg-background/60 rounded p-2 text-center min-w-0">
              <p className="text-[10px] text-muted-foreground">Agendados</p>
              <p className="text-sm font-bold">{current.scheduledCount}</p>
            </div>
            <div className="bg-background/60 rounded p-2 text-center min-w-0">
              <p className="text-[10px] text-muted-foreground">Manuais</p>
              <p className="text-sm font-bold">{current.manualCount}</p>
            </div>
            <div className="bg-background/60 rounded p-2 text-center min-w-0">
              <p className="text-[10px] text-muted-foreground">Total atendimentos</p>
              <p className="text-sm font-bold text-primary">{current.attendances}</p>
            </div>
            <div className="bg-background/60 rounded p-2 text-center min-w-0">
              <p className="text-[10px] text-muted-foreground">Ticket médio</p>
              <p className="text-sm font-bold break-all">{fmtBR(current.ticket)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-background/60 rounded p-2 text-center min-w-0">
              <Users className="w-4 h-4 text-blue-400 mx-auto" />
              <p className="text-[10px] text-muted-foreground">Clientes únicos</p>
              <p className="text-sm font-bold">{uniqueClients}</p>
            </div>
            <div className="bg-background/60 rounded p-2 text-center min-w-0">
              <p className="text-[10px] text-muted-foreground">Visitas (atendidas)</p>
              <p className="text-sm font-bold">{visits}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background/40 p-2.5">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Target className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-semibold">Meta do período</span>
              <span className="ml-auto text-xs font-bold">{fmtBR(goal)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1 gap-2 flex-wrap">
              <span>{pct.toFixed(1)}% alcançado</span>
              <span>Falta {fmtBR(missing)}</span>
            </div>
            {isMonth && remaining > 0 && missing > 0 && (
              <p className="text-[11px] text-primary mt-1">
                Média necessária: {fmtBR(perDay)} por dia · {remaining} dia(s) de trabalho restante(s)
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CurrentStatus;
