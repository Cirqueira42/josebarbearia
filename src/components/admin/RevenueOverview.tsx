import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, Pencil, Check, Trophy, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getBrazilTodayStr } from "@/lib/brazilTime";
import {
  useAdminAnalytics, fmtBR, grossIn, totalOut, completedIn, periodRange,
  trendArrow, MONTHS_PT, MONTHS_SHORT,
} from "@/lib/adminAnalytics";

const GOAL_KEY = "monthly_revenue_goal";

/**
 * FATURAMENTO DO BARBEIRO — visão principal do painel.
 * Fonte única: entradas reais do caixa (cash_entries kind='in'), a mesma já usada
 * pelo módulo financeiro. Categorias/saídas NÃO são somadas ao bruto (evita duplicação).
 */
const RevenueOverview = () => {
  const { entries, appts, loading } = useAdminAnalytics();
  const [goal, setGoal] = useState(5000);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("5000");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", GOAL_KEY).maybeSingle();
      const v = Number(data?.value ?? 0);
      if (v > 0) { setGoal(v); setDraft(String(v)); }
    })();
  }, []);

  const saveGoal = async () => {
    const v = Math.max(0, Number(draft.replace(",", ".")) || 0);
    setGoal(v); setEditing(false);
    await supabase.from("app_settings").upsert({ key: GOAL_KEY, value: v as any }, { onConflict: "key" });
  };

  const d = useMemo(() => {
    const today = getBrazilTodayStr();
    const [yStr, mStr, dStr] = today.split("-");
    const year = Number(yStr), month = Number(mStr), dayNum = Number(dStr);

    const R = {
      day: periodRange("today"), week: periodRange("week"), month: periodRange("month"),
      year: periodRange("year"), lastMonth: periodRange("lastmonth"), lastWeek: periodRange("lastweek"),
      lastYear: periodRange("lastyear"), yesterday: periodRange("yesterday"),
    };

    const g = {
      day: grossIn(entries, R.day), week: grossIn(entries, R.week), month: grossIn(entries, R.month),
      year: grossIn(entries, R.year), lastMonth: grossIn(entries, R.lastMonth),
      lastWeek: grossIn(entries, R.lastWeek), lastYear: grossIn(entries, R.lastYear),
      yesterday: grossIn(entries, R.yesterday),
    };

    const ticket = (gross: number, r: { start: string; end: string }) => {
      const n = completedIn(appts, r).length;
      return n > 0 ? gross / n : 0;
    };

    // histórico jan → dez do ano atual
    const months = MONTHS_PT.map((label, i) => {
      const mm = String(i + 1).padStart(2, "0");
      const r = { start: `${year}-${mm}-01`, end: `${year}-${mm}-31` };
      const gross = grossIn(entries, r);
      const done = completedIn(appts, r);
      const clients = new Set(done.map((a) => a.customer_phone)).size;
      return { i, label, short: MONTHS_SHORT[i], gross, visits: done.length, clients };
    });
    const withData = months.filter((m) => m.gross > 0 || m.visits > 0);
    const best = withData.length ? withData.reduce((a, b) => (b.gross > a.gross ? b : a)) : null;
    const worst = withData.length ? withData.reduce((a, b) => (b.gross < a.gross ? b : a)) : null;
    const avg = withData.length ? withData.reduce((s, m) => s + m.gross, 0) / withData.length : 0;

    // meta / ritmo
    const daysInMonth = new Date(year, month, 0).getDate();
    const expected = goal * (dayNum / daysInMonth);
    const remainingDays = Math.max(1, daysInMonth - dayNum);
    const needPerDay = Math.max(0, goal - g.month) / remainingDays;
    const forecast = dayNum > 0 ? (g.month / dayNum) * daysInMonth : 0;
    const pct = goal > 0 ? (g.month / goal) * 100 : 0;
    const band = pct >= 100 ? "green" : g.month >= expected * 0.95 ? "yellow" : "red";
    const enoughData = dayNum >= 3 && g.month > 0;

    const distributed = totalOut(entries, R.month);
    const available = g.month - distributed;

    return {
      g, ticket: { day: ticket(g.day, R.day), week: ticket(g.week, R.week), month: ticket(g.month, R.month), year: ticket(g.year, R.year) },
      months, withData, best, worst, avg, expected, needPerDay, forecast, pct, band, enoughData,
      distributed, available, remainingDays,
      chart: months.filter((m) => m.gross > 0).map((m) => ({ mes: m.short, valor: Math.round(m.gross) })),
    };
  }, [entries, appts, goal]);

  const bandUI = {
    red: { txt: "🔴 ABAIXO DO ESPERADO", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
    yellow: { txt: "🟡 EM RITMO DE META", cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
    green: { txt: "🟢 META ATINGIDA OU ACIMA", cls: "bg-green-500/15 text-green-400 border-green-500/30" },
  }[d.band as "red" | "yellow" | "green"];

  const mTrend = trendArrow(d.g.month, d.g.lastMonth);
  const wTrend = trendArrow(d.g.week, d.g.lastWeek);
  const dTrend = trendArrow(d.g.day, d.g.yesterday);
  const yTrend = trendArrow(d.g.year, d.g.lastYear);

  const Card = ({ label, value, sub, trend }: any) => (
    <div className="bg-background/60 border border-border rounded-lg p-2 sm:p-3 min-w-0">
      <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
      <p className="text-sm sm:text-xl font-bold text-primary break-words leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      {trend && <p className={`text-[10px] font-medium ${trend.color}`}>{trend.icon} {Math.abs(trend.pct).toFixed(0)}%</p>}
    </div>
  );

  return (
    <div className="bg-card/90 backdrop-blur border-2 border-primary/40 rounded-lg p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-5 h-5 text-primary" />
        <h2 className="text-base sm:text-lg font-bold">Faturamento do Barbeiro</h2>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <Card label="Hoje" value={fmtBR(d.g.day)} trend={dTrend} />
            <Card label="Semana" value={fmtBR(d.g.week)} trend={wTrend} />
            <Card label="Mês" value={fmtBR(d.g.month)} trend={mTrend} />
            <Card label="Ano" value={fmtBR(d.g.year)} trend={yTrend} />
          </div>

          {/* bruto x distribuído x disponível */}
          <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2 mb-3">
            <div className="bg-background/60 rounded p-2 text-center min-w-0">
              <p className="text-[10px] text-muted-foreground">Bruto do mês</p>
              <p className="text-xs sm:text-sm font-bold text-primary break-words">{fmtBR(d.g.month)}</p>
            </div>
            <div className="bg-background/60 rounded p-2 text-center min-w-0">
              <p className="text-[10px] text-muted-foreground">Já destinado</p>
              <p className="text-xs sm:text-sm font-bold text-amber-400 break-words">{fmtBR(d.distributed)}</p>
            </div>
            <div className="bg-background/60 rounded p-2 text-center min-w-0">
              <p className="text-[10px] text-muted-foreground">Disponível</p>
              <p className="text-xs sm:text-sm font-bold text-green-500 break-words">{fmtBR(d.available)}</p>
            </div>
          </div>

          {/* ticket médio */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {([["Dia", d.ticket.day], ["Semana", d.ticket.week], ["Mês", d.ticket.month], ["Ano", d.ticket.year]] as const).map(([l, v]) => (
              <div key={l} className="bg-background/40 rounded p-1.5 text-center min-w-0">
                <p className="text-[9px] text-muted-foreground">Ticket {l}</p>
                <p className="text-[11px] sm:text-sm font-bold break-words">{fmtBR(v)}</p>
              </div>
            ))}
          </div>

          {/* meta */}
          <div className="bg-background/60 rounded-lg p-2.5 mb-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-bold">Meta mensal</span>
              {editing ? (
                <div className="flex items-center gap-1">
                  <Input value={draft} onChange={(e) => setDraft(e.target.value)} className="h-7 w-24 text-xs" />
                  <Button size="sm" className="h-7 px-2" onClick={saveGoal}><Check className="w-3 h-3" /></Button>
                </div>
              ) : (
                <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-primary font-bold">
                  {fmtBR(goal)} <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden mb-1.5">
              <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, d.pct)}%` }} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] mb-1.5">
              <span className={`px-2 py-0.5 rounded border ${bandUI.cls}`}>{bandUI.txt}</span>
              <span className="text-muted-foreground">{d.pct.toFixed(1)}% da meta</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
              <p>Falta: <b className="text-foreground">{fmtBR(Math.max(0, goal - d.g.month))}</b></p>
              <p>Esperado até hoje: <b className="text-foreground">{fmtBR(d.expected)}</b></p>
              <p>Média/dia necessária ({d.remainingDays}d): <b className="text-foreground">{fmtBR(d.needPerDay)}</b></p>
              <p>
                Previsão fim do mês:{" "}
                <b className="text-foreground">{d.enoughData ? `≈ ${fmtBR(d.forecast)}` : "dados insuficientes"}</b>
              </p>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">Previsão é apenas uma estimativa, não uma garantia.</p>
          </div>

          {/* histórico anual */}
          <p className="text-xs font-bold mb-1.5">Janeiro a Dezembro — {getBrazilTodayStr().slice(0, 4)}</p>
          {d.chart.length > 0 && (
            <div className="h-40 w-full mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={38} />
                  <Tooltip
                    formatter={(v: number) => [fmtBR(v), "Faturamento"]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-1 mb-2">
            {d.months.map((m) => (
              <div key={m.i} className="grid grid-cols-[4.5rem_minmax(0,1fr)] min-[390px]:grid-cols-[5rem_minmax(0,1fr)_6rem] items-center gap-2 text-[11px] bg-background/40 rounded px-2 py-1">
                <span>{m.label}</span>
                <span className="font-bold text-primary flex-1 text-right">{fmtBR(m.gross)}</span>
                <span className="text-muted-foreground text-right col-span-2 min-[390px]:col-span-1">{m.clients} cli · {m.visits} atend.</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="bg-green-500/10 border border-green-500/30 rounded p-2">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Trophy className="w-3 h-3 text-green-500" /> Melhor mês</p>
              <p className="text-xs font-bold">{d.best ? `${d.best.label} — ${fmtBR(d.best.gross)}` : "—"}</p>
              {d.best && <p className="text-[10px] text-muted-foreground">{d.best.visits} atendimentos</p>}
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-500" /> Menor faturamento</p>
              <p className="text-xs font-bold">{d.worst ? `${d.worst.label} — ${fmtBR(d.worst.gross)}` : "—"}</p>
              {d.worst && <p className="text-[10px] text-muted-foreground">{d.worst.visits} atendimentos</p>}
            </div>
            <div className="bg-background/60 border border-border rounded p-2">
              <p className="text-[10px] text-muted-foreground">Média mensal</p>
              <p className="text-xs font-bold text-primary">{fmtBR(d.avg)}</p>
              <p className="text-[10px] text-muted-foreground">{d.withData.length} meses com movimento</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RevenueOverview;
