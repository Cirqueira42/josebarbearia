import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Wallet, Plus, Trash2, Pencil, Check, X, Lock, ArrowDownCircle, ArrowUpCircle, PiggyBank } from "lucide-react";
import { getBrazilTodayStr, getBrazilMonthStartStr } from "@/lib/brazilTime";
import { parseHours, DEFAULT_HOURS, BusinessHours } from "@/lib/businessHours";
import { updateLoyalty } from "@/lib/loyalty";
import { ALL_OUT_CATEGORIES, bucketOf, categoryLabel } from "@/lib/finance";

type Entry = {
  id: string;
  entry_date: string;
  kind: "in" | "out";
  description: string;
  amount: number;
  investment_amount: number;
  category: string;
  payment_method: string | null;
  appointment_id: string | null;
};

type Closure = {
  id: string;
  closure_date: string;
  total_in: number;
  total_out: number;
  investment_total: number;
  net_total: number;
  appointments_closed: number;
};

const fmt = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const IN_CATEGORIES = ["atendimento", "produto", "gorjeta", "outros"];

const CashFlow = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [closures, setClosures] = useState<Closure[]>([]);
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [kind, setKind] = useState<"in" | "out">("in");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("atendimento");
  const [date, setDate] = useState(getBrazilTodayStr());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const { toast } = useToast();

  const today = getBrazilTodayStr();

  const load = async () => {
    const [e, c, s] = await Promise.all([
      (supabase as any).from("cash_entries").select("*").gte("entry_date", getBrazilMonthStartStr()).order("created_at", { ascending: false }),
      (supabase as any).from("daily_closures").select("*").order("closure_date", { ascending: false }).limit(15),
      supabase.from("app_settings").select("value").eq("key", "business_hours").maybeSingle(),
    ]);
    setEntries((e.data as Entry[]) || []);
    setClosures((c.data as Closure[]) || []);
    if (s.data?.value) setHours(parseHours(s.data.value));
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("cash-flow-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cash_entries" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_closures" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const todayEntries = useMemo(() => entries.filter((e) => e.entry_date === today), [entries, today]);

  const totals = useMemo(() => {
    const sum = (list: Entry[], k: "in" | "out") =>
      list.filter((e) => e.kind === k).reduce((a, b) => a + Number(b.amount), 0);
    const invest = (list: Entry[]) => list.reduce((a, b) => a + Number(b.investment_amount || 0), 0);
    const byBucket = (list: Entry[], b: string) =>
      list.filter((e) => e.kind === "out" && bucketOf(e.category) === b).reduce((a, c) => a + Number(c.amount), 0);
    return {
      dayIn: sum(todayEntries, "in"),
      dayOut: sum(todayEntries, "out"),
      dayInvest: invest(todayEntries),
      dayDespesa: byBucket(todayEntries, "despesa"),
      dayMaterial: byBucket(todayEntries, "material"),
      dayPessoal: byBucket(todayEntries, "pessoal"),
      dayLazer: byBucket(todayEntries, "lazer"),
      monthIn: sum(entries, "in"),
      monthOut: sum(entries, "out"),
      monthInvest: invest(entries),
    };
  }, [entries, todayEntries]);

  const dayBalance = totals.dayIn - totals.dayOut;
  const monthBalance = totals.monthIn - totals.monthOut;
  const alreadyClosed = closures.some((c) => c.closure_date === today);

  const splitInvestment = (value: number) =>
    value > Number(hours.investment_rule_min) ? Math.min(Number(hours.investment_rule_amount), value) : 0;

  const add = async () => {
    const v = parseFloat(amount.replace(",", "."));
    if (!description.trim() || !v || v <= 0) {
      toast({ title: "Preencha descrição e valor", variant: "destructive" });
      return;
    }
    const { error } = await (supabase as any).from("cash_entries").insert({
      entry_date: date,
      kind,
      description: description.trim(),
      amount: v,
      investment_amount: kind === "in" ? splitInvestment(v) : 0,
      category,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setDescription(""); setAmount("");
    toast({ title: kind === "in" ? "Entrada lançada" : "Saída lançada" });
    load();
  };

  const saveEdit = async (e: Entry) => {
    const v = parseFloat(editAmount.replace(",", "."));
    if (!v || v <= 0) { toast({ title: "Valor inválido", variant: "destructive" }); return; }
    await (supabase as any)
      .from("cash_entries")
      .update({
        amount: v,
        description: editDescription.trim() || e.description,
        investment_amount: e.kind === "in" ? splitInvestment(v) : 0,
      })
      .eq("id", e.id);
    setEditingId(null);
    toast({ title: "Lançamento atualizado" });
    load();
  };

  const remove = async (id: string) => {
    await (supabase as any).from("cash_entries").delete().eq("id", id);
    toast({ title: "Lançamento removido" });
    load();
  };

  const closeDay = async () => {
    setClosing(true);
    try {
      const [{ data: appts }, { data: services }] = await Promise.all([
        supabase.from("appointments").select("*").eq("appointment_date", today).in("status", ["pending", "confirmed"]),
        supabase.from("services").select("name, price"),
      ]);

      const priceOf = (name: string) =>
        Number(services?.find((s) => s.name.toLowerCase() === name.toLowerCase())?.price ?? 0);

      let closedCount = 0;

      for (const a of appts || []) {
        const price = priceOf(a.service_name);
        const { error } = await supabase.from("appointments").update({ status: "completed" }).eq("id", a.id);
        if (error) continue;
        closedCount++;

        await updateLoyalty(a.customer_phone, a.customer_name, a.service_name, a.appointment_date, a.id);

        if (price > 0) {
          await (supabase as any).from("cash_entries").insert({
            entry_date: today,
            kind: "in",
            description: `${a.service_name} — ${a.customer_name}`,
            amount: price,
            investment_amount: splitInvestment(price),
            category: "atendimento",
            appointment_id: a.id,
          });
        }
      }

      // Recarrega os lançamentos do dia para calcular os totais finais
      const { data: dayRows } = await (supabase as any)
        .from("cash_entries").select("*").eq("entry_date", today);
      const rows = (dayRows as Entry[]) || [];
      const totalIn = rows.filter((r) => r.kind === "in").reduce((s, r) => s + Number(r.amount), 0);
      const totalOut = rows.filter((r) => r.kind === "out").reduce((s, r) => s + Number(r.amount), 0);
      const investTotal = rows.reduce((s, r) => s + Number(r.investment_amount || 0), 0);

      const { error: closeErr } = await (supabase as any).from("daily_closures").upsert(
        {
          closure_date: today,
          total_in: totalIn,
          total_out: totalOut,
          investment_total: investTotal,
          net_total: totalIn - totalOut,
          appointments_closed: closedCount,
        },
        { onConflict: "closure_date" },
      );
      if (closeErr) throw closeErr;

      toast({
        title: "Caixa fechado ✅",
        description: `${closedCount} atendimento(s) finalizados. Entradas ${fmt(totalIn)} · Investimento ${fmt(investTotal)} · Saldo ${fmt(totalIn - totalOut)}.`,
      });
      load();
    } catch (err: any) {
      toast({ title: "Erro ao fechar o caixa", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setClosing(false);
      setConfirmClose(false);
    }
  };

  return (
    <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Wallet className="w-5 h-5 text-primary" />
        <h2 className="text-base sm:text-lg font-bold">Caixa do Dia</h2>
        {alreadyClosed ? (
          <Badge className="ml-auto bg-destructive/20 text-destructive border-destructive/30 text-[10px]">Fechado hoje</Badge>
        ) : (
          <Badge className="ml-auto bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">Aberto</Badge>
        )}
      </div>

      {/* Resumo do dia */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="bg-background/60 rounded p-2 text-center min-w-0">
          <ArrowDownCircle className="w-4 h-4 text-green-500 mx-auto" />
          <p className="text-[10px] text-muted-foreground">Entradas</p>
          <p className="text-xs sm:text-sm font-bold text-green-500 break-all">{fmt(totals.dayIn)}</p>
        </div>
        <div className="bg-background/60 rounded p-2 text-center min-w-0">
          <ArrowUpCircle className="w-4 h-4 text-destructive mx-auto" />
          <p className="text-[10px] text-muted-foreground">Saídas</p>
          <p className="text-xs sm:text-sm font-bold text-destructive break-all">{fmt(totals.dayOut)}</p>
        </div>
        <div className="bg-background/60 rounded p-2 text-center min-w-0">
          <Wallet className="w-4 h-4 text-primary mx-auto" />
          <p className="text-[10px] text-muted-foreground">Saldo</p>
          <p className={`text-xs sm:text-sm font-bold break-all ${dayBalance >= 0 ? "text-foreground" : "text-destructive"}`}>{fmt(dayBalance)}</p>
        </div>
      </div>

      {/* Saídas de hoje separadas por destino */}
      <div className="grid grid-cols-4 gap-1.5 mb-2">
        <div className="bg-background/60 rounded p-1.5 text-center min-w-0">
          <p className="text-[9px] text-muted-foreground leading-tight">🔧 Despesas</p>
          <p className="text-[11px] font-bold text-destructive break-all">{fmt(totals.dayDespesa)}</p>
        </div>
        <div className="bg-background/60 rounded p-1.5 text-center min-w-0">
          <p className="text-[9px] text-muted-foreground leading-tight">🧰 Materiais</p>
          <p className="text-[11px] font-bold text-amber-500 break-all">{fmt(totals.dayMaterial)}</p>
        </div>
        <div className="bg-background/60 rounded p-1.5 text-center min-w-0">
          <p className="text-[9px] text-muted-foreground leading-tight">🏠 Pessoais</p>
          <p className="text-[11px] font-bold text-blue-400 break-all">{fmt(totals.dayPessoal)}</p>
        </div>
        <div className="bg-background/60 rounded p-1.5 text-center min-w-0">
          <p className="text-[9px] text-muted-foreground leading-tight">🎉 Lazer</p>
          <p className="text-[11px] font-bold text-pink-400 break-all">{fmt(totals.dayLazer)}</p>
        </div>
      </div>


      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-primary/10 border border-primary/30 rounded p-2 text-center min-w-0">
          <PiggyBank className="w-4 h-4 text-primary mx-auto" />
          <p className="text-[10px] text-muted-foreground">Investimento em material (hoje)</p>
          <p className="text-sm font-bold text-primary break-all">{fmt(totals.dayInvest)}</p>
          <p className="text-[10px] text-muted-foreground">Conta: {fmt(totals.dayIn - totals.dayInvest)}</p>
        </div>
        <div className="bg-background/60 rounded p-2 text-center min-w-0">
          <p className="text-[10px] text-muted-foreground">Mês</p>
          <p className="text-[11px] text-green-500 font-semibold break-all">+ {fmt(totals.monthIn)}</p>
          <p className="text-[11px] text-destructive font-semibold break-all">- {fmt(totals.monthOut)}</p>
          <p className="text-sm font-bold break-all">{fmt(monthBalance)}</p>
          <p className="text-[10px] text-primary">Investimento: {fmt(totals.monthInvest)}</p>
        </div>
      </div>

      {/* Novo lançamento */}
      <div className="rounded-lg border border-border bg-background/40 p-2.5 mb-3">
        <Label className="text-[11px] text-muted-foreground">Lançar manualmente</Label>
        <div className="grid grid-cols-2 gap-2 mt-1.5">
          <Select value={kind} onValueChange={(v: "in" | "out") => { setKind(v); setCategory(v === "in" ? "atendimento" : "material"); }}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in">Entrada (dinheiro que entrou)</SelectItem>
              <SelectItem value="out">Saída (compra / despesa)</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Valor R$" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9 text-sm" />
          <Input placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} className="h-9 text-sm" />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(kind === "in"
                ? IN_CATEGORIES.map((c) => ({ value: c, label: c }))
                : ALL_OUT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))
              ).map((c) => (
                <SelectItem key={c.value} value={c.value} className="capitalize">{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm col-span-2" />
        </div>
        <Button onClick={add} size="sm" className="w-full mt-2 h-9">
          <Plus className="w-4 h-4 mr-1" /> Adicionar lançamento
        </Button>
      </div>

      {/* Lançamentos */}
      <div className="space-y-1 max-h-72 overflow-auto mb-3">
        {entries.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Nenhum lançamento neste mês.</p>}
        {entries.map((e) => (
          <div key={e.id} className="bg-background/40 rounded px-2 py-1.5 text-xs">
            {editingId === e.id ? (
              <div className="flex items-center gap-1">
                <Input value={editDescription} onChange={(ev) => setEditDescription(ev.target.value)} className="h-7 text-xs flex-1" />
                <Input value={editAmount} inputMode="decimal" onChange={(ev) => setEditAmount(ev.target.value)} className="h-7 text-xs w-20" />
                <Button size="icon" className="h-7 w-7" onClick={() => saveEdit(e)}><Check className="w-3 h-3" /></Button>
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="w-3 h-3" /></Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{e.description}</p>
                  <p className="text-muted-foreground text-[10px]">
                    {categoryLabel(e.category)} · {new Date(e.entry_date + "T12:00:00").toLocaleDateString("pt-BR")}
                    {Number(e.investment_amount) > 0 ? ` · ${fmt(Number(e.investment_amount))} p/ material` : ""}
                  </p>
                </div>
                <span className={`font-bold shrink-0 ${e.kind === "in" ? "text-green-500" : "text-destructive"}`}>
                  {e.kind === "in" ? "+" : "-"} {fmt(Number(e.amount))}
                </span>
                <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => { setEditingId(e.id); setEditAmount(String(e.amount)); setEditDescription(e.description); }}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => remove(e.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        variant="destructive"
        className="w-full"
        disabled={closing}
        onClick={() => setConfirmClose(true)}
      >
        <Lock className="w-4 h-4 mr-1" /> {closing ? "Fechando..." : "Fechar Caixa do Dia"}
      </Button>

      {/* Histórico de fechamentos */}
      {closures.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] text-muted-foreground mb-1">Últimos fechamentos</p>
          <div className="space-y-1 max-h-40 overflow-auto">
            {closures.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 text-[11px] bg-background/40 rounded px-2 py-1.5">
                <span className="font-medium">{new Date(c.closure_date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                <span className="text-green-500">+{fmt(Number(c.total_in))}</span>
                <span className="text-destructive">-{fmt(Number(c.total_out))}</span>
                <span className="text-primary">🐷 {fmt(Number(c.investment_total))}</span>
                <span className="font-bold">{fmt(Number(c.net_total))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar o caixa de hoje?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os atendimentos de hoje que ainda não foram finalizados serão concluídos automaticamente e os
              valores lançados no caixa. Em cada atendimento acima de {fmt(Number(hours.investment_rule_min))},
              {" "}{fmt(Number(hours.investment_rule_amount))} vai para o caixa de investimento em material e o restante para a conta.
              Nenhum dado é apagado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={closeDay}>Fechar caixa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CashFlow;
