import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Ban, UserX } from "lucide-react";

type Blocked = { id: string; customer_phone: string; customer_name: string | null; reason: string | null };

const BlockedCustomers = () => {
  const [list, setList] = useState<Blocked[]>([]);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const { toast } = useToast();

  const load = async () => {
    const { data } = await (supabase as any).from("blocked_customers").select("*").order("created_at", { ascending: false });
    setList((data as any) || []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("blocked-rt").on("postgres_changes", { event: "*", schema: "public", table: "blocked_customers" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const add = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) { toast({ title: "Telefone inválido (10-11 dígitos)", variant: "destructive" }); return; }
    const { error } = await (supabase as any).from("blocked_customers").insert({
      customer_phone: digits, customer_name: name || null, reason: reason || null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setPhone(""); setName(""); setReason("");
    toast({ title: "Cliente bloqueado", description: "Não poderá agendar." });
  };

  const remove = async (id: string) => {
    await (supabase as any).from("blocked_customers").delete().eq("id", id);
    toast({ title: "Desbloqueado" });
  };

  return (
    <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <Ban className="w-5 h-5 text-destructive" />
        <h2 className="text-base sm:text-lg font-bold">Clientes Bloqueados</h2>
        <span className="text-xs text-muted-foreground ml-auto">{list.length}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <Input placeholder="Telefone (só números)" value={phone} onChange={e => setPhone(e.target.value)} className="h-9 text-sm" />
        <Input placeholder="Nome (opcional)" value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm" />
      </div>
      <Input placeholder="Motivo (opcional)" value={reason} onChange={e => setReason(e.target.value)} className="h-9 text-sm mb-2" />
      <Button onClick={add} size="sm" variant="destructive" className="w-full mb-3"><UserX className="w-4 h-4 mr-1" />Bloquear</Button>
      <div className="space-y-1 max-h-60 overflow-auto">
        {list.map(b => (
          <div key={b.id} className="flex items-center justify-between gap-2 text-xs bg-background/40 rounded px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{b.customer_name || "—"} · {b.customer_phone}</p>
              {b.reason && <p className="text-muted-foreground text-[10px] truncate">{b.reason}</p>}
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => remove(b.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlockedCustomers;
