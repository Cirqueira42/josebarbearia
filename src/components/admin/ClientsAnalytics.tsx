import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Users, Search, Crown } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getBrazilTodayStr, addDaysToDateStr } from "@/lib/brazilTime";
import {
  useAdminAnalytics, fmtBR, fmtDate, periodRange, completedIn, PERIOD_LABELS, PeriodKey,
} from "@/lib/adminAnalytics";

type Client = {
  phone: string;
  name: string;
  visits: number;
  dates: string[];
  services: Record<string, number>;
  total: number;
  last: string;
  avgInterval: number | null;
  nextEstimate: string | null;
  status: "green" | "yellow" | "red" | "new";
};

const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 86400000);

const ClientsAnalytics = () => {
  const { appts, services, loading } = useAdminAnalytics();
  const [rankPeriod, setRankPeriod] = useState<PeriodKey>("month");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const priceOf = (name: string) =>
    services.find((s) => s.name.toLowerCase() === name.toLowerCase())?.price ?? 0;

  const data = useMemo(() => {
    const today = getBrazilTodayStr();
    const done = appts.filter((a) => a.status === "completed");

    const stat = (p: PeriodKey) => {
      const list = completedIn(appts, periodRange(p));
      return { visits: list.length, unique: new Set(list.map((a) => a.customer_phone)).size };
    };

    // clientes agregados (histórico total)
    const map = new Map<string, Client>();
    [...done].sort((a, b) => a.appointment_date.localeCompare(b.appointment_date)).forEach((a) => {
      const key = a.customer_phone;
      const c = map.get(key) || {
        phone: key, name: a.customer_name, visits: 0, dates: [], services: {}, total: 0,
        last: a.appointment_date, avgInterval: null, nextEstimate: null, status: "new" as const,
      };
      c.name = a.customer_name;
      c.visits++;
      c.dates.push(a.appointment_date);
      c.services[a.service_name] = (c.services[a.service_name] || 0) + 1;
      c.total += priceOf(a.service_name);
      c.last = a.appointment_date;
      map.set(key, c);
    });

    const clients = [...map.values()].map((c) => {
      if (c.dates.length >= 2) {
        let sum = 0;
        for (let i = 1; i < c.dates.length; i++) sum += daysBetween(c.dates[i - 1], c.dates[i]);
        c.avgInterval = Math.max(1, Math.round(sum / (c.dates.length - 1)));
        c.nextEstimate = addDaysToDateStr(c.last, c.avgInterval);
        const diff = daysBetween(today, c.nextEstimate);
        c.status = diff < 0 ? "red" : diff <= 3 ? "yellow" : "green";
      } else {
        c.status = "new";
      }
      return c;
    });

    // ranking por período
    const rankList = completedIn(appts, periodRange(rankPeriod));
    const rmap = new Map<string, { name: string; visits: number; total: number }>();
    rankList.forEach((a) => {
      const r = rmap.get(a.customer_phone) || { name: a.customer_name, visits: 0, total: 0 };
      r.visits++; r.total += priceOf(a.service_name); r.name = a.customer_name;
      rmap.set(a.customer_phone, r);
    });
    const ranking = [...rmap.entries()].map(([phone, v]) => ({ phone, ...v }));
    const topVisits = [...ranking].sort((a, b) => b.visits - a.visits).slice(0, 10);
    const topRevenue = [...ranking].sort((a, b) => b.total - a.total)[0] || null;

    // taxa de retorno no mês
    const monthRange = periodRange("month");
    const monthList = completedIn(appts, monthRange);
    const monthPhones = [...new Set(monthList.map((a) => a.customer_phone))];
    const novos = monthPhones.filter((p) => {
      const c = map.get(p);
      return !c || c.dates.filter((dt) => dt < monthRange.start).length === 0;
    }).length;
    const retornaram = monthPhones.length - novos;
    const taxa = monthPhones.length ? (retornaram / monthPhones.length) * 100 : 0;

    const umaVez = clients.filter((c) => c.visits === 1).length;
    const frequentes = clients.filter((c) => c.visits >= 3).length;
    const sumidos = [...clients].filter((c) => daysBetween(c.last, today) > 45)
      .sort((a, b) => a.last.localeCompare(b.last)).slice(0, 5);
    const proximos = clients.filter((c) => c.status === "yellow" || c.status === "red").length;

    return {
      periods: {
        today: stat("today"), yesterday: stat("yesterday"), week: stat("week"),
        month: stat("month"), year: stat("year"),
      },
      clients: clients.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      topVisits, topRevenue, novos, retornaram, taxa, umaVez, frequentes, sumidos, proximos,
    };
  }, [appts, services, rankPeriod]);

  const filtered = data.clients.filter(
    (c) => !query || c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query.replace(/\D/g, "")),
  );

  const grouped = useMemo(() => {
    const g: Record<string, Client[]> = {};
    filtered.forEach((c) => {
      const letter = (c.name.trim()[0] || "#").toUpperCase();
      (g[letter] ||= []).push(c);
    });
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [filtered]);

  const statusChip = { green: "🟢 No período normal", yellow: "🟡 Próximo de voltar", red: "🔴 Passou do período", new: "🆕 Primeira visita" };
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="text-base sm:text-lg font-bold">Clientes e Frequência</h2>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-3">Carregando...</p>
      ) : (
        <>
          {/* únicos x visitas */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
            {([["Hoje", "today"], ["Ontem", "yesterday"], ["Semana", "week"], ["Mês", "month"], ["Ano", "year"]] as const).map(([label, k]) => {
              const s = (data.periods as any)[k];
              return (
                <div key={k} className="bg-background/60 rounded p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-sm font-bold text-primary">{s.unique} <span className="text-[10px] font-normal text-muted-foreground">únicos</span></p>
                  <p className="text-[10px] text-muted-foreground">{s.visits} visitas</p>
                </div>
              );
            })}
          </div>

          {/* taxa de retorno */}
          <div className="bg-background/60 rounded p-2.5 mb-3">
            <p className="text-xs font-bold mb-1">Taxa de retorno (mês)</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-sm font-bold">{data.novos}</p><p className="text-[10px] text-muted-foreground">Novos</p></div>
              <div><p className="text-sm font-bold">{data.retornaram}</p><p className="text-[10px] text-muted-foreground">Retornaram</p></div>
              <div><p className="text-sm font-bold text-green-500">{data.taxa.toFixed(0)}%</p><p className="text-[10px] text-muted-foreground">Retorno</p></div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {data.umaVez} vieram só 1 vez · {data.frequentes} são frequentes (3+) · {data.proximos} perto de retornar
            </p>
            {data.sumidos.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Há mais tempo sem voltar: {data.sumidos.map((c) => `${c.name} (${fmtDate(c.last)})`).join(" · ")}
              </p>
            )}
          </div>

          {/* ranking */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs font-bold flex items-center gap-1"><Crown className="w-3.5 h-3.5 text-primary" /> Top 10 mais frequentes</p>
            <Select value={rankPeriod} onValueChange={(v) => setRankPeriod(v as PeriodKey)}>
              <SelectTrigger className="h-7 w-32 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["month", "lastmonth", "year", "all"] as PeriodKey[]).map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">{PERIOD_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 mb-2">
            {data.topVisits.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-1">Sem dados no período.</p>}
            {data.topVisits.map((c, i) => (
              <div key={c.phone} className="flex items-center justify-between gap-2 text-[11px] bg-background/40 rounded px-2 py-1">
                <span className="truncate">{medals[i] || `${i + 1}º`} {c.name}</span>
                <span className="text-muted-foreground shrink-0">{c.visits} visitas</span>
              </div>
            ))}
          </div>
          {data.topRevenue && (
            <p className="text-[10px] text-muted-foreground mb-3">
              💰 Cliente que mais gerou faturamento no período: <b className="text-foreground">{data.topRevenue.name}</b> — {fmtBR(data.topRevenue.total)}
            </p>
          )}

          {/* lista alfabética */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Buscar cliente por nome ou telefone" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>
          <div className="max-h-80 overflow-auto space-y-1.5">
            {grouped.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-2">Nenhum cliente encontrado.</p>}
            {grouped.map(([letter, list]) => (
              <div key={letter}>
                <p className="text-[10px] font-bold text-primary sticky top-0 bg-card/95 py-0.5">{letter}</p>
                {list.map((c) => (
                  <div key={c.phone} className="bg-background/40 rounded mb-1">
                    <button onClick={() => setOpen(open === c.phone ? null : c.phone)} className="w-full flex items-center justify-between gap-2 px-2 py-1 text-[11px]">
                      <span className="truncate">{c.name}</span>
                      <span className="text-muted-foreground shrink-0">{c.visits}x · {fmtDate(c.last)}</span>
                    </button>
                    {open === c.phone && (
                      <div className="px-2 pb-2 text-[10px] space-y-0.5 text-muted-foreground">
                        <p>📞 {c.phone}</p>
                        <p>Visitas: <b className="text-foreground">{c.visits}</b> · Último: <b className="text-foreground">{fmtDate(c.last)}</b></p>
                        <p>Intervalo médio: <b className="text-foreground">{c.avgInterval ? `${c.avgInterval} dias` : "—"}</b></p>
                        <p>Possível retorno: <b className="text-foreground">{c.nextEstimate ? fmtDate(c.nextEstimate) : "sem histórico suficiente"}</b></p>
                        <p>{statusChip[c.status]}</p>
                        <p>Valor gerado: <b className="text-foreground">{fmtBR(c.total)}</b></p>
                        <p>Serviços: {Object.entries(c.services).map(([s, n]) => `${s} (${n})`).join(", ")}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground mt-2">A previsão de retorno é apenas informativa e não cria agendamento na agenda.</p>
        </>
      )}
    </div>
  );
};

export default ClientsAnalytics;
