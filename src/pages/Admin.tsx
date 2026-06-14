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
import { openWhatsApp } from "@/lib/whatsapp";
import BlockedSlots from "@/components/admin/BlockedSlots";
import AdminSettings from "@/components/admin/AdminSettings";
import CashRegister from "@/components/admin/CashRegister";
import BarberManagement from "@/components/admin/BarberManagement";
import AdminNotification from "@/components/admin/AdminNotification";
import LoyaltyProgram from "@/components/admin/LoyaltyProgram";
import ReportsHistory from "@/components/admin/ReportsHistory";
import UsageMonitor from "@/components/admin/UsageMonitor";
import GalleryManagement from "@/components/admin/GalleryManagement";
import DataCleanup from "@/components/admin/DataCleanup";
import ProductsManagement from "@/components/admin/ProductsManagement";
import PhotoCarousel from "@/components/PhotoCarousel";

type Appointment = Tables<"appointments">;

const BARBER_PHONE = "5516997369740";
const BOOKING_URL = "https://josebarbearia.lovable.app/agendar";
const GOOGLE_MAPS_LINK = "https://maps.app.goo.gl/JVahTmuAYLfAiyx57";
const ADDRESS = "Av. Otávio Rangel, 477 - Vila Cecap, Guariba - SP";

const DAYS_PT = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  confirmed: { label: "Confirmado", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  cancelled: { label: "Cancelado", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  completed: { label: "Concluído", color: "bg-green-500/20 text-green-400 border-green-500/30" },
};

const formatFullDate = (dateStr: string) => {
  const d = new Date(dateStr + "T12:00:00");
  const dayName = DAYS_PT[d.getDay()];
  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTHS_PT[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName}, ${day} de ${month} de ${year}`;
};

const generateBookingCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
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

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: false });

    if (!error && data) setAppointments(data);
    setLoading(false);
  };

  const updateLoyalty = async (
    customerPhone: string,
    customerName: string,
    serviceName: string,
    appointmentDate: string,
    currentId: string,
  ) => {
    const phone = customerPhone.replace(/\D/g, "");

    // Regra 1: só conta serviços de CORTE (corte, corte + barba, corte infantil)
    if (!/corte/i.test(serviceName)) return;

    // Regra 2: máximo 1 por dia. Se já existe outro agendamento concluído de corte
    // no mesmo dia pra esse cliente, não incrementa.
    const { data: sameDay } = await supabase
      .from("appointments")
      .select("id, service_name")
      .eq("customer_phone", phone)
      .eq("appointment_date", appointmentDate)
      .eq("status", "completed")
      .neq("id", currentId);

    const alreadyCountedToday = (sameDay || []).some((a: any) => /corte/i.test(a.service_name));
    if (alreadyCountedToday) return;

    // Check if loyalty record exists
    const { data: existing } = await supabase
      .from("loyalty")
      .select("*")
      .eq("customer_phone", phone)
      .maybeSingle();

    if (existing) {
      const newTotal = (existing as any).total_services + 1;
      const newEarned = Math.floor(newTotal / 10);
      await supabase
        .from("loyalty")
        .update({
          total_services: newTotal,
          free_services_earned: newEarned,
          customer_name: customerName,
          updated_at: new Date().toISOString(),
        })
        .eq("customer_phone", phone);
    } else {
      await supabase.from("loyalty").insert({
        customer_phone: phone,
        customer_name: customerName,
        total_services: 1,
        free_services_earned: 0,
        free_services_redeemed: 0,
      });
    }
  };

  const revertLoyalty = async (customerPhone: string) => {
    const phone = customerPhone.replace(/\D/g, "");
    const { data: existing } = await supabase
      .from("loyalty")
      .select("*")
      .eq("customer_phone", phone)
      .maybeSingle();
    if (!existing) return;
    const newTotal = Math.max(((existing as any).total_services || 0) - 1, 0);
    const newEarned = Math.floor(newTotal / 10);
    await supabase
      .from("loyalty")
      .update({
        total_services: newTotal,
        free_services_earned: newEarned,
        updated_at: new Date().toISOString(),
      })
      .eq("customer_phone", phone);
  };

  const updateStatus = async (id: string, status: "confirmed" | "cancelled" | "completed") => {
    const appointment = appointments.find((a) => a.id === id);
    const previousStatus = appointment?.status;
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: `Agendamento ${statusLabels[status].label.toLowerCase()}.` });

      if (appointment) {
        const fullDate = formatFullDate(appointment.appointment_date);
        const phone = appointment.customer_phone.replace(/\D/g, "");
        const bookingCode = generateBookingCode();

        if (status === "confirmed") {
          const text = `Olá, ${appointment.customer_name} o seu agendamento com a *José Barbearia* foi confirmado!\n\n*Serviço:* ${appointment.service_name.toUpperCase()}\n\n*Quando:* ${fullDate} às ${appointment.appointment_time}\n\n*Profissional:* JOSE GILMARIO\n\n*Código:* ${bookingCode}\n\n📍*Endereço:* ${ADDRESS}\n\n📍*Link Google Maps:* ${GOOGLE_MAPS_LINK}`;
          openWhatsApp(`55${phone}`, text);

          sendTelegram(
            `✅ <b>AGENDAMENTO CONFIRMADO</b>\n\n👤 ${appointment.customer_name}\n✂️ ${appointment.service_name}\n📅 ${fullDate}\n🕐 ${appointment.appointment_time}\n🔑 Código: ${bookingCode}\n\n💬 <a href="https://wa.me/55${phone}">Conversar no WhatsApp</a>`
          );
        }

        if (status === "cancelled") {
          // Se estava concluído e estamos cancelando, reverter a estrela (se aplicável)
          if (previousStatus === "completed" && /corte/i.test(appointment.service_name)) {
            await revertLoyalty(appointment.customer_phone);
          }

          const text = `Olá, ${appointment.customer_name}\n\nInfelizmente seu agendamento com a *José Barbearia* foi cancelado.\n\n*Serviço:* ${appointment.service_name.toUpperCase()}\n*Data:* ${fullDate}\n*Horário:* ${appointment.appointment_time}\n\nVocê pode reagendar pelo link:\n${BOOKING_URL}\n\n*José Barbearia* 💈`;
          openWhatsApp(`55${phone}`, text);

          sendTelegram(
            `❌ <b>AGENDAMENTO CANCELADO</b>\n\n👤 ${appointment.customer_name}\n✂️ ${appointment.service_name}\n📅 ${fullDate}\n🕐 ${appointment.appointment_time}`
          );
        }

        if (status === "completed") {
          // Update loyalty program (somente corte, máx 1 por dia)
          await updateLoyalty(
            appointment.customer_phone,
            appointment.customer_name,
            appointment.service_name,
            appointment.appointment_date,
            appointment.id,
          );

          const googleReviewLink = "https://share.google/hc9HWSbPBPNRGTY8y";
          const text = `Obrigado pela preferência, ${appointment.customer_name}! 🙏\n\nFoi um prazer atendê-lo na *José Barbearia*! 💈\n\n*Serviço:* ${appointment.service_name.toUpperCase()}\n*Data:* ${fullDate}\n\n⭐ *Sua avaliação no Google é muito importante pra gente!* Leva só 30 segundos e ajuda demais 🙏\n\n👉 Toque aqui pra avaliar:\n${googleReviewLink}\n\nVolte sempre! Agende novamente:\n${BOOKING_URL}\n\n👊`;
          openWhatsApp(`55${phone}`, text);

          const googleReviewUrl = "https://share.google/hc9HWSbPBPNRGTY8y";
          sendTelegram(
            `✅ <b>SERVIÇO CONCLUÍDO</b>\n\n👤 ${appointment.customer_name}\n✂️ ${appointment.service_name}\n📅 ${fullDate}\n\n⭐ <b>Link de avaliação já enviado ao cliente!</b>\n👉 <a href="${googleReviewLink}">AVALIAR NO GOOGLE</a>\n\n💬 <a href="https://wa.me/55${phone}?text=${encodeURIComponent(`Olá, ${appointment.customer_name}! Que tal nos avaliar no Google? É super rápido e nos ajuda muito 🙏⭐\n\n👉 ${googleReviewLink}`)}">REENVIAR LINK NO WHATSAPP</a>`
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
      <AdminNotification />
      <div className="fixed inset-0 z-0">
        <PhotoCarousel overlay="heavy" />
      </div>
      <header className="relative z-10 border-b border-border px-3 sm:px-4 py-3 sm:py-4 bg-background/80 backdrop-blur">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Scissors className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
            <h1 className="text-base sm:text-xl font-bold font-display text-gradient truncate">PAINEL ADMIN</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(BOOKING_URL);
                toast({ title: "Link copiado!", description: BOOKING_URL });
              }}
              className="flex-1 sm:flex-none"
            >
              <Share2 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Compartilhar</span>
              <span className="sm:hidden ml-1.5">Link</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(BOOKING_URL, "_blank")} className="flex-1 sm:flex-none">
              <ExternalLink className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Ver Site</span>
              <span className="sm:hidden ml-1.5">Site</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="flex-1 sm:flex-none">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
              <span className="sm:hidden ml-1.5">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Monitor de uso do plano grátis */}
        <UsageMonitor />

        {/* Limpeza + Galeria */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DataCleanup />
          <GalleryManagement />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 flex-1 sm:flex-none min-w-0">
              <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="flex-1 sm:w-44 min-w-0"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 sm:w-40 shrink-0">
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
          <LoyaltyProgram />
          <ReportsHistory />
          <BarberManagement />
          <BlockedSlots />
          <ProductsManagement />
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
