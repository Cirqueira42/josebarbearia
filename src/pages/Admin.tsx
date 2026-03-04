import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Scissors,
  LogOut,
  Check,
  X,
  Trash2,
  Trophy,
  Search,
  CalendarDays,
  Share2,
  ExternalLink,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import BlockedSlots from "@/components/admin/BlockedSlots";
import AdminSettings from "@/components/admin/AdminSettings";
import CashRegister from "@/components/admin/CashRegister";
import PhotoCarousel from "@/components/PhotoCarousel";

type Appointment = Tables<"appointments">;

const BARBER_PHONE = "5516997369740";
const BOOKING_URL = "https://barber-hub-finder.lovable.app/agendar";

const DAYS_PT = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  confirmed: { label: "Confirmado", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  cancelled: { label: "Cancelado", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  completed: { label: "Concluído", color: "bg-green-500/20 text-green-400 border-green-500/30" },
};

const getDayOfWeek = (dateStr: string) => {
  const d = new Date(dateStr + "T12:00:00");
  return DAYS_PT[d.getDay()];
};

const sendTelegram = async (message: string) => {
  try {
    await supabase.functions.invoke("send-telegram", { body: { message } });
  } catch {}
};

const Admin = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchName, setSearchName] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchAppointments();

    const channel = supabase
      .channel("appointments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => fetchAppointments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/admin-login");
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      await supabase.auth.signOut();
      navigate("/admin-login");
    }
  };

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: false });

    if (!error && data) setAppointments(data);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: "confirmed" | "cancelled" | "completed") => {
    const appointment = appointments.find((a) => a.id === id);
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: `Agendamento ${statusLabels[status].label.toLowerCase()}.` });

      if (appointment) {
        const dateFormatted = new Date(appointment.appointment_date + "T12:00:00").toLocaleDateString("pt-BR");
        const dayName = getDayOfWeek(appointment.appointment_date);
        const phone = appointment.customer_phone.replace(/\D/g, "");

        if (status === "confirmed") {
          const msg = encodeURIComponent(
            `✅ Agendamento Confirmado!\n\nOlá ${appointment.customer_name}! 😊\n\nSeu agendamento na José Barbearia foi confirmado:\n\n💈 Serviço: ${appointment.service_name}\n📅 Data: ${dateFormatted} (${dayName})\n🕐 Hora: ${appointment.appointment_time}\n\n📍 Av. Otávio Rangel, 477 - Vila Cecap, Guariba - SP\n\nTe esperamos! 👊`
          );
          window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");

          sendTelegram(
            `✅ <b>Agendamento Confirmado</b>\n\n👤 ${appointment.customer_name}\n💈 ${appointment.service_name}\n📅 ${dateFormatted} (${dayName})\n🕐 ${appointment.appointment_time}`
          );
        }

        if (status === "cancelled") {
          const msg = encodeURIComponent(
            `❌ Agendamento Cancelado\n\nOlá ${appointment.customer_name},\n\nInfelizmente seu agendamento foi cancelado:\n\n💈 Serviço: ${appointment.service_name}\n📅 Data: ${dateFormatted} (${dayName})\n🕐 Hora: ${appointment.appointment_time}\n\nVocê pode reagendar pelo link:\n${BOOKING_URL}\n\nJosé Barbearia 💈`
          );
          window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");

          sendTelegram(
            `❌ <b>Agendamento Cancelado</b>\n\n👤 ${appointment.customer_name}\n💈 ${appointment.service_name}\n📅 ${dateFormatted} (${dayName})\n🕐 ${appointment.appointment_time}`
          );
        }

        if (status === "completed") {
          const msg = encodeURIComponent(
            `✅ Obrigado pela preferência, ${appointment.customer_name}! 🙏\n\nFoi um prazer atendê-lo na José Barbearia! 💈\n\nServiço: ${appointment.service_name}\nData: ${dateFormatted} (${dayName})\n\nVolte sempre! Agende novamente:\n${BOOKING_URL}\n\n👊`
          );
          window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");

          sendTelegram(
            `✅ <b>Serviço Concluído</b>\n\n👤 ${appointment.customer_name}\n💈 ${appointment.service_name}\n📅 ${dateFormatted} (${dayName})`
          );
        }
      }
    }
  };

  const deleteAppointment = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
    } else {
      toast({ title: "Excluído", description: "Agendamento removido." });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin-login");
  };

  const filtered = appointments.filter((a) => {
    if (filterDate && a.appointment_date !== filterDate) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (searchName && !a.customer_name.toLowerCase().includes(searchName.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <PhotoCarousel overlay="heavy" />
      </div>
      <header className="relative z-10 border-b border-border px-4 py-4 bg-background/80 backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scissors className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold font-display text-gradient">PAINEL ADMIN</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(BOOKING_URL);
                toast({ title: "Link copiado!", description: BOOKING_URL });
              }}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Compartilhar
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(BOOKING_URL, "_blank")}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver Site
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do cliente..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-44"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="confirmed">Confirmado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(["pending", "confirmed", "cancelled", "completed"] as const).map((s) => (
            <div key={s} className="bg-card/90 backdrop-blur border border-border rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {appointments.filter((a) => a.status === s).length}
              </p>
              <p className="text-xs text-muted-foreground">{statusLabels[s].label}</p>
            </div>
          ))}
        </div>

        {/* Admin sections */}
        <div className="grid gap-6 mb-6">
          <CashRegister />
          <BlockedSlots />
          <AdminSettings />
        </div>

        {/* Appointments list */}
        {loading ? (
          <p className="text-center text-muted-foreground py-12">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nenhum agendamento encontrado.</p>
        ) : (
          <div className="grid gap-4">
            {filtered.map((a) => (
              <div key={a.id} className="bg-card/90 backdrop-blur border border-border rounded-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-foreground">{a.customer_name}</h3>
                      <Badge className={`text-xs border ${statusLabels[a.status].color}`}>
                        {statusLabels[a.status].label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">📞 {a.customer_phone}</p>
                    <p className="text-sm text-muted-foreground">💈 {a.service_name}</p>
                    <p className="text-sm text-primary font-medium">
                      📅 {new Date(a.appointment_date + "T12:00:00").toLocaleDateString("pt-BR")} ({getDayOfWeek(a.appointment_date)}) às {a.appointment_time}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {a.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(a.id, "confirmed")}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Confirmar
                      </Button>
                    )}
                    {(a.status === "pending" || a.status === "confirmed") && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(a.id, "completed")}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Trophy className="w-3 h-3 mr-1" />
                        Concluir
                      </Button>
                    )}
                    {a.status !== "cancelled" && a.status !== "completed" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateStatus(a.id, "cancelled")}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancelar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteAppointment(a.id)}
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
