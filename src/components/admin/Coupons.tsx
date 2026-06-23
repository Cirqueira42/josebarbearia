import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Ticket, Plus } from "lucide-react";

type Coupon = { id: string; code: string; discount_percent: number; valid_until: string | null; max_uses: number | null; uses_count: number; active: boolean };

const Coupons = () => {
  const [list, setList] = useState<Coupon[]>([]);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("10");
  const [validUntil, setValidUntil] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const { toast } = useToast();

  const load = async () => {
    const { data } = await (supabase as any).from("coupons").select("*").order("created_at", { ascending: false });
    setList((data as any) || []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("coupons-rt").on("postgres_changes", { event: "*", schema: "public", table: "coupons" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const add = async () => {
    const d = parseInt(discount);
    if (!code || !d || d < 1 || d > 100) { toast({ title: "Código e % de desconto obrigatórios", variant: "destructive" }); return; }
    const { error } = await (supabase as any).from("coupons").insert({
      code: code.toUpperCase().trim(),
      discount_percent: d,
      valid_until: validUntil || null,
      max_uses: maxUses ? parseInt(maxUses) : null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setCode(""); setDiscount("10"); setValidUntil(""); setMaxUses("");
    toast({ title: "Cupom criado" });
  };

  const toggle = async (c: Coupon) => {
    await (supabase as any).from("coupons").update({ active: !c.active }).eq("id", c.id);
  };

  const remove = async (id: string) => {
    await (supabase as any).from("coupons").delete().eq("id", id);
  };

  return (
    <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <Ticket className="w-5 h-5 text-primary" />
        <h2 className="text-base sm:text-lg font-bold">Cupons de Desconto</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Input placeholder="CÓDIGO" value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="h-9 text-sm uppercase" />
        <Input placeholder="% desconto" inputMode="numeric" value={discount} onChange={e => setDiscount(e.target.value)} className="h-9 text-sm" />
        <Input type="date" placeholder="Válido até" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="h-9 text-sm" />
        <Input placeholder="Máx usos (opc)" inputMode="numeric" value={maxUses} onChange={e => setMaxUses(e.target.value)} className="h-9 text-sm" />
      </div>
      <Button onClick={add} size="sm" className="w-full mb-3"><Plus className="w-4 h-4 mr-1" />Criar cupom</Button>
      <div className="space-y-1 max-h-60 overflow-auto">
        {list.map(c => (
          <div key={c.id} className="flex items-center gap-2 text-xs bg-background/40 rounded px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{c.code} · {c.discount_percent}% OFF</p>
              <p className="text-muted-foreground text-[10px]">
                Usos: {c.uses_count}{c.max_uses ? `/${c.max_uses}` : ""}{c.valid_until ? ` · até ${new Date(c.valid_until + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}
              </p>
            </div>
            <Switch checked={c.active} onCheckedChange={() => toggle(c)} />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => remove(c.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Coupons;
