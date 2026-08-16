import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Award, Gift, Search, Star, MessageCircle, Pencil, Check, X, PartyPopper, Plus, Minus } from "lucide-react";
import { openWhatsApp } from "@/lib/whatsapp";

const BOOKING_URL = "https://josebarbearia.lovable.app/agendar";

type LoyaltyRecord = {
  id: string;
  customer_phone: string;
  customer_name: string;
  total_services: number;
  free_services_earned: number;
  free_services_redeemed: number;
};

const GOAL = 10;

const LoyaltyProgram = () => {
  const [records, setRecords] = useState<LoyaltyRecord[]>([]);
  const [search, setSearch] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchLoyalty();
    fetchEnabled();
    const channel = supabase
      .channel("loyalty-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "loyalty" }, () => fetchLoyalty())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchEnabled = async () => {
    const { data } = await supabase.from("app_settings").select("value").eq("key", "loyalty_enabled").maybeSingle();
    setEnabled(data?.value === true);
  };

  const toggleEnabled = async (next: boolean) => {
    setEnabled(next);
    const { error } = await supabase.from("app_settings").upsert({ key: "loyalty_enabled", value: next, updated_at: new Date().toISOString() });
    if (error) {
      setEnabled(!next);
      toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
    } else {
      toast({ title: next ? "Fidelidade ativada ✅" : "Fidelidade desativada", description: next ? "Os clientes voltam a ver o programa ao agendar." : "O programa não aparece mais para os clientes." });
    }
  };

  const saveCount = async (record: LoyaltyRecord) => {
    const total = Math.max(0, parseInt(editValue, 10) || 0);
    const earned = Math.floor(total / GOAL);
    const { error } = await supabase
      .from("loyalty")
      .update({
        total_services: total,
        free_services_earned: earned,
        free_services_redeemed: Math.min(record.free_services_redeemed, earned),
      })
      .eq("id", record.id);
    setEditingId(null);
    if (error) toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
    else { toast({ title: "Atualizado!", description: `${record.customer_name}: ${total} serviços.` }); fetchLoyalty(); }
  };

  // Ajuste rápido: tira ou adiciona 1 estrela (serviço feito fora do sistema, correção, etc.)
  const adjustStars = async (record: LoyaltyRecord, delta: number) => {
    const total = Math.max(0, record.total_services + delta);
    const earned = Math.floor(total / GOAL);
    const { error } = await supabase
      .from("loyalty")
      .update({
        total_services: total,
        free_services_earned: earned,
        free_services_redeemed: Math.min(record.free_services_redeemed, earned),
      })
      .eq("id", record.id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível ajustar.", variant: "destructive" });
    } else {
      toast({
        title: delta > 0 ? "⭐ Estrela adicionada" : "Estrela removida",
        description: `${record.customer_name}: ${total} serviço${total !== 1 ? "s" : ""}.`,
      });
      fetchLoyalty();
    }
  };

  const fetchLoyalty = async () => {
    const { data } = await supabase
      .from("loyalty")
      .select("*")
      .order("total_services", { ascending: false });
    if (data) setRecords(data as LoyaltyRecord[]);
  };


  const redeemFree = async (record: LoyaltyRecord) => {
    const available = record.free_services_earned - record.free_services_redeemed;
    if (available <= 0) return;

    const { error } = await supabase
      .from("loyalty")
      .update({ free_services_redeemed: record.free_services_redeemed + 1 })
      .eq("id", record.id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível resgatar.", variant: "destructive" });
    } else {
      toast({ title: "🎉 Desconto aplicado!", description: `${record.customer_name} usou R$ 7,00 de desconto.` });
    }
  };

  const notifyClient = (record: LoyaltyRecord) => {
    const available = record.free_services_earned - record.free_services_redeemed;
    const progress = record.total_services % GOAL;
    const remaining = Math.max(GOAL - progress, 0);
    const phone = record.customer_phone.replace(/\D/g, "");
    const phoneWithDDI = phone.startsWith("55") ? phone : `55${phone}`;

    let text = "";
    if (available > 0) {
      text = `🎉 *PARABÉNS, ${record.customer_name}!* 🎉\n\nVocê completou *${GOAL} atendimentos* na *José Barbearia* e conquistou *${available} cupom${available > 1 ? "ns" : ""} de R$ 7,00 de desconto* 💰\n\nVocê pode usar no *corte* ou em *qualquer produto* do nosso catálogo.\n\nÉ só agendar e avisar ao chegar.\n\n👉 Agendar: ${BOOKING_URL}\n\nObrigado pela preferência! 🙏`;
    } else {
      text = `Olá, ${record.customer_name}! 💈\n\n⭐ *José Barbearia — Programa de Fidelidade*\n\nVocê já fez *${record.total_services} corte${record.total_services !== 1 ? "s" : ""}* com a gente!\n\nFaltam apenas *${remaining} atendimento${remaining !== 1 ? "s" : ""}* pra você ganhar *R$ 7,00 de desconto* no corte ou em qualquer produto do catálogo 🎉\n\nAgende já: ${BOOKING_URL}\n\nObrigado pela preferência! 🙏`;
    }
    openWhatsApp(phoneWithDDI, text);
  };

  const filtered = records.filter((r) =>
    r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    r.customer_phone.includes(search)
  );

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Award className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Programa de Fidelidade</h2>
        <Badge variant="outline" className="ml-auto text-xs">
          A cada {GOAL} atendimentos = R$ 7 de desconto
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 rounded-lg border border-border bg-background p-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{enabled ? "Ativado" : "Desativado"}</p>
          <p className="text-[11px] text-muted-foreground">
            {enabled ? "Os clientes veem o programa ao agendar." : "Os clientes não veem o programa ao agendar."}
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={toggleEnabled} />
      </div>


      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-6 text-sm">
          Nenhum cliente no programa ainda. Os clientes são adicionados automaticamente quando um serviço é concluído.
        </p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filtered.map((r) => {
            const progress = r.total_services % GOAL;
            const available = r.free_services_earned - r.free_services_redeemed;
            const progressPercent = (progress / GOAL) * 100;

            return (
              <div key={r.id} className={`bg-background border rounded-lg p-3 ${available > 0 ? "border-green-500/60 shadow-[0_0_0_1px_rgba(34,197,94,0.25)]" : "border-border"}`}>
                {available > 0 && (
                  <div className="mb-2 rounded-md bg-green-500/15 border border-green-500/30 px-2 py-1.5 text-[11px] text-green-400 font-semibold flex items-center gap-1">
                    <PartyPopper className="w-3.5 h-3.5" />
                    Meta batida! Dê os parabéns — R$ 7 de desconto liberado.
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{r.customer_name}</p>
                    <p className="text-xs text-muted-foreground">📞 {r.customer_phone}</p>
                  </div>
                  <div className="text-right">
                    {editingId === r.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <Input
                          type="number"
                          min={0}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-7 w-16 text-xs px-2"
                        />
                        <Button size="icon" className="h-7 w-7" onClick={() => saveCount(r)}><Check className="w-3 h-3" /></Button>
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="w-3 h-3" /></Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(r.id); setEditValue(String(r.total_services)); }}
                        className="text-xs text-muted-foreground flex items-center gap-1 ml-auto hover:text-primary"
                      >
                        Total: {r.total_services} serviços <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    {available > 0 && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        <Gift className="w-3 h-3 mr-1" />
                        {available} cupom{available > 1 ? "ns" : ""} de R$ 7
                      </Badge>
                    )}
                  </div>

                </div>

                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>{progress}/{GOAL} para o próximo desconto de R$ 7</span>
                    <span>{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  {/* Stars + ajuste manual */}
                   <div className="flex flex-wrap items-center gap-2 mt-1">
                     <div className="grid grid-cols-5 min-[360px]:grid-cols-10 gap-0.5">
                      {Array.from({ length: GOAL }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < progress ? "text-primary fill-primary" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6"
                        title="Tirar 1 estrela"
                        disabled={r.total_services <= 0}
                        onClick={() => adjustStars(r, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6"
                        title="Adicionar 1 estrela (serviço feito fora do sistema)"
                        onClick={() => adjustStars(r, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => notifyClient(r)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <MessageCircle className="w-3 h-3 mr-1" />
                    {available > 0 ? "Parabenizar no WhatsApp" : "Notificar no WhatsApp"}
                  </Button>
                  {available > 0 && (
                    <Button
                      size="sm"
                      onClick={() => redeemFree(r)}
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Gift className="w-3 h-3 mr-1" />
                      Usar R$ 7
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LoyaltyProgram;
