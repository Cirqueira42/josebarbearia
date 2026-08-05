import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Clock, Save, Copy } from "lucide-react";
import {
  BusinessHours,
  DayHours,
  DAY_LABELS,
  DEFAULT_HOURS,
  parseHours,
  timeToMinutes,
} from "@/lib/businessHours";

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

  const setDay = (i: number, patch: Partial<DayHours>) =>
    setHours((h) => ({
      ...h,
      days: h.days.map((d, idx) => (idx === i ? { ...d, ...patch } : d)),
    }));

  const copyToAll = (i: number) => {
    const src = hours.days[i];
    setHours((h) => ({
      ...h,
      days: h.days.map((d) => (d.closed && d !== src ? d : { ...src, closed: d.closed })),
    }));
    toast({ title: "Copiado", description: `Horário de ${DAY_LABELS[i]} aplicado aos dias abertos.` });
  };

  const save = async () => {
    for (let i = 0; i < hours.days.length; i++) {
      const d = hours.days[i];
      if (d.closed) continue;
      if (timeToMinutes(d.close) <= timeToMinutes(d.open)) {
        toast({ title: `${DAY_LABELS[i]}: horário inválido`, description: "O encerramento deve ser depois da abertura.", variant: "destructive" });
        return;
      }
      if (timeToMinutes(d.lunch_end) < timeToMinutes(d.lunch_start)) {
        toast({ title: `${DAY_LABELS[i]}: horário inválido`, description: "O retorno deve ser depois do almoço.", variant: "destructive" });
        return;
      }
    }

    const firstOpen = hours.days.find((d) => !d.closed) || hours.days[1];

    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert({
      key: "business_hours",
      value: {
        open: firstOpen.open,
        lunch_start: firstOpen.lunch_start,
        lunch_end: firstOpen.lunch_end,
        close: firstOpen.close,
        investment_rule_min: Number(hours.investment_rule_min) || 20,
        investment_rule_amount: Number(hours.investment_rule_amount) || 5,
        days: hours.days,
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

      <div className="space-y-2 mb-4">
        {hours.days.map((d, i) => (
          <div key={i} className="rounded-lg border border-border p-2">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-semibold">{DAY_LABELS[i]}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{d.closed ? "Fechado" : "Aberto"}</span>
                <Switch checked={!d.closed} onCheckedChange={(v) => setDay(i, { closed: !v })} />
              </div>
            </div>

            {!d.closed && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Abertura</Label>
                    <Input type="time" value={d.open} onChange={(e) => setDay(i, { open: e.target.value })} className="h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Almoço (saída)</Label>
                    <Input type="time" value={d.lunch_start} onChange={(e) => setDay(i, { lunch_start: e.target.value })} className="h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Retorno do almoço</Label>
                    <Input type="time" value={d.lunch_end} onChange={(e) => setDay(i, { lunch_end: e.target.value })} className="h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Encerramento</Label>
                    <Input type="time" value={d.close} onChange={(e) => setDay(i, { close: e.target.value })} className="h-9 text-sm" />
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="mt-1 h-7 text-[11px]" onClick={() => copyToAll(i)}>
                  <Copy className="w-3 h-3 mr-1" /> Aplicar a todos os dias abertos
                </Button>
              </>
            )}
          </div>
        ))}
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
      </p>

      <Button onClick={save} size="sm" className="w-full" disabled={saving}>
        <Save className="w-4 h-4 mr-1" /> Salvar horários
      </Button>
    </div>
  );
};

export default BusinessHoursSettings;
