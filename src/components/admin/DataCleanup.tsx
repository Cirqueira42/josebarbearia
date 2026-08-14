import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDataRefresh } from "@/lib/refreshBus";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Archive, Database } from "lucide-react";
import { subtractMonthsFromTodayStr, getBrazilMonthStartStr } from "@/lib/brazilTime";

const DataCleanup = () => {
  const [months, setMonths] = useState("6");
  const [scope, setScope] = useState<"completed" | "cancelled" | "both">("both");
  const [counts, setCounts] = useState({ completed: 0, cancelled: 0, eligible: 0 });
  const [monthStats, setMonthStats] = useState({ corteBarba: 0, corte: 0, barba: 0, corteInfantil: 0, total: 0 });
  const [working, setWorking] = useState(false);
  const { toast } = useToast();

  const cutoffDate = () => subtractMonthsFromTodayStr(parseInt(months));

  const load = async () => {
    const cutoff = cutoffDate();

    const [completedRes, cancelledRes] = await Promise.all([
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .lt("appointment_date", cutoff),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("status", "cancelled")
        .lt("appointment_date", cutoff),
    ]);

    const completed = completedRes.count || 0;
    const cancelled = cancelledRes.count || 0;
    let eligible = 0;
    if (scope === "completed") eligible = completed;
    else if (scope === "cancelled") eligible = cancelled;
    else eligible = completed + cancelled;

    setCounts({ completed, cancelled, eligible });

    // Contagem por tipo de serviço no mês atual (todos os status, exceto cancelados)
    const monthStart = getBrazilMonthStartStr();
    const { data: monthAppts } = await supabase
      .from("appointments")
      .select("service_name, status")
      .gte("appointment_date", monthStart)
      .neq("status", "cancelled");

    let corteBarba = 0, corte = 0, barba = 0, corteInfantil = 0;
    for (const a of monthAppts || []) {
      const n = (a.service_name || "").toLowerCase();
      const hasCorte = n.includes("corte") || n.includes("cabelo");
      const hasBarba = n.includes("barba");
      const isInfantil = n.includes("infantil");
      if (isInfantil) {
        corteInfantil++;
      } else if (hasCorte && hasBarba) {
        corteBarba++;
      } else if (hasCorte) {
        corte++;
      } else if (hasBarba) {
        barba++;
      }
    }
    setMonthStats({ corteBarba, corte, barba, corteInfantil, total: (monthAppts?.length || 0) });
  };

  useEffect(() => {
    load();
  }, [months, scope]);

  useDataRefresh(["appointments", "cash"], load);

  const handleDelete = async () => {
    setWorking(true);
    const cutoff = cutoffDate();

    // PASSO 1 (obrigatório): consolidar e preservar o histórico antes de apagar detalhes.
    let consolidated = 0;
    try {
      const { data: oldest } = await supabase
        .from("appointments")
        .select("appointment_date")
        .lt("appointment_date", cutoff)
        .order("appointment_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (oldest?.appointment_date) {
        const done = await consolidateRange(oldest.appointment_date, cutoff);
        consolidated = done.length;
      }
    } catch (e: any) {
      toast({
        title: "Limpeza cancelada",
        description: "Não foi possível preservar o histórico consolidado. Nada foi removido.",
        variant: "destructive",
      });
      setWorking(false);
      return;
    }

    // PASSO 2: remover apenas os registros detalhados antigos.
    let query = supabase.from("appointments").delete().lt("appointment_date", cutoff);



    if (scope === "completed") query = query.eq("status", "completed");
    else if (scope === "cancelled") query = query.eq("status", "cancelled");
    else query = query.in("status", ["completed", "cancelled"]);

    const { error } = await query;

    if (error) {
      toast({ title: "Erro ao limpar", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Limpeza concluída ✅",
        description: `${counts.eligible} agendamento(s) removido(s).`,
      });
      load();
    }
    setWorking(false);
  };

  const exportCsv = async () => {
    const { data } = await supabase.from("appointments").select("*").order("appointment_date", { ascending: false });
    if (!data || data.length === 0) { toast({ title: "Nada para exportar" }); return; }
    const cols = Object.keys(data[0]);
    const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...data.map(r => cols.map(c => escape((r as any)[c])).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agendamentos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Backup baixado ✅", description: `${data.length} agendamentos exportados` });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Archive className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">Limpeza de Dados Antigos</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Remove agendamentos antigos para liberar espaço e manter o sistema rápido. Os dados financeiros já foram contabilizados nos relatórios.
      </p>

      <Button variant="outline" size="sm" onClick={exportCsv} className="w-full">
        <Database className="w-4 h-4 mr-2" />
        Baixar backup (.csv) de todos os agendamentos
      </Button>

      {/* Relatório de agendamentos do mês por tipo de serviço */}
      <div className="bg-background/50 rounded-lg p-3 text-sm space-y-1 border border-border">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Database className="w-4 h-4" />
          <span className="font-medium">Relatório do mês (por serviço)</span>
        </div>
        <div className="flex justify-between">
          <span>✂️ Apenas corte:</span>
          <span className="font-mono font-bold text-primary">{monthStats.corte}</span>
        </div>
        <div className="flex justify-between">
          <span>🧔 Apenas barba:</span>
          <span className="font-mono font-bold text-primary">{monthStats.barba}</span>
        </div>
        <div className="flex justify-between">
          <span>💈 Corte + barba:</span>
          <span className="font-mono font-bold text-primary">{monthStats.corteBarba}</span>
        </div>
        <div className="flex justify-between">
          <span>💈 Corte + barba:</span>
          <span className="font-mono font-bold text-primary">{monthStats.corteBarba}</span>
        </div>
        <div className="flex justify-between">
          <span>👶 Corte infantil:</span>
          <span className="font-mono font-bold text-primary">{monthStats.corteInfantil}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 mt-2">
          <span className="font-bold">Total do mês:</span>
          <span className="font-mono font-bold text-foreground">{monthStats.total}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Mais antigos que</label>
          <Select value={months} onValueChange={setMonths}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">1 ano</SelectItem>
              <SelectItem value="24">2 anos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">O que remover</label>
          <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Concluídos + Cancelados</SelectItem>
              <SelectItem value="completed">Apenas Concluídos</SelectItem>
              <SelectItem value="cancelled">Apenas Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-background/50 rounded-lg p-3 text-sm space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Database className="w-4 h-4" />
          <span className="font-medium">Análise:</span>
        </div>
        <div className="flex justify-between">
          <span>✅ Concluídos elegíveis:</span>
          <span className="font-mono font-bold">{counts.completed}</span>
        </div>
        <div className="flex justify-between">
          <span>❌ Cancelados elegíveis:</span>
          <span className="font-mono font-bold">{counts.cancelled}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 mt-2">
          <span className="font-bold">Total a remover:</span>
          <span className="font-mono font-bold text-primary">{counts.eligible}</span>
        </div>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            disabled={counts.eligible === 0 || working}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {working ? "Removendo..." : `Limpar ${counts.eligible} registro(s)`}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Confirmar limpeza</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a remover <strong>{counts.eligible}</strong> agendamento(s) com mais de <strong>{months} mês(es)</strong>.
              <br /><br />
              Esta ação <strong>não pode ser desfeita</strong>. Os dados financeiros já foram contabilizados nos relatórios anteriores.
              <br /><br />
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Sim, remover tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DataCleanup;
