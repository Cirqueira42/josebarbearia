import { useMemo, useState } from "react";
import { Scissors } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useAdminAnalytics, fmtBR, periodRange, completedIn, inRange, PERIOD_LABELS, PeriodKey, WEEKDAYS_PT, weekdayOf,
} from "@/lib/adminAnalytics";

const medals = ["🥇", "🥈", "🥉"];
const SPECIALS = ["luzes", "pigmentação", "pigmentacao", "platinado", "sobrancelha", "barba"];

const ServicesAnalytics = () => {
  const { appts, entries, services, loading } = useAdminAnalytics();
  const [period, setPeriod] = useState<PeriodKey>("month");

  const priceOf = (name: string) =>
    services.find((s) => s.name.toLowerCase() === name.toLowerCase())?.price ?? 0;

  const d = useMemo(() => {
    const range = periodRange(period);
    const list = completedIn(appts, range);

    const rank = (l: typeof list) => {
      const m: Record<string, { count: number; total: number }> = {};
      l.forEach((a) => {
        m[a.service_name] ||= { count: 0, total: 0 };
        m[a.service_name].count++;
        m[a.service_name].total += priceOf(a.service_name);
      });
      return Object.entries(m).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count);
    };

    const ranking = rank(list);
    const topDay = rank(completedIn(appts, periodRange("today")))[0] || null;
    const topWeek = rank(completedIn(appts, periodRange("week")))[0] || null;
    const topMonth = rank(completedIn(appts, periodRange("month")))[0] || null;

    // serviços específicos (luzes, pigmentação, etc.) por semana / mês / ano
    const specials = SPECIALS.map((key) => {
      const count = (p: PeriodKey) =>
        completedIn(appts, periodRange(p)).filter((a) => a.service_name.toLowerCase().includes(key)).length;
      return { key, week: count("week"), month: count("month"), year: count("year") };
    }).filter((s) => s.week + s.month + s.year > 0);

    // dias da semana / horários
    const byDay: Record<number, { count: number; total: number }> = {};
    const byHour: Record<number, number> = {};
    list.forEach((a) => {
      const w = weekdayOf(a.appointment_date);
      byDay[w] ||= { count: 0, total: 0 };
      byDay[w].count++;
      byDay[w].total += priceOf(a.service_name);
      const h = parseInt((a.appointment_time || "0").split(":")[0], 10);
      if (!isNaN(h)) byHour[h] = (byHour[h] || 0) + 1;
    });
    const dayRows = Object.entries(byDay).map(([w, v]) => ({ w: Number(w), ...v }));
    const bestDayCount = dayRows.length ? dayRows.reduce((a, b) => (b.count > a.count ? b : a)) : null;
    const bestDayRev = dayRows.length ? dayRows.reduce((a, b) => (b.total > a.total ? b : a)) : null;
    const worstDay = dayRows.length ? dayRows.reduce((a, b) => (b.count < a.count ? b : a)) : null;
    const hourRows = Object.entries(byHour).map(([h, c]) => ({ h: Number(h), c })).sort((a, b) => b.c - a.c);
    const bestHour = hourRows[0] || null;
    const worstHour = hourRows[hourRows.length - 1] || null;

    // aproveitamento da agenda
    const all = appts.filter((a) => inRange(a.appointment_date, range));
    const completed = all.filter((a) => a.status === "completed").length;
    const cancelled = all.filter((a) => a.status === "cancelled").length;
    const pending = all.filter((a) => a.status === "pending" || a.status === "confirmed").length;
    const usage = all.length ? (completed / all.length) * 100 : 0;

    // vendas de produtos (entradas de caixa classificadas como produto/venda)
    const prodEntries = entries.filter(
      (e) => e.kind === "in" && inRange(e.entry_date, range) &&
        (/produto|venda/i.test(e.category || "") || /produto|venda/i.test(e.description || "")),
    );
    const prodMap: Record<string, { qty: number; total: number }> = {};
    prodEntries.forEach((e) => {
      const name = (e.description || "Produto").split("—")[0].trim() || "Produto";
      prodMap[name] ||= { qty: 0, total: 0 };
      prodMap[name].qty++;
      prodMap[name].total += e.amount;
    });
    const products = Object.entries(prodMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total);

    return { ranking, topDay, topWeek, topMonth, specials, bestDayCount, bestDayRev, worstDay, bestHour, worstHour, completed, cancelled, pending, total: all.length, usage, products };
  }, [appts, entries, services, period]);

  return (
    <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-3 sm:p-4">
      <div className="flex flex-col min-[390px]:flex-row min-[390px]:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Scissors className="w-5 h-5 text-primary shrink-0" />
          <h2 className="text-base sm:text-lg font-bold truncate">Serviços, Dias e Agenda</h2>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
          <SelectTrigger className="h-8 w-full min-[390px]:w-32 text-[11px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["today", "yesterday", "week", "lastweek", "month", "lastmonth", "year", "lastyear", "all"] as PeriodKey[]).map((p) => (
              <SelectItem key={p} value={p} className="text-xs">{PERIOD_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-3">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2 mb-3">
            {([["Hoje", d.topDay], ["Semana", d.topWeek], ["Mês", d.topMonth]] as const).map(([l, s]) => (
              <div key={l} className="bg-background/60 rounded p-2 min-w-0">
                <p className="text-[10px] text-muted-foreground">Mais feito · {l}</p>
                <p className="text-[11px] font-bold truncate">{s ? s.name : "—"}</p>
                {s && <p className="text-[10px] text-muted-foreground">{s.count}x</p>}
              </div>
            ))}
          </div>

          <p className="text-xs font-bold mb-1">Ranking de serviços — {PERIOD_LABELS[period]}</p>
          <div className="space-y-1 mb-3">
            {d.ranking.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-1">Sem atendimentos concluídos no período.</p>}
            {d.ranking.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between gap-2 text-[11px] bg-background/40 rounded px-2 py-1">
                <span className="truncate">{medals[i] || `${i + 1}º`} {s.name}</span>
                <span className="text-muted-foreground shrink-0">{s.count}x · {fmtBR(s.total)}</span>
              </div>
            ))}
          </div>

          {d.specials.length > 0 && (
            <div className="bg-background/60 rounded p-2 mb-3">
              <p className="text-xs font-bold mb-1">Serviços específicos</p>
              {d.specials.map((s) => (
                <div key={s.key} className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="capitalize">{s.key}</span>
                  <span>semana {s.week} · mês {s.month} · ano {s.year}</span>
                </div>
              ))}
            </div>
          )}

          {d.products.length > 0 && (
            <div className="bg-background/60 rounded p-2 mb-3">
              <p className="text-xs font-bold mb-1">Produtos vendidos — {PERIOD_LABELS[period]}</p>
              {d.products.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-[10px]">
                  <span className="truncate">{p.name}</span>
                  <span className="text-muted-foreground shrink-0">{p.qty}x · {fmtBR(p.total)}</span>
                </div>
              ))}
              <p className="text-[9px] text-muted-foreground mt-1">Baseado nas entradas do caixa registradas como venda/produto.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-3 text-[10px]">
            <div className="bg-background/60 rounded p-2">
              <p className="text-muted-foreground">Dia mais movimentado</p>
              <p className="font-bold text-[11px]">{d.bestDayCount ? `${WEEKDAYS_PT[d.bestDayCount.w]} (${d.bestDayCount.count})` : "—"}</p>
              <p className="text-muted-foreground mt-1">Maior faturamento</p>
              <p className="font-bold text-[11px]">{d.bestDayRev ? `${WEEKDAYS_PT[d.bestDayRev.w]} — ${fmtBR(d.bestDayRev.total)}` : "—"}</p>
              <p className="text-muted-foreground mt-1">Menor movimento</p>
              <p className="font-bold text-[11px]">{d.worstDay ? `${WEEKDAYS_PT[d.worstDay.w]} (${d.worstDay.count})` : "—"}</p>
            </div>
            <div className="bg-background/60 rounded p-2">
              <p className="text-muted-foreground">Horário com maior procura</p>
              <p className="font-bold text-[11px]">{d.bestHour ? `${String(d.bestHour.h).padStart(2, "0")}:00 (${d.bestHour.c})` : "—"}</p>
              <p className="text-muted-foreground mt-1">Horário com menor procura</p>
              <p className="font-bold text-[11px]">{d.worstHour ? `${String(d.worstHour.h).padStart(2, "0")}:00 (${d.worstHour.c})` : "—"}</p>
            </div>
          </div>

          <div className="bg-background/60 rounded p-2">
            <p className="text-xs font-bold mb-1">Aproveitamento da agenda — {PERIOD_LABELS[period]}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
              <div><p className="font-bold text-green-500 text-sm">{d.completed}</p><p className="text-muted-foreground">✓ Concluídos</p></div>
              <div><p className="font-bold text-red-500 text-sm">{d.cancelled}</p><p className="text-muted-foreground">✕ Cancelados</p></div>
              <div><p className="font-bold text-yellow-500 text-sm">{d.pending}</p><p className="text-muted-foreground">⚠ Em aberto</p></div>
              <div><p className="font-bold text-primary text-sm">{d.usage.toFixed(0)}%</p><p className="text-muted-foreground">📈 Aproveit.</p></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ServicesAnalytics;
