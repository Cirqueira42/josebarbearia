import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Plus, TrendingUp, Wrench, Wallet, Target, Pencil, Check, PiggyBank, Coins } from "lucide-react";
import {
  getBrazilTodayStr,
  getBrazilWeekStartStr,
  getBrazilMonthStartStr,
  addDaysToDateStr,
} from "@/lib/brazilTime";
import {
  MATERIAL_CATEGORIES,
  SHOP_EXPENSE_CATEGORIES,
  PERSONAL_CATEGORIES,
  LAZER_CATEGORIES,
  bucketOf,
  categoryLabel,
  fmtBRL as fmt,
  DEFAULT_MONTHLY_GOALS,
  MonthlyGoal,
  goalsTotal,
  goalPercent,
  allocateToGoals,
} from "@/lib/finance";

type Entry = {
  id: string;
  entry_date: string;
  kind: "in" | "out";
  description: string;
  amount: number;
  category: string;
  appointment_id: string | null;
  investment_amount?: number | null;
};

type Period = "today" | "week" | "month" | "last_month" | "custom" | "all";

const FinancialPanel = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [apptCount, setApptCount] = useState<{ appointment_date: string }[]>([]);

  const [goals, setGoals] = useState<MonthlyGoal[]>(DEFAULT_MONTHLY_GOALS);
  const [goalsInput, setGoalsInput] = useState<MonthlyGoal[]>(DEFAULT_MONTHLY_GOALS);
  const [editGoals, setEditGoals] = useState(false);

  const [period, setPeriod] = useState<Period>("month");
  const [from, setFrom] = useState(getBrazilMonthStartStr());
  const [to, setTo] = useState(getBrazilTodayStr());

  const [category, setCategory] = useState("despesa");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getBrazilTodayStr());
  const { toast } = useToast();

  const load = async () => {
    const [e, a, g] = await Promise.all([
      (supabase as any).from("cash_entries").select("id, entry_date, kind, description, amount, category, appointment_id, investment_amount").order("entry_date", { ascending: false }).limit(2000),
      supabase.from("appointments").select("appointment_date").eq("status", "completed"),
      supabase.from("app_settings").select("value").eq("key", "monthly_goals").maybeSingle(),
    ]);
    setEntries((e.data as Entry[]) || []);
    setApptCount((a.data as any) || []);
    const gv = g.data?.value as any;
    if (Array.isArray(gv) && gv.length) {
      const merged = DEFAULT_MONTHLY_GOALS.map((d) => {
        const found = gv.find((x: any) => x.key === d.key);
        return found ? { ...d, target: Number(found.target) || 0 } : d;
      });
      setGoals(merged);
      setGoalsInput(merged);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("fin-panel-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cash_entries" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Intervalo de datas conforme o período
  const range = useMemo(() => {
    const today = getBrazilTodayStr();
    if (period === "today") return { from: today, to: today };
    if (period === "week") return { from: getBrazilWeekStartStr(), to: today };
    if (period === "month") return { from: getBrazilMonthStartStr(), to: today };
    if (period === "last_month") {
      const start = getBrazilMonthStartStr();
      const lastEnd = addDaysToDateStr(start, -1);
      const lastStart = `${lastEnd.slice(0, 7)}-01`;
      return { from: lastStart, to: lastEnd };
    }
    if (period === "custom") return { from, to };
    return { from: "0000-01-01", to: "9999-12-31" };
  }, [period, from, to]);

  const inRange = (d: string) => d >= range.from && d <= range.to;

  const data = useMemo(() => {
    const periodEntries = entries.filter((e) => inRange(e.entry_date));
    const ins = periodEntries.filter((e) => e.kind === "in");
    const outs = periodEntries.filter((e) => e.kind === "out");

    // ÚNICA FONTE DE VERDADE: faturamento bruto = total de ENTRADAS REAIS do período
    const gross = ins.reduce((s, e) => s + Number(e.amount), 0);
    // Quanto desse total veio de atendimentos (apenas informativo, não soma de novo)
    const fromAppointments = ins
      .filter((e) => e.appointment_id || e.category === "atendimento")
      .reduce((s, e) => s + Number(e.amount), 0);
    const otherIn = gross - fromAppointments;

    const sumOfBucket = (b: string) => outs.filter((e) => bucketOf(e.category) === b).reduce((s, e) => s + Number(e.amount), 0);

    const despesas = sumOfBucket("despesa");
    // Reserva de material separada automaticamente no fechamento do caixa (não é saída)
    const materialReserve = ins.reduce((s2, e) => s2 + Number(e.investment_amount || 0), 0);
    const materiais = sumOfBucket("material");
    const pessoal = sumOfBucket("pessoal");
    const lazer = sumOfBucket("lazer");
    const totalOut = despesas + materiais + pessoal + lazer;

    const realizedOf = (g: MonthlyGoal) => {
      const base = outs
        .filter((e) => g.categories.includes((e.category || "").toLowerCase()))
        .reduce((s2, e) => s2 + Number(e.amount), 0);
      return g.key === "material" ? base + materialReserve : base;
    };

    return {
      gross,
      fromAppointments,
      otherIn,
      apptTotal: apptCount.filter((a) => inRange(a.appointment_date)).length,
      despesas,
      materiais,
      materialReserve,
      materialInvested: materiais + materialReserve,
      pessoal,
      lazer,
      totalOut,
      balance: gross - totalOut, // saldo real = entradas reais - saídas reais
      realizedOf,
      outs,
      insCount: ins.length,
    };
  }, [entries, apptCount, range]);

  const alloc = useMemo(() => allocateToGoals(data.gross, goals), [data.gross, goals]);
  const targetsTotal = goalsTotal(goals);
  const missingToGoals = Math.max(0, targetsTotal - alloc.totalAllocated);

  const add = async () => {
    const v = parseFloat(amount.replace(",", "."));
    if (!description.trim() || !v || v <= 0) {
      toast({ title: "Preencha descrição e valor", variant: "destructive" });
      return;
    }
    const { error } = await (supabase as any).from("cash_entries").insert({
      entry_date: date,
      kind: "out",
      description: description.trim(),
      amount: v,
      investment_amount: 0,
      category,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setDescription(""); setAmount("");
    toast({ title: "Lançamento registrado" });
    load();
  };

  const saveGoals = async () => {
    const clean = goalsInput.map((g) => ({ ...g, target: Number(g.target) || 0 }));
    await supabase.from("app_settings").upsert(
      { key: "monthly_goals", value: clean.map((g) => ({ key: g.key, target: g.target })) as any },
      { onConflict: "key" },
    );
    setGoals(clean); setEditGoals(false);
    toast({ title: "Metas mensais salvas", description: `Total: ${fmt(goalsTotal(clean))}` });
  };

  const periodLabel =
    period === "today" ? "Hoje" :
    period === "week" ? "Esta semana" :
    period === "month" ? "Este mês" :
    period === "last_month" ? "Mês anterior" :
    period === "all" ? "Acumulado" : "Período personalizado";

  const pct = targetsTotal > 0 ? Math.min(100, Math.round((data.gross / targetsTotal) * 100)) : 0;

  const Card = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) => (
    <div className="bg-background/60 rounded-lg p-2 min-w-0">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[10px] leading-tight">{label}</span>
      </div>
      <p className={`text-sm font-bold break-all ${color}`}>{fmt(value)}</p>
    </div>
  );

  const GoalCard = ({ g }: { g: MonthlyGoal }) => {
    const destined = alloc.allocated[g.key] || 0;
    const realized = data.realizedOf(g);
    const missing = Math.max(0, Number(g.target) - destined);
    const bar = Number(g.target) > 0 ? Math.min(100, (destined / Number(g.target)) * 100) : 0;
    return (
      <div className="bg-background/60 rounded-lg p-2 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold leading-tight">{g.label}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">{goalPercent(goals, g).toFixed(2)}%</span>
        </div>
        <div className="mt-1 space-y-0.5 text-[11px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Meta</span><span className="font-semibold">{fmt(Number(g.target))}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Destinado</span><span className="font-semibold text-primary">{fmt(destined)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Já {g.key === "material" ? "investido" : "pago"}</span><span className="font-semibold text-destructive">{fmt(realized)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Falta destinar</span><span className={`font-bold ${missing > 0 ? "text-amber-500" : "text-green-500"}`}>{fmt(missing)}</span></div>
        </div>
        <div className="h-1.5 w-full bg-background rounded-full overflow-hidden mt-1">
          <div className={`h-full ${missing > 0 ? "bg-primary" : "bg-green-500"}`} style={{ width: `${bar}%` }} />
        </div>
        <p className="text-[9px] text-muted-foreground mt-0.5">{Math.round(bar)}% da meta destinada</p>
      </div>
    );
  };

  return (
    <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <PieChart className="w-5 h-5 text-primary" />
        <h2 className="text-base sm:text-lg font-bold">Distribuição do Faturamento</h2>
      </div>

      {/* Filtro de período */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="last_month">Mês anterior</SelectItem>
            <SelectItem value="all">Acumulado (tudo)</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
        {period === "custom" && (
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 text-sm" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 text-sm" />
          </div>
        )}
      </div>

      {/* Faturamento bruto = total de entradas reais */}
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <p className="text-[11px] text-muted-foreground">Faturamento Bruto — {periodLabel} (entradas reais)</p>
        </div>
        <p className="text-2xl font-bold text-primary break-all">{fmt(data.gross)}</p>
        <p className="text-[10px] text-muted-foreground">
          {data.insCount} entrada(s) · atendimentos {fmt(data.fromAppointments)} · outras entradas {fmt(data.otherIn)} · {data.apptTotal} atendimentos concluídos
        </p>
        <p className="text-[10px] text-muted-foreground">Despesas, investimentos e retiradas não reduzem o faturamento bruto.</p>

        <div className="flex items-center gap-2 mt-2">
          <Target className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-[11px] text-muted-foreground">Total das metas do mês: {fmt(targetsTotal)}</span>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setGoalsInput(goals); setEditGoals((v) => !v); }}>
            <Pencil className="w-3 h-3" />
          </Button>
        </div>
        <div className="h-2.5 w-full bg-background rounded-full overflow-hidden mt-1">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{pct}% do total das metas</p>
      </div>

      {/* Resumo real */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Card icon={<Wrench className="w-3.5 h-3.5" />} label="Despesas reais" value={data.despesas} color="text-destructive" />
        <Card icon={<PiggyBank className="w-3.5 h-3.5" />} label="Material já investido" value={data.materialInvested} color="text-amber-500" />
        <Card icon={<Wallet className="w-3.5 h-3.5" />} label="Retiradas reais (pessoal + lazer)" value={data.pessoal + data.lazer} color="text-blue-400" />
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 min-w-0">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Coins className="w-3.5 h-3.5" />
            <span className="text-[10px] leading-tight">💰 Saldo real disponível</span>
          </div>
          <p className={`text-sm font-bold break-all ${data.balance >= 0 ? "text-green-500" : "text-destructive"}`}>{fmt(data.balance)}</p>
        </div>
      </div>

      {/* Metas mensais */}
      <div className="rounded-lg border border-border bg-background/40 p-2.5 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-primary" />
          <p className="text-sm font-bold">Metas mensais</p>
          <span className="text-[10px] text-muted-foreground ml-auto">{fmt(targetsTotal)}</span>
        </div>

        {editGoals && (
          <div className="mb-2 rounded-md border border-border p-2">
            <p className="text-[11px] text-muted-foreground mb-1.5">Valores em R$ de cada meta mensal</p>
            <div className="grid grid-cols-2 gap-2">
              {goalsInput.map((g, i) => (
                <div key={g.key}>
                  <Label className="text-[10px] text-muted-foreground">{g.label}</Label>
                  <Input
                    inputMode="decimal"
                    className="h-8 text-sm"
                    value={String(g.target)}
                    onChange={(e) => {
                      const next = [...goalsInput];
                      next[i] = { ...g, target: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 };
                      setGoalsInput(next);
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] font-bold text-primary">Total: {fmt(goalsTotal(goalsInput))}</span>
              <Button size="sm" className="h-8 ml-auto" onClick={saveGoals}><Check className="w-3 h-3 mr-1" />Salvar</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {goals.map((g) => <GoalCard key={g.key} g={g} />)}
        </div>

        <div className="grid grid-cols-3 gap-1.5 mt-2 text-center">
          <div className="bg-background/60 rounded p-1.5 min-w-0">
            <p className="text-[9px] text-muted-foreground">Total destinado</p>
            <p className="text-[11px] font-bold text-primary break-all">{fmt(alloc.totalAllocated)}</p>
          </div>
          <div className="bg-background/60 rounded p-1.5 min-w-0">
            <p className="text-[9px] text-muted-foreground">Falta p/ completar</p>
            <p className="text-[11px] font-bold text-amber-500 break-all">{fmt(missingToGoals)}</p>
          </div>
          <div className="bg-background/60 rounded p-1.5 min-w-0">
            <p className="text-[9px] text-muted-foreground">Sobra do mês</p>
            <p className="text-[11px] font-bold text-green-500 break-all">{fmt(alloc.leftover)}</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          A distribuição é apenas uma reserva virtual do dinheiro que entrou — não cria entrada nem saída no caixa.
          Metas completas param de receber e o valor é redistribuído para as que ainda faltam.
        </p>
      </div>

      {/* Minha retirada (usa os mesmos dados, sem duplicar) */}
      <div className="rounded-lg border border-border bg-background/40 p-2.5 mb-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Wallet className="w-4 h-4 text-blue-400" />
          <p className="text-sm font-bold">Minha Retirada</p>
        </div>
        <div className="grid grid-cols-3 gap-1.5 mb-1.5 text-center">
          <div className="bg-background/60 rounded p-1.5 min-w-0">
            <p className="text-[9px] text-muted-foreground">Destinado</p>
            <p className="text-[11px] font-bold text-blue-400 break-all">
              {fmt((alloc.allocated["pensao"] || 0) + (alloc.allocated["contas"] || 0) + (alloc.allocated["aluguel"] || 0) + (alloc.allocated["diversao"] || 0))}
            </p>
          </div>
          <div className="bg-background/60 rounded p-1.5 min-w-0">
            <p className="text-[9px] text-muted-foreground">Já retirado</p>
            <p className="text-[11px] font-bold text-destructive break-all">{fmt(data.pessoal + data.lazer)}</p>
          </div>
          <div className="bg-background/60 rounded p-1.5 min-w-0">
            <p className="text-[9px] text-muted-foreground">Disponível</p>
            <p className="text-[11px] font-bold text-green-500 break-all">
              {fmt(Math.max(0, (alloc.allocated["pensao"] || 0) + (alloc.allocated["contas"] || 0) + (alloc.allocated["aluguel"] || 0) + (alloc.allocated["diversao"] || 0) - (data.pessoal + data.lazer)))}
            </p>
          </div>
        </div>
        <div className="space-y-0.5">
          {PERSONAL_CATEGORIES.map((c) => (
            <div key={c.value} className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">{c.label}</span>
              <span className="font-semibold">{fmt(data.outs.filter((e) => e.category === c.value).reduce((s, e) => s + Number(e.amount), 0))}</span>
            </div>
          ))}
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">🎉 Lazer</span>
            <span className="font-semibold">{fmt(data.lazer)}</span>
          </div>
        </div>
      </div>

      {/* Novo lançamento */}
      <div className="rounded-lg border border-border bg-background/40 p-2.5 mb-3">
        <Label className="text-[11px] text-muted-foreground">Registrar saída / retirada</Label>
        <div className="grid grid-cols-2 gap-2 mt-1.5">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 text-sm col-span-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SHOP_EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              {MATERIAL_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              {PERSONAL_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              {LAZER_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} className="h-9 text-sm" />
          <Input placeholder="Valor R$" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9 text-sm" />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm col-span-2" />
        </div>
        <Button onClick={add} size="sm" className="w-full mt-2 h-9"><Plus className="w-4 h-4 mr-1" />Adicionar</Button>
      </div>

      {/* Lançamentos do período */}
      <p className="text-[11px] text-muted-foreground mb-1">Saídas do período ({data.outs.length})</p>
      <div className="space-y-1 max-h-56 overflow-auto">
        {data.outs.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Nenhuma saída no período.</p>}
        {data.outs.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-2 text-xs bg-background/40 rounded px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{e.description}</p>
              <p className="text-muted-foreground text-[10px] truncate">
                {categoryLabel(e.category)} · {new Date(e.entry_date + "T12:00:00").toLocaleDateString("pt-BR")}
              </p>
            </div>
            <span className="font-bold text-destructive shrink-0">- {fmt(Number(e.amount))}</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground mt-2">
        Faturamento bruto = soma das entradas reais do caixa no período. Nada é lançado novamente e nenhum histórico é apagado.
      </p>
    </div>
  );
};

export default FinancialPanel;
