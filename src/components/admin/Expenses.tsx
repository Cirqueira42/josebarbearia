import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Receipt } from "lucide-react";
import { getBrazilTodayStr, getBrazilMonthStartStr } from "@/lib/brazilTime";

type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
};

const CATEGORIES = ["produto", "aluguel", "energia", "água", "material", "salário", "marketing", "outros"];
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Expenses = () => {
  const [list, setList] = useState<Expense[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("outros");
  const [date, setDate] = useState(getBrazilTodayStr());
  const { toast } = useToast();

  const load = async () => {
    const { data } = await (supabase as any)
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .limit(100);
    setList((data as any) || []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("expenses-rt").on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const add = async () => {
    const v = parseFloat(amount.replace(",", "."));
    if (!description || !v || v <= 0) {
      toast({ title: "Preencha descrição e valor", variant: "destructive" }); return;
    }
    const { error } = await (supabase as any).from("expenses").insert({
      description, amount: v, category, expense_date: date,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setDescription(""); setAmount("");
    toast({ title: "Despesa adicionada" });
  };

  const remove = async (id: string) => {
    await (supabase as any).from("expenses").delete().eq("id", id);
    toast({ title: "Despesa removida" });
  };

  const todayTotal = list.filter(e => e.expense_date === getBrazilTodayStr()).reduce((a, b) => a + Number(b.amount), 0);
  const monthTotal = list.filter(e => e.expense_date >= getBrazilMonthStartStr()).reduce((a, b) => a + Number(b.amount), 0);

  return (
    <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <Receipt className="w-5 h-5 text-destructive" />
        <h2 className="text-base sm:text-lg font-bold">Despesas / Saídas</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-background/60 rounded p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Hoje</p>
          <p className="text-sm font-bold text-destructive">{fmt(todayTotal)}</p>
        </div>
        <div className="bg-background/60 rounded p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Mês</p>
          <p className="text-sm font-bold text-destructive">{fmt(monthTotal)}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <Input placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} className="h-9 text-sm" />
        <Input placeholder="Valor R$" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="h-9 text-sm" />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 text-sm" />
      </div>
      <Button onClick={add} size="sm" className="w-full mb-3"><Plus className="w-4 h-4 mr-1" />Adicionar despesa</Button>

      <div className="space-y-1 max-h-60 overflow-auto">
        {list.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Nenhuma despesa registrada</p>}
        {list.map(e => (
          <div key={e.id} className="flex items-center justify-between gap-2 text-xs bg-background/40 rounded px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{e.description}</p>
              <p className="text-muted-foreground text-[10px]">{e.category} · {new Date(e.expense_date + "T12:00:00").toLocaleDateString("pt-BR")}</p>
            </div>
            <span className="font-bold text-destructive shrink-0">{fmt(Number(e.amount))}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => remove(e.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Expenses;
