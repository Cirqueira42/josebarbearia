import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Plus, TrendingUp, Wrench, Hammer, Home, PartyPopper, Wallet, Target, Pencil, Check } from "lucide-react";
import {
  getBrazilTodayStr,
  getBrazilWeekStartStr,
  getBrazilMonthStartStr,
  addDaysToDateStr,
} from "@/lib/brazilTime";
import {
  ALL_OUT_CATEGORIES,
  MATERIAL_CATEGORIES,
  SHOP_EXPENSE_CATEGORIES,
  PERSONAL_CATEGORIES,
  LAZER_CATEGORIES,
  bucketOf,
  categoryLabel,
  fmtBRL as fmt,
} from "@/lib/finance";

type Entry = {
  id: string;
  entry_date: string;
  kind: "in" | "out";
  description: string;
  amount: number;
  category: string;
  appointment_id: string | null;
};

type Period = "today" | "week" | "month" | "last_month" | "custom" | "all";

const FinancialPanel = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [appts, setAppts] = useState<{ service_name: string; appointment_date: string }[]>([]);
  const [services, setServices] = useState<{ name: string; price: number }[]>([]);
  const [goal, setGoal] = useState(2500);
  const [editGoal, setEditGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("2500");

  const [period, setPeriod] = useState<Period>("month");
  const [from, setFrom] = useState(getBrazilMonthStartStr());
  const [to, setTo] = useState(getBrazilTodayStr());

  const [category, setCategory] = useState("despesa");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getBrazilTodayStr());
  const { toast } = useToast();

  const load = async () => {
    const [e, a, s, g] = await Promise.all([
      (supabase as any).from("cash_entries").select("id, entry_date, kind, description, amount, category, appointment_id").order("entry_date", { ascending: false }).limit(2000),
      supabase.from("appointments").select("service_name, appointment_date").eq("status", "completed"),
      supabase.from("services").select("name, price"),
      supabase.from("app_settings").select("value").eq("key", "monthly_goal").maybeSingle(),
    ]);
    setEntries((e.data as Entry[]) || []);
    setAppts((a.data as any) || []);
    setServices(s.data || []);
    const gv = Number(g.data?.value);
    if (gv > 0) { setGoal(gv); setGoalInput(String(gv)); }
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

  const priceOf = (name: string) =>
    Number(services.find((s) => s.name.toLowerCase() === name.toLowerCase())?.price ?? 0);

  const data = useMemo(() => {
    const periodEntries = entries.filter((e) => inRange(e.entry_date));

    // Faturamento bruto = atendimentos concluídos + entradas manuais sem atendimento vinculado
    const apptRevenue = appts
      .filter((a) => inRange(a.appointment_date))
      .reduce((sum, a) => sum + priceOf(a.service_name), 0);
    const manualIn = periodEntries
      .filter((e) => e.kind === "in" && !e.appointment_id && e.category !== "atendimento")
      .reduce((s, e) => s + Number(e.amount), 0);
    const gross = apptRevenue + manualIn;

    const outs = periodEntries.filter((e) => e.kind === "out");
    const sumOf = (b: string) => outs.filter((e) => bucketOf(e.category) === b).reduce((s, e) => s + Number(e.amount), 0);

    const despesas = sumOf("despesa");
    const materiais = sumOf("material");
    const pessoal = sumOf("pessoal");
    const lazer = sumOf("lazer");

    const personalBreakdown = PERSONAL_CATEGORIES.map((c) => ({
      label: c.label,
      value: outs.filter((e) => e.category === c.value).reduce((s, e) => s + Number(e.amount), 0),
    }));

    return {
      gross,
      apptCount: appts.filter((a) => inRange(a.appointment_date)).length,
      despesas,
      materiais,
      pessoal,
      lazer,
      totalOut: despesas + materiais + pessoal + lazer,
      balance: gross - (despesas + materiais + pessoal + lazer),
      personalBreakdown,
      outs,
    };
  }, [entries, appts, services, range]);

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

  const saveGoal = async () => {
    const v = parseFloat(goalInput.replace(",", "."));
    if (!v || v <= 0) { toast({ title: "Meta inválida", variant: "destructive" }); return; }
    await supabase.from("app_settings").upsert({ key: "monthly_goal", value: v as any }, { onConflict: "key" });
    setGoal(v); setEditGoal(false);
    toast({ title: "Meta atualizada" });
  };

  const pct = goal > 0 ? Math.min(100, Math.round((data.gross / goal) * 100)) : 0;

  const Card = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) => (
    <div className="bg-background/60 rounded-lg p-2 min-w-0">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[10px] leading-tight">{label}</span>
      </div>
      <p className={`text-sm font-bold break-all ${color}`}>{fmt(value)}</p>
    </div>
  );

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

      {/* Faturamento bruto */}
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <p className="text-[11px] text-muted-foreground">Faturamento Bruto ({data.apptCount} atendimentos)</p>
        </div>
        <p className="text-2xl font-bold text-primary break-all">{fmt(data.gross)}</p>

        <div className="flex items-center gap-2 mt-2">
          <Target className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {editGoal ? (
            <>
              <Input value={goalInput} inputMode="decimal" onChange={(e) => setGoalInput(e.target.value)} className="h-7 text-xs w-24" />
              <Button size="icon" className="h-7 w-7" onClick={saveGoal}><Check className="w-3 h-3" /></Button>
            </>
          ) : (
            <>
              <span className="text-[11px] text-muted-foreground">Meta mensal: {fmt(goal)}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditGoal(true)}><Pencil className="w-3 h-3" /></Button>
            </>
          )}
        </div>
        <div className="h-2.5 w-full bg-background rounded-full overflow-hidden mt-1">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{pct}% da meta</p>
      </div>

      {/* Destinos do dinheiro */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Card icon={<Wrench className="w-3.5 h-3.5" />} label="Despesas da barbearia" value={data.despesas} color="text-destructive" />
        <Card icon={<Hammer className="w-3.5 h-3.5" />} label="🧰 Investimento em materiais" value={data.materiais} color="text-amber-500" />
        <Card icon={<Home className="w-3.5 h-3.5" />} label="👤 Contas pessoais" value={data.pessoal} color="text-blue-400" />
        <Card icon={<PartyPopper className="w-3.5 h-3.5" />} label="🎉 Lazer" value={data.lazer} color="text-pink-400" />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-background/60 rounded-lg p-2 text-center min-w-0">
          <p className="text-[10px] text-muted-foreground">Total destinado/gasto</p>
          <p className="text-sm font-bold text-destructive break-all">{fmt(data.totalOut)}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center min-w-0">
          <p className="text-[10px] text-muted-foreground">💰 Saldo da barbearia</p>
          <p className={`text-sm font-bold break-all ${data.balance >= 0 ? "text-green-500" : "text-destructive"}`}>{fmt(data.balance)}</p>
        </div>
      </div>

      {/* Minha retirada */}
      <div className="rounded-lg border border-border bg-background/40 p-2.5 mb-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Wallet className="w-4 h-4 text-blue-400" />
          <p className="text-sm font-bold">Minha Retirada</p>
          <span className="ml-auto text-sm font-bold text-blue-400">{fmt(data.pessoal + data.lazer)}</span>
        </div>
        <div className="space-y-0.5">
          {data.personalBreakdown.map((p) => (
            <div key={p.label} className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">{p.label}</span>
              <span className="font-semibold">{fmt(p.value)}</span>
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
        O faturamento bruto vem dos atendimentos concluídos (sem duplicar lançamentos automáticos do caixa) e não diminui com retiradas.
      </p>
    </div>
  );
};

export default FinancialPanel;
