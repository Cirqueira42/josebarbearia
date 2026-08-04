import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Clock, Save } from "lucide-react";
import { BusinessHours, DEFAULT_HOURS, parseHours, timeToMinutes } from "@/lib/businessHours";

const BusinessHoursSettings = () => {
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "business_hours").maybeSingle();
      if (data?.value) setHours(parseHours(data.value));
    })();
  }, []);

  const set = (k: keyof BusinessHours, v: string) => setHours((h) => ({ ...h, [k]: v } as BusinessHours));

  const save = async () => {
    if (timeToMinutes(hours.close) <= timeToMinutes(hours.open)) {
      toast({ title: "Horário inválido", description: "O encerramento deve ser depois da abertura.", variant: "destructive" });
      return;
    }
    if (timeToMinutes(hours.lunch_end) < timeToMinutes(hours.lunch_start)) {
      toast({ title: "Horário inválido", description: "O retorno deve ser depois do almoço.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert({
      key: "business_hours",
      value: {
        open: hours.open,
        lunch_start: hours.lunch_start,
        lunch_end: hours.lunch_end,
        close: hours.close,
        investment_rule_min: Number(hours.investment_rule_min) || 20,
        investment_rule_amount: Number(hours.investment_rule_amount) || 5,
      } as any,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
    else toast({ title: "Horário salvo ✅", description: "Os horários do agendamento já foram atualizados." });
  };

  return (
    <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-primary" />
        <h2 className="text-base sm:text-lg font-bold">Horário de Funcionamento</h2>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <Label className="text-[11px] text-muted-foreground">Abertura</Label>
          <Input type="time" value={hours.open} onChange={(e) => set("open", e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Almoço (saída)</Label>
          <Input type="time" value={hours.lunch_start} onChange={(e) => set("lunch_start", e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Retorno do almoço</Label>
          <Input type="time" value={hours.lunch_end} onChange={(e) => set("lunch_end", e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Encerramento</Label>
          <Input type="time" value={hours.close} onChange={(e) => set("close", e.target.value)} className="h-9 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <Label className="text-[11px] text-muted-foreground">Separar a partir de R$</Label>
          <Input
            inputMode="decimal"
            value={String(hours.investment_rule_min)}
            onChange={(e) => setHours((h) => ({ ...h, investment_rule_min: Number(e.target.value.replace(",", ".")) || 0 }))}
            className="h-9 text-sm"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Valor p/ investimento R$</Label>
          <Input
            inputMode="decimal"
            value={String(hours.investment_rule_amount)}
            onChange={(e) => setHours((h) => ({ ...h, investment_rule_amount: Number(e.target.value.replace(",", ".")) || 0 }))}
            className="h-9 text-sm"
          />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mb-3">
        Regra do caixa: em cada atendimento acima de R$ {Number(hours.investment_rule_min).toFixed(2)},
        R$ {Number(hours.investment_rule_amount).toFixed(2)} vai para o caixa de investimento em material e o restante para a conta.
        Domingo permanece fechado.
      </p>

      <Button onClick={save} size="sm" className="w-full" disabled={saving}>
        <Save className="w-4 h-4 mr-1" /> Salvar horários
      </Button>
    </div>
  );
};

export default BusinessHoursSettings;
