import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarOff, Plus, Trash2, Clock } from "lucide-react";
import { getBrazilTodayStr } from "@/lib/brazilTime";

type BlockedSlot = {
  id: string;
  blocked_date: string;
  blocked_time: string | null;
  reason: string | null;
  created_at: string;
};

const HORARIOS = (() => {
  const slots: string[] = [];
  for (let h = 8; h < 12; h++) {
    for (let m = 0; m < 60; m += 10) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  for (let h = 13; h < 19; h++) {
    for (let m = 0; m < 60; m += 10) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  slots.push("19:00");
  return slots;
})();

const getMinDate = () => getBrazilTodayStr();

const DAYS_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const BlockedSlots = () => {
  const [slots, setSlots] = useState<BlockedSlot[]>([]);
  const [newDate, setNewDate] = useState("");
  const [blockType, setBlockType] = useState<"all" | "range">("all");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("19:00");
  const [reason, setReason] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchSlots();
    const channel = supabase
      .channel("blocked-slots-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "blocked_slots" }, () => fetchSlots())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchSlots = async () => {
    const today = getMinDate();
    const { data } = await supabase
      .from("blocked_slots")
      .select("*")
      .gte("blocked_date", today)
      .order("blocked_date", { ascending: true });
    if (data) setSlots(data);
  };

  const addBlock = async () => {
    if (!newDate) {
      toast({ title: "Selecione uma data", variant: "destructive" });
      return;
    }
    if (newDate < getMinDate()) {
      toast({ title: "Data passada", description: "Selecione uma data futura.", variant: "destructive" });
      return;
    }
    const d = new Date(newDate + "T12:00:00");
    if (d.getDay() === 0) {
      toast({ title: "Domingo", description: "Domingos já são fechados automaticamente.", variant: "destructive" });
      return;
    }
    if (blockType === "all") {
      const { error } = await supabase.from("blocked_slots").insert({
        blocked_date: newDate,
        blocked_time: null,
        reason: reason || null,
      });
      if (error) {
        toast({ title: "Erro", description: "Não foi possível bloquear.", variant: "destructive" });
      } else {
        toast({ title: "Bloqueado!", description: "Dia inteiro bloqueado." });
        setNewDate("");
        setReason("");
      }
    } else {
      // Insert individual slots for the range
      const startIdx = HORARIOS.indexOf(startTime);
      const endIdx = HORARIOS.indexOf(endTime);
      if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
        toast({ title: "Horário inválido", description: "O horário de início deve ser antes do término.", variant: "destructive" });
        return;
      }
      const slotsToBlock = HORARIOS.slice(startIdx, endIdx + 1);
      const inserts = slotsToBlock.map((t) => ({
        blocked_date: newDate,
        blocked_time: t,
        reason: reason || null,
      }));
      const { error } = await supabase.from("blocked_slots").insert(inserts);
      if (error) {
        toast({ title: "Erro", description: "Não foi possível bloquear.", variant: "destructive" });
      } else {
        toast({ title: "Bloqueado!", description: `Horários de ${startTime} até ${endTime} bloqueados.` });
        setNewDate("");
        setReason("");
      }
    }
  };

  const removeBlock = async (id: string) => {
    await supabase.from("blocked_slots").delete().eq("id", id);
    toast({ title: "Removido", description: "Bloqueio removido." });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <CalendarOff className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Bloquear Dias / Horários</h2>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-4">
        <Input
          type="date"
          min={getMinDate()}
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="w-full sm:w-44"
        />
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="blockType"
              checked={blockType === "all"}
              onChange={() => setBlockType("all")}
              className="accent-primary"
            />
            <span className="text-sm text-foreground whitespace-nowrap">Dia Inteiro</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="blockType"
              checked={blockType === "range"}
              onChange={() => setBlockType("range")}
              className="accent-primary"
            />
            <span className="text-sm text-foreground whitespace-nowrap">Horário</span>
          </label>
        </div>
        {blockType === "range" && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="flex-1 sm:flex-none h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              {HORARIOS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span className="text-sm text-muted-foreground">até</span>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="flex-1 sm:flex-none h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              {HORARIOS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        )}
        <Input
          placeholder="Motivo (opcional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full sm:flex-1 sm:min-w-[140px]"
        />
        <Button onClick={addBlock} size="sm" className="w-full sm:w-auto shrink-0">
          <Plus className="w-4 h-4 mr-1" />
          Bloquear
        </Button>
      </div>

      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum bloqueio futuro cadastrado.</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {slots.map((s) => {
            const d = new Date(s.blocked_date + "T12:00:00");
            const dayName = DAYS_PT[d.getDay()];
            return (
              <div key={s.id} className="flex items-center justify-between gap-2 bg-background border border-border rounded-md px-3 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                    {d.toLocaleDateString("pt-BR")} ({dayName})
                  </Badge>
                  {s.blocked_time ? (
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30">
                      <Clock className="w-3 h-3 mr-1" />
                      {s.blocked_time}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                      Dia Inteiro
                    </Badge>
                  )}
                  {s.reason && <span className="text-xs text-muted-foreground">{s.reason}</span>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeBlock(s.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BlockedSlots;
