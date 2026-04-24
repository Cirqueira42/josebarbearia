import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Scissors, DollarSign, Calendar, TrendingUp } from "lucide-react";
import PhotoCarousel from "@/components/PhotoCarousel";
import { getBrazilTodayStr, getBrazilWeekStartStr, getBrazilMonthStartStr } from "@/lib/brazilTime";

type Appointment = {
  id: string;
  customer_name: string;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
};

type Barber = {
  id: string;
  name: string;
  enabled: boolean;
};

type Service = {
  name: string;
  price: number;
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  confirmed: { label: "Confirmado", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  cancelled: { label: "Cancelado", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  completed: { label: "Concluído", color: "bg-green-500/20 text-green-400 border-green-500/30" },
};

const DAYS_PT = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Removido: usando utilitários de @/lib/brazilTime que evitam bugs de fuso.

const BarberView = () => {
  const { id } = useParams<{ id: string }>();
  const [barber, setBarber] = useState<Barber | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    const [barberRes, apptsRes, svcsRes] = await Promise.all([
      supabase.from("barbers").select("id, name, enabled").eq("id", id!).single(),
      supabase.from("appointments").select("id, customer_name, service_name, appointment_date, appointment_time, status").eq("barber_id", id!).order("appointment_date", { ascending: false }).order("appointment_time", { ascending: false }),
      supabase.from("services").select("name, price"),
    ]);

    if (barberRes.error || !barberRes.data || !barberRes.data.enabled) {
      setNotFound(true);
    } else {
      setBarber(barberRes.data);
    }
    if (apptsRes.data) setAppointments(apptsRes.data);
    if (svcsRes.data) setServices(svcsRes.data);
    setLoading(false);
  };

  const getPrice = (name: string) => {
    const s = services.find((sv) => sv.name.toLowerCase() === name.toLowerCase());
    return s?.price ?? 0;
  };

  const stats = useMemo(() => {
    const todayStr = getBrazilTodayStr();
    const weekStartStr = getBrazilWeekStartStr();
    const monthStartStr = getBrazilMonthStartStr();

    let daily = 0, dailyCount = 0, weekly = 0, weeklyCount = 0, monthly = 0, monthlyCount = 0;

    for (const a of appointments.filter((a) => a.status === "completed")) {
      const price = getPrice(a.service_name);
      if (a.appointment_date >= monthStartStr) { monthly += price; monthlyCount++; }
      if (a.appointment_date >= weekStartStr) { weekly += price; weeklyCount++; }
      if (a.appointment_date === todayStr) { daily += price; dailyCount++; }
    }

    return { daily, dailyCount, weekly, weeklyCount, monthly, monthlyCount };
  }, [appointments, services]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <Scissors className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Barbeiro não encontrado</h1>
          <p className="text-muted-foreground">Este link não está disponível ou foi desativado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <PhotoCarousel overlay="heavy" />
      </div>

      <header className="relative z-10 border-b border-border px-4 py-4 bg-background/80 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Scissors className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold font-display text-gradient">{barber?.name}</h1>
            <p className="text-xs text-muted-foreground">Meus Agendamentos</p>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-6">
        {/* Revenue Stats */}
        <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Faturamento</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-background border border-border rounded-lg p-3 text-center space-y-1">
              <Calendar className="w-4 h-4 text-primary mx-auto" />
              <p className="text-xs text-muted-foreground">Hoje</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(stats.daily)}</p>
              <p className="text-[10px] text-muted-foreground">{stats.dailyCount} serviço(s)</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-3 text-center space-y-1">
              <TrendingUp className="w-4 h-4 text-primary mx-auto" />
              <p className="text-xs text-muted-foreground">Semana</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(stats.weekly)}</p>
              <p className="text-[10px] text-muted-foreground">{stats.weeklyCount} serviço(s)</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-3 text-center space-y-1">
              <DollarSign className="w-4 h-4 text-primary mx-auto" />
              <p className="text-xs text-muted-foreground">Mês</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(stats.monthly)}</p>
              <p className="text-[10px] text-muted-foreground">{stats.monthlyCount} serviço(s)</p>
            </div>
          </div>
        </div>

        {/* Appointments */}
        {appointments.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nenhum agendamento ainda.</p>
        ) : (
          <div className="grid gap-3">
            {appointments.map((a) => (
              <div key={a.id} className="bg-card/90 backdrop-blur border border-border rounded-lg p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-foreground text-sm">{a.customer_name}</h3>
                      <Badge className={`text-xs border ${statusLabels[a.status]?.color || ""}`}>
                        {statusLabels[a.status]?.label || a.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">✂️ {a.service_name}</p>
                    <p className="text-sm text-primary font-medium">
                      📅 {new Date(a.appointment_date + "T12:00:00").toLocaleDateString("pt-BR")} ({DAYS_PT[new Date(a.appointment_date + "T12:00:00").getDay()]}) às {a.appointment_time}
                    </p>
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

export default BarberView;
