import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, RefreshCw, Trophy, TrendingDown } from "lucide-react";
import { useAdminAnalytics, MONTHS_SHORT, MONTHS_PT, fmtBR } from "@/lib/adminAnalytics";
import { totalsOf, RawEntry, consolidateMonth } from "@/lib/businessData";
import { getBrazilTodayStr } from "@/lib/brazilTime";
import { useDataRefresh } from "@/lib/refreshBus";

type Summary = {
  year: number;
  month: number;
  gross_total: number;
  services_total: number;
  products_total: number;
  appointments_count: number;
  manual_count: number;
  unique_clients: number;
  visits: number;
  ticket_avg: number;
  top_service: string | null;
  top_product: string | null;
  products_qty: number;
};

type MonthRow = Summary & { live: boolean };

const AnnualReports = () => {
  const { entries, appts } = useAdminAnalytics();
  const [saved, setSaved] = useState<Summary[]>([]);
  const [year, setYear] = useState(Number(getBrazilTodayStr().slice(0, 4)));
  const [compareYear, setCompareYear] = useState<number | null>(null);
  const [working, setWorking] = useState(false);
  const { toast } = useToast();

  const loadSaved = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("monthly_summaries")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false });
    setSaved(((data as any[]) || []).map((r) => ({ ...r, gross_total: Number(r.gross_total || 0) })));
  }, []);

  useEffect(() => { loadSaved(); }, [loadSaved]);
  useDataRefresh(["cash", "appointments", "all"], loadSaved);

  /** Mescla o histórico consolidado (permanente) com os dados vivos do banco. */
  const rowsOf = useCallback(
    (y: number): MonthRow[] => {
      return Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const prefix = `${y}-${String(m).padStart(2, "0")}`;
        const monthEntries = (entries as unknown as RawEntry[]).filter((e) => e.entry_date?.startsWith(prefix));
        const monthAppts = appts.filter((a) => a.status === "completed" && a.appointment_date?.startsWith(prefix));
        const stored = saved.find((s) => s.year === y && s.month === m);

        if (monthEntries.length === 0 && stored) return { ...stored, live: false };

        const t = totalsOf(monthEntries);
        const phones = new Set(monthAppts.map((a) => (a.customer_phone || "").replace(/\D/g, "")));
        phones.delete("");
        const serviceMap: Record<string, number> = {};
        monthAppts.forEach((a) => { serviceMap[a.service_name] = (serviceMap[a.service_name] || 0) + 1; });
        const topService = Object.entries(serviceMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? stored?.top_service ?? null;

        return {
          year: y,
          month: m,
          gross_total: t.gross,
          services_total: t.services,
          products_total: t.products,
          appointments_count: t.scheduledCount,
          manual_count: t.manualCount,
          unique_clients: phones.size || stored?.unique_clients || 0,
          visits: monthAppts.length,
          ticket_avg: t.ticket,
          top_service: topService,
          top_product: stored?.top_product ?? null,
          products_qty: stored?.products_qty ?? 0,
          live: true,
        };
      });
    },
    [entries, appts, saved],
  );

  const rows = useMemo(() => rowsOf(year), [rowsOf, year]);
  const withData = rows.filter((r) => r.gross_total > 0);
  const best = withData.slice().sort((a, b) => b.gross_total - a.gross_total)[0];
  const worst = withData.slice().sort((a, b) => a.gross_total - b.gross_total)[0];
  const yearTotal = rows.reduce((s, r) => s + r.gross_total, 0);
  const avg = withData.length ? yearTotal / withData.length : 0;
  const max = Math.max(1, ...rows.map((r) => r.gross_total));

  const compareRows = useMemo(() => (compareYear ? rowsOf(compareYear) : null), [rowsOf, compareYear]);
  const compareTotal = compareRows?.reduce((s, r) => s + r.gross_total, 0) ?? 0;
  const growth = compareTotal > 0 ? ((yearTotal - compareTotal) / compareTotal) * 100 : null;

  const years = useMemo(() => {
    const set = new Set<number>(saved.map((s) => s.year));
    const now = Number(getBrazilTodayStr().slice(0, 4));
    set.add(now); set.add(now - 1); set.add(now + 1);
    (entries as unknown as RawEntry[]).forEach((e) => e.entry_date && set.add(Number(e.entry_date.slice(0, 4))));
    return Array.from(set).sort((a, b) => b - a);
  }, [saved, entries]);

  const consolidate = async () => {
    setWorking(true);
    try {
      for (const r of rows) {
        if (r.gross_total > 0 || r.visits > 0) await consolidateMonth(year, r.month);
      }
      await loadSaved();
      toast({ title: "Histórico consolidado ✅", description: `Resumos de ${year} preservados permanentemente.` });
    } catch (e: any) {
      toast({ title: "Erro ao consolidar", description: e?.message, variant: "destructive" });
    } finally {
      setWorking(false);
    }
  };

  const sumCount = (r: MonthRow) => r.appointments_count + r.manual_count;

  return (
    <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-3 sm:p-4 w-full min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <BarChart3 className="w-5 h-5 text-primary shrink-0" />
        <h2 className="text-base sm:text-lg font-bold">Relatório Anual</h2>
        <div className="ml-auto flex items-center gap-1.5 min-w-0">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="h-8 w-[88px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8 text-[11px]" disabled={working} onClick={consolidate}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${working ? "animate-spin" : ""}`} /> Consolidar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2 mb-3">
        <div className="bg-primary/10 border border-primary/30 rounded p-2 text-center min-w-0">
          <p className="text-[10px] text-muted-foreground">Bruto {year}</p>
          <p className="text-xs sm:text-sm font-bold text-primary break-all">{fmtBR(yearTotal)}</p>
        </div>
        <div className="bg-background/60 rounded p-2 text-center min-w-0">
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Trophy className="w-3 h-3 text-amber-500" /> Melhor mês</p>
          <p className="text-[11px] font-bold break-all">{best ? `${MONTHS_PT[best.month - 1]} · ${fmtBR(best.gross_total)}` : "—"}</p>
        </div>
        <div className="bg-background/60 rounded p-2 text-center min-w-0">
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><TrendingDown className="w-3 h-3 text-destructive" /> Pior mês</p>
          <p className="text-[11px] font-bold break-all">{worst ? `${MONTHS_PT[worst.month - 1]} · ${fmtBR(worst.gross_total)}` : "—"}</p>
        </div>
      </div>

      {/* Cronológico jan → dez */}
      <p className="text-[11px] text-muted-foreground mb-1">Cronológico (janeiro a dezembro)</p>
      <div className="space-y-1 mb-3">
        {rows.map((r) => (
          <div key={r.month} className="bg-background/40 rounded px-2 py-1.5">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-8 shrink-0 font-medium">{MONTHS_SHORT[r.month - 1]}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden min-w-0">
                <div className="h-full bg-primary" style={{ width: `${(r.gross_total / max) * 100}%` }} />
              </div>
              <span className="shrink-0 font-bold">{fmtBR(r.gross_total)}</span>
              {!r.live && <Badge variant="outline" className="text-[9px] shrink-0">hist.</Badge>}
            </div>
            {r.gross_total > 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5 break-words">
                Serviços {fmtBR(r.services_total)} · Produtos {fmtBR(r.products_total)} · {sumCount(r)} atend. ·
                {" "}{r.unique_clients} cliente(s) único(s) · {r.visits} visita(s) · ticket {fmtBR(r.ticket_avg)}
                {r.top_service ? ` · top: ${r.top_service}` : ""}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Ranking do maior para o menor */}
      <p className="text-[11px] text-muted-foreground mb-1">Ranking do ano (maior → menor)</p>
      <div className="space-y-1 mb-3">
        {withData.length === 0 && <p className="text-[11px] text-muted-foreground">Sem dados neste ano.</p>}
        {withData.slice().sort((a, b) => b.gross_total - a.gross_total).map((r, i) => (
          <div key={r.month} className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-background/40 rounded px-2 py-1">
            <span className="truncate">{i + 1}. {MONTHS_PT[r.month - 1]}</span>
            <span className="shrink-0 text-muted-foreground">{sumCount(r)} atend.</span>
            <span className={`shrink-0 ${r.gross_total >= avg ? "text-green-500" : "text-muted-foreground"}`}>
              {avg > 0 ? `${(((r.gross_total - avg) / avg) * 100).toFixed(0)}% vs média` : ""}
            </span>
            <span className="shrink-0 font-bold text-primary">{fmtBR(r.gross_total)}</span>
          </div>
        ))}
      </div>

      {/* Comparação entre anos */}
      <div className="rounded-lg border border-border bg-background/40 p-2.5">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className="text-xs font-semibold">Comparar com o ano</span>
          <Select value={compareYear ? String(compareYear) : "none"} onValueChange={(v) => setCompareYear(v === "none" ? null : Number(v))}>
            <SelectTrigger className="h-8 w-[110px] text-xs ml-auto"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">Nenhum</SelectItem>
              {years.filter((y) => y !== year).map((y) => (
                <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {compareRows && (
          <>
            <p className="text-[11px]">
              {year}: <strong>{fmtBR(yearTotal)}</strong> · {compareYear}: <strong>{fmtBR(compareTotal)}</strong>
              {growth !== null && (
                <span className={growth >= 0 ? "text-green-500" : "text-destructive"}> · {growth >= 0 ? "+" : ""}{growth.toFixed(1)}%</span>
              )}
            </p>
            <div className="mt-1.5 space-y-0.5 max-h-48 overflow-y-auto">
              {rows.map((r, i) => {
                const c = compareRows[i];
                if (r.gross_total === 0 && c.gross_total === 0) return null;
                const d = c.gross_total > 0 ? ((r.gross_total - c.gross_total) / c.gross_total) * 100 : null;
                return (
                  <div key={r.month} className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="w-8 shrink-0">{MONTHS_SHORT[i]}</span>
                    <span className="shrink-0">{fmtBR(r.gross_total)}</span>
                    <span className="text-muted-foreground shrink-0">vs {fmtBR(c.gross_total)}</span>
                    <span className={`shrink-0 ${d === null ? "text-muted-foreground" : d >= 0 ? "text-green-500" : "text-destructive"}`}>
                      {d === null ? "—" : `${d >= 0 ? "+" : ""}${d.toFixed(0)}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground mt-2">
        Os resumos consolidados ficam salvos permanentemente e continuam disponíveis mesmo após a limpeza dos registros detalhados.
      </p>
    </div>
  );
};

export default AnnualReports;
