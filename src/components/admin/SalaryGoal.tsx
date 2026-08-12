import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Target, TrendingUp, Calendar as CalendarIcon } from "lucide-react";
import { getBrazilTodayStr, getBrazilMonthStartStr } from "@/lib/brazilTime";
import { useDataRefresh } from "@/lib/refreshBus";

const SALARY_GOAL = 2500;

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Row = { entry_date: string; amount: number };

const SalaryGoal = () => {
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
      // Fonte única: ENTRADAS REAIS do caixa (não recalcula preços de atendimento)
      const { data } = await (supabase as any)
        .from("cash_entries")
        .select("entry_date, amount")
        .eq("kind", "in")
        .limit(5000);
      setRows((data as Row[]) || []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("salary-goal-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cash_entries" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useDataRefresh(["cash", "appointments"], load);

  const stats = useMemo(() => {
    const today = getBrazilTodayStr();
    const monthStart = getBrazilMonthStartStr();
    const year = today.slice(0, 4);

    let daily = 0, monthly = 0, yearly = 0;
    const weekBuckets: number[] = [0, 0, 0, 0, 0]; // weeks 1..5 of current month

    for (const r of rows) {
      const p = Number(r.amount) || 0;
      if (r.entry_date.startsWith(year)) yearly += p;
      if (r.entry_date >= monthStart) {
        monthly += p;
        const day = parseInt(r.entry_date.slice(8, 10), 10);
        const wk = Math.min(Math.ceil(day / 7), 5) - 1;
        weekBuckets[wk] += p;
      }
      if (r.entry_date === today) daily += p;
    }

    const progress = Math.min((monthly / SALARY_GOAL) * 100, 100);
    const remaining = Math.max(SALARY_GOAL - monthly, 0);

    return { daily, monthly, yearly, weekBuckets, progress, remaining };
  }, [rows]);


  return (
    <div className="bg-card border border-border rounded-lg p-3 sm:p-6">
      <div className="flex items-center gap-2 mb-2 sm:mb-4">
        <Target className="w-5 h-5 text-primary" />
        <h2 className="text-base sm:text-lg font-bold text-foreground">Meta de Salário</h2>
        <span className="ml-auto text-[11px] sm:text-xs font-semibold bg-primary/10 text-primary border border-primary/30 rounded-full px-2 sm:px-3 py-0.5 sm:py-1">
          {formatCurrency(SALARY_GOAL)}/mês
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-2 sm:mb-4">
        <div className="flex justify-between text-[11px] sm:text-xs mb-1">
          <span className="text-muted-foreground">Progresso do mês</span>
          <span className="font-bold text-foreground">
            {formatCurrency(stats.monthly)} <span className="text-muted-foreground">/ {formatCurrency(SALARY_GOAL)}</span>
          </span>
        </div>
        <div className="w-full h-2 sm:h-3 bg-background border border-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-amber-400 transition-all"
            style={{ width: `${stats.progress}%` }}
          />
        </div>
        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">
          {stats.remaining > 0
            ? `Faltam ${formatCurrency(stats.remaining)} para bater a meta (${stats.progress.toFixed(1)}%)`
            : `🎉 Meta atingida! +${formatCurrency(stats.monthly - SALARY_GOAL)} acima`}
        </p>
      </div>

      {/* Day / Month / Year cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-2 sm:mb-4">
        <div className="bg-background border border-border rounded-lg p-1.5 sm:p-3 text-center min-w-0">
          <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary mx-auto mb-0.5 sm:mb-1" />
          <p className="text-[10px] sm:text-xs text-muted-foreground">Diário</p>
          <p className="text-xs sm:text-sm font-bold text-foreground break-all leading-tight">{formatCurrency(stats.daily)}</p>
        </div>
        <div className="bg-background border border-border rounded-lg p-1.5 sm:p-3 text-center min-w-0">
          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary mx-auto mb-0.5 sm:mb-1" />
          <p className="text-[10px] sm:text-xs text-muted-foreground">Mensal</p>
          <p className="text-xs sm:text-sm font-bold text-foreground break-all leading-tight">{formatCurrency(stats.monthly)}</p>
        </div>
        <div className="bg-background border border-border rounded-lg p-1.5 sm:p-3 text-center min-w-0">
          <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary mx-auto mb-0.5 sm:mb-1" />
          <p className="text-[10px] sm:text-xs text-muted-foreground">Anual</p>
          <p className="text-xs sm:text-sm font-bold text-foreground break-all leading-tight">{formatCurrency(stats.yearly)}</p>
        </div>
      </div>

      {/* Weekly breakdown of current month */}
      <div>
        <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2">Por semana (mês atual)</p>
        <div className="space-y-1 sm:space-y-1.5">
          {stats.weekBuckets.map((v, i) => {
            const pct = Math.min((v / SALARY_GOAL) * 100, 100);
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs text-muted-foreground w-16 sm:w-20 shrink-0">{i + 1}ª semana</span>
                <div className="flex-1 h-1.5 sm:h-2 bg-background border border-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary/70" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-foreground w-16 sm:w-24 text-right">
                  {formatCurrency(v)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SalaryGoal;