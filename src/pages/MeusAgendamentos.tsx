import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Scissors, Search, X, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import PhotoCarousel from "@/components/PhotoCarousel";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
};
const statusLabels: Record<string, string> = {
  pending: "Pendente", confirmed: "Confirmado", cancelled: "Cancelado", completed: "Concluído",
};

const MeusAgendamentos = () => {
  const [phone, setPhone] = useState("");
  const [list, setList] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const search = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) { toast({ title: "Digite seu telefone com DDD", variant: "destructive" }); return; }
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from("appointments")
      .select("id, customer_name, service_name, appointment_date, appointment_time, status, barber_name")
      .eq("customer_phone", digits)
      .gte("appointment_date", today)
      .in("status", ["pending", "confirmed"])
      .order("appointment_date").order("appointment_time");
    setLoading(false);
    setList((data as any) || []);
  };

  const cancel = async (id: string) => {
    if (!confirm("Deseja realmente cancelar este agendamento?")) return;
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    if (error) { toast({ title: "Erro ao cancelar", variant: "destructive" }); return; }
    toast({ title: "Agendamento cancelado", description: "Você receberá uma nova confirmação se reagendar." });
    search();
  };

  return (
    <div className="admin-scope min-h-screen bg-background relative">
      <div className="fixed inset-0 z-0"><PhotoCarousel overlay="heavy" /></div>
      <div className="relative z-10 max-w-md mx-auto p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <Scissors className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold font-display text-gradient">Meus Agendamentos</h1>
        </div>
        <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-4 space-y-3">
          <p className="text-sm text-muted-foreground">Digite seu telefone para ver e cancelar seus agendamentos.</p>
          <div className="flex gap-2">
            <Input placeholder="(16) 99999-9999" value={phone} onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()} inputMode="tel" />
            <Button onClick={search} disabled={loading}><Search className="w-4 h-4" /></Button>
          </div>
        </div>

        {list && list.length === 0 && (
          <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-4 text-center text-sm text-muted-foreground">
            Nenhum agendamento futuro encontrado.
          </div>
        )}
        {list && list.map(a => (
          <div key={a.id} className="bg-card/90 backdrop-blur border border-border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold">{a.customer_name}</span>
              <Badge className={`text-xs border ${statusColors[a.status]}`}>{statusLabels[a.status]}</Badge>
            </div>
            <p className="text-sm">💈 {a.service_name}</p>
            <p className="text-sm">👤 {a.barber_name || "José Gilmário"}</p>
            <p className="text-sm text-primary font-medium">
              📅 {new Date(a.appointment_date + "T12:00:00").toLocaleDateString("pt-BR")} às {a.appointment_time}
            </p>
            <Button size="sm" variant="destructive" className="w-full" onClick={() => cancel(a.id)}>
              <X className="w-4 h-4 mr-1" /> Cancelar agendamento
            </Button>
          </div>
        ))}

        <div className="text-center">
          <Link to="/agendar"><Button variant="outline">Novo agendamento</Button></Link>
        </div>
      </div>
    </div>
  );
};

export default MeusAgendamentos;
