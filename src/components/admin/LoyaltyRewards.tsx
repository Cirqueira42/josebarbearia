import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Gift, Search, MessageCircle, Lock, Copy } from "lucide-react";
import { openWhatsApp } from "@/lib/whatsapp";

type Reward = {
  id: string;
  customer_phone: string;
  customer_name: string | null;
  code: string;
  discount_amount: number;
  status: string;
  milestone: number;
  used_at: string | null;
  created_at: string;
};

const BOOKING_URL = "https://josebarbearia.lovable.app/agendar";

const LoyaltyRewards = () => {
  const [list, setList] = useState<Reward[]>([]);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const load = async () => {
    const { data } = await (supabase as any)
      .from("loyalty_rewards")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setList((data as Reward[]) || []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("loyalty-rewards-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "loyalty_rewards" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(
    () =>
      list.filter(
        (r) =>
          (r.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
          r.customer_phone.includes(search) ||
          r.code.toLowerCase().includes(search.toLowerCase()),
      ),
    [list, search],
  );

  const activeCount = list.filter((r) => r.status === "active").length;

  const sendCode = (r: Reward) => {
    const phone = r.customer_phone.replace(/\D/g, "");
    const phoneDDI = phone.startsWith("55") ? phone : `55${phone}`;
    const text = `🎉 *PARABÉNS, ${r.customer_name || "cliente"}!* 🎉\n\nVocê completou *10 atendimentos* na *José Barbearia* e liberou o seu *código exclusivo de desconto*:\n\n🔐 *${r.code}*\n\nEsse código é só seu, vale no seu *próximo atendimento* e pode ser usado uma única vez.\n\n👉 É só agendar e digitar o código no campo "Cupom de desconto":\n${BOOKING_URL}\n\nObrigado pela preferência! 🙏💈`;
    openWhatsApp(phoneDDI, text);
  };

  const markUsed = async (r: Reward) => {
    await (supabase as any)
      .from("loyalty_rewards")
      .update({ status: "used", used_at: new Date().toISOString() })
      .eq("id", r.id);
    toast({ title: "Código bloqueado", description: `${r.code} não pode mais ser usado.` });
    load();
  };

  return (
    <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Gift className="w-5 h-5 text-primary" />
        <h2 className="text-base sm:text-lg font-bold">Códigos de Fidelidade</h2>
        <Badge variant="outline" className="ml-auto text-[10px]">{activeCount} ativo(s)</Badge>
      </div>

      <p className="text-[11px] text-muted-foreground mb-3">
        O código é gerado sozinho quando o cliente completa 10 atendimentos concluídos. O cliente não vê o
        código nem o valor — você envia manualmente. Depois de usado, fica bloqueado para sempre.
      </p>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, telefone ou código..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Nenhum código gerado ainda.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-auto">
          {filtered.map((r) => (
            <div key={r.id} className={`rounded-lg border p-2.5 ${r.status === "active" ? "border-green-500/50 bg-green-500/5" : "border-border bg-background/40 opacity-70"}`}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{r.customer_name || "Cliente"}</p>
                  <p className="text-[10px] text-muted-foreground">📞 {r.customer_phone} · {r.milestone} atendimentos</p>
                </div>
                <Badge className={`text-[10px] shrink-0 ${r.status === "active" ? "bg-green-500/20 text-green-400 border-green-500/30" : r.status === "reserved" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-muted text-muted-foreground"}`}>
                  {r.status === "active" ? "Disponível" : r.status === "reserved" ? "Reservado" : "Utilizado"}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <code className="font-mono font-bold tracking-widest text-primary text-sm bg-background/70 rounded px-2 py-1">{r.code}</code>
                <span className="text-[11px] text-muted-foreground">R$ {Number(r.discount_amount).toFixed(2)}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 ml-auto"
                  onClick={() => { navigator.clipboard.writeText(r.code); toast({ title: "Código copiado" }); }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>

              {r.status === "active" && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-white" onClick={() => sendCode(r)}>
                    <MessageCircle className="w-3 h-3 mr-1" /> Enviar no WhatsApp
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => markUsed(r)}>
                    <Lock className="w-3 h-3 mr-1" /> Marcar usado
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LoyaltyRewards;
