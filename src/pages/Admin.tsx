import { useEffect, useRef, useState } from "react";
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
  Monitor,
  Tablet,
  Smartphone,
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
import BackgroundManagement from "@/components/admin/BackgroundManagement";
import DataCleanup from "@/components/admin/DataCleanup";
import SalaryGoal from "@/components/admin/SalaryGoal";
import ProductsManagement from "@/components/admin/ProductsManagement";
import Expenses from "@/components/admin/Expenses";
import BlockedCustomers from "@/components/admin/BlockedCustomers";
import CustomerHistory from "@/components/admin/CustomerHistory";
import Coupons from "@/components/admin/Coupons";
import BarberRevenue from "@/components/admin/BarberRevenue";
import CashFlow from "@/components/admin/CashFlow";
import FinancialPanel from "@/components/admin/FinancialPanel";
import BusinessHoursSettings from "@/components/admin/BusinessHoursSettings";
import LoyaltyRewards from "@/components/admin/LoyaltyRewards";
import { updateLoyalty, revertLoyalty } from "@/lib/loyalty";
import { parseHours, DEFAULT_HOURS } from "@/lib/businessHours";
import PhotoCarousel from "@/components/PhotoCarousel";
import ProjectExport from "@/components/admin/ProjectExport";
import { emitDataRefresh } from "@/lib/refreshBus";

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
  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">(() => {
    if (typeof window === "undefined") return "mobile";
    return (localStorage.getItem("admin-view-mode") as any) || "mobile";
  });

  const setView = (m: "desktop" | "tablet" | "mobile") => {
    setViewMode(m);
    try { localStorage.setItem("admin-view-mode", m); } catch {}
  };

  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const v = parseFloat(localStorage.getItem("admin-zoom") || "1");
    return v >= 0.5 && v <= 1.5 ? v : 1;
  });
  const [zoomSaved, setZoomSaved] = useState(true);
  const stepZoom = (d: number) => {
    setZoom((z) => Math.min(1.5, Math.max(0.5, Math.round((z + d) * 100) / 100)));
    setZoomSaved(false);
  };
  const saveZoom = () => {
    try { localStorage.setItem("admin-zoom", String(zoom)); } catch {}
    setZoomSaved(true);
    toast({ title: "Tela salva", description: `Zoom do painel: ${Math.round(zoom * 100)}%` });
  };
  const zoomStyle = { zoom } as React.CSSProperties;

  const viewWidthClass =
    viewMode === "mobile" ? "max-w-[420px]" : viewMode === "tablet" ? "max-w-3xl" : "max-w-7xl";

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

  // Lança o valor do atendimento concluído no caixa do dia, separando o
  // valor de investimento em material conforme a regra configurada.
  const registerCashEntry = async (appointment: Appointment) => {
    const [{ data: svc }, { data: setting }] = await Promise.all([
      supabase.from("services").select("price").eq("name", appointment.service_name).maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "business_hours").maybeSingle(),
    ]);
    const price = Number(svc?.price ?? 0);
    if (price <= 0) return;
    const rule = setting?.value ? parseHours(setting.value) : DEFAULT_HOURS;
    const investment = price > rule.investment_rule_min ? Math.min(rule.investment_rule_amount, price) : 0;

    const { data: exists } = await (supabase as any)
      .from("cash_entries").select("id").eq("appointment_id", appointment.id).maybeSingle();
    if (exists) return;

    await (supabase as any).from("cash_entries").insert({
      entry_date: appointment.appointment_date,
      kind: "in",
      description: `${appointment.service_name} — ${appointment.customer_name}`,
      amount: price,
      investment_amount: investment,
      category: "atendimento",
      appointment_id: appointment.id,
    });
  };



  const busyIdsRef = useRef<Set<string>>(new Set());

  const updateStatus = async (id: string, status: "confirmed" | "cancelled" | "completed") => {
    // Evita envio duplicado de mensagens se o botão for tocado mais de uma vez
    if (busyIdsRef.current.has(id)) return;
    busyIdsRef.current.add(id);
    try {
    const appointment = appointments.find((a) => a.id === id);
    const previousStatus = appointment?.status;
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
    } else {
      // Atualiza a lista na hora, sem esperar o realtime
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      emitDataRefresh("appointments");
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
          // Fidelidade: somente corte, máx 1 por dia, e gera o código exclusivo na meta
          const issued = await updateLoyalty(
            appointment.customer_phone,
            appointment.customer_name,
            appointment.service_name,
            appointment.appointment_date,
            appointment.id,
          );

          // Lança o valor no caixa do dia (uma única vez por atendimento)
          await registerCashEntry(appointment);
          // Atualiza faturamento, caixa e indicadores imediatamente
          emitDataRefresh("cash");
          emitDataRefresh("loyalty");

          if (issued && issued > 0) {
            toast({
              title: "🎉 Meta de fidelidade batida!",
              description: `${appointment.customer_name} liberou um código exclusivo. Envie pelo painel em "Códigos de Fidelidade".`,
            });
            sendTelegram(
              `🎁 <b>FIDELIDADE COMPLETA</b>\n\n👤 ${appointment.customer_name}\n📞 ${phone}\n\nO cliente completou 10 atendimentos e um código exclusivo foi gerado no painel.`
            );
          }



          const googleReviewLink = "https://share.google/hc9HWSbPBPNRGTY8y";
          const instagramLink = "https://www.instagram.com/josebarbeariaa/";
          const tiktokLink = "https://www.tiktok.com/@josegilmario42gmail.com1";
          const text = `Obrigado pela preferência, ${appointment.customer_name}! 🙏\n\nFoi um prazer atendê-lo na *José Barbearia*! 💈\n\n*Serviço:* ${appointment.service_name.toUpperCase()}\n*Data:* ${fullDate}\n\n⭐ *Sua avaliação no Google é muito importante pra gente!* Leva só 30 segundos e ajuda demais 🙏\n\n👉 Toque aqui pra avaliar:\n${googleReviewLink}\n\n📲 *Siga a gente nas redes pra ver novidades, cortes e promoções:*\n📸 Instagram: ${instagramLink}\n🎵 TikTok: ${tiktokLink}\n\nVolte sempre! Agende novamente:\n${BOOKING_URL}\n\n👊`;
          
          openWhatsApp(`55${phone}`, text);

          const googleReviewUrl = "https://share.google/hc9HWSbPBPNRGTY8y";
          sendTelegram(
            `✅ <b>SERVIÇO CONCLUÍDO</b>\n\n👤 ${appointment.customer_name}\n✂️ ${appointment.service_name}\n📅 ${fullDate}\n\n⭐ <b>Link de avaliação já enviado ao cliente!</b>\n👉 <a href="${googleReviewLink}">AVALIAR NO GOOGLE</a>\n\n💬 <a href="https://wa.me/55${phone}?text=${encodeURIComponent(`Olá, ${appointment.customer_name}! Que tal nos avaliar no Google? É super rápido e nos ajuda muito 🙏⭐\n\n👉 ${googleReviewLink}`)}">REENVIAR LINK NO WHATSAPP</a>`
          );
        }
      }
    }
    } finally {
      busyIdsRef.current.delete(id);
    }
  };

  const deleteAppointment = async (id: string) => {
    const target = appointments.find((a) => a.id === id);
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
    } else {
      // Se o agendamento concluído contava estrela, reverter
      if (target && target.status === "completed" && /corte/i.test(target.service_name)) {
        await revertLoyalty(target.customer_phone);
      }
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
        <div className={`${viewWidthClass} mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all`}>
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

      <div className={`relative z-10 ${viewWidthClass} mx-auto px-3 sm:px-4 py-3 sm:py-6 space-y-3 sm:space-y-6 transition-all`} style={zoomStyle}>
        {/* Ajuste de tela (zoom) — apenas painel admin */}
        <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-1.5 flex items-center gap-1 sticky top-2 z-20">
          <Button size="sm" variant="outline" className="h-8 w-9 p-0 shrink-0" onClick={() => stepZoom(-0.05)} aria-label="Diminuir tela">
            <span className="text-base leading-none">−</span>
          </Button>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-xs font-bold leading-none">{Math.round(zoom * 100)}%</p>
            <p className="text-[9px] text-muted-foreground leading-tight">tamanho da tela</p>
          </div>
          <Button size="sm" variant="outline" className="h-8 w-9 p-0 shrink-0" onClick={() => stepZoom(0.05)} aria-label="Aumentar tela">
            <span className="text-base leading-none">+</span>
          </Button>
          <Button size="sm" variant={zoomSaved ? "ghost" : "default"} className="h-8 text-xs shrink-0" onClick={saveZoom}>
            {zoomSaved ? "Salvo" : "Salvar"}
          </Button>
        </div>

        {/* Barra de visualização */}
        <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-1.5 flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground px-2 hidden sm:inline">Visualizar:</span>
          <Button
            size="sm"
            variant={viewMode === "mobile" ? "default" : "ghost"}
            onClick={() => setView("mobile")}
            className="flex-1 h-8 text-xs"
          >
            <Smartphone className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Celular</span>
          </Button>
          <Button
            size="sm"
            variant={viewMode === "tablet" ? "default" : "ghost"}
            onClick={() => setView("tablet")}
            className="flex-1 h-8 text-xs"
          >
            <Tablet className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Tablet</span>
          </Button>
          <Button
            size="sm"
            variant={viewMode === "desktop" ? "default" : "ghost"}
            onClick={() => setView("desktop")}
            className="flex-1 h-8 text-xs"
          >
            <Monitor className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Desktop</span>
          </Button>
        </div>


        {/* Monitor de uso do plano grátis */}
        <UsageMonitor />

        {/* Projeto completo (cópia/backup) */}
        <ProjectExport />


        {/* Fundo da tela principal */}
        <BackgroundManagement />

        {/* Limpeza + Galeria */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
          <DataCleanup />
          <GalleryManagement />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {(["pending", "confirmed", "cancelled", "completed"] as const).map((s) => (
            <div key={s} className="bg-card/90 backdrop-blur border border-border rounded-lg p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {appointments.filter((a) => a.status === s).length}
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground">{statusLabels[s].label}</p>
            </div>
          ))}
        </div>

        {/* Admin sections */}
        <div className="grid gap-3 sm:gap-6 mb-4 sm:mb-6">
          <FinancialPanel />
          <CashFlow />
          <CashRegister />
          <Expenses />
          <SalaryGoal />
          <BarberRevenue />
          <CustomerHistory />
          <Coupons />
          <BlockedCustomers />
          <LoyaltyProgram />
          <LoyaltyRewards />
          <ReportsHistory />
          <BarberManagement />
          <BlockedSlots />
          <ProductsManagement />
          <BusinessHoursSettings />
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
