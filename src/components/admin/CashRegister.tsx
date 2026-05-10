import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Calendar, TrendingUp, Users } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { getBrazilTodayStr, getBrazilWeekStartStr, getBrazilMonthStartStr } from "@/lib/brazilTime";

type Appointment = Tables<"appointments">;

const getSaoPauloNow = () => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
};

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CashRegister = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Pick<Appointment, "customer_phone" | "appointment_date">[]>([]);
  const [services, setServices] = useState<{ name: string; price: number }[]>([]);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("cash-register-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => fetchData())
      .subscribe();

    // Check closing time every minute
    const interval = setInterval(checkClosing, 60_000);
    checkClosing();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const fetchData = async () => {
    const [appts, allAppts, svcs] = await Promise.all([
      supabase.from("appointments").select("*").eq("status", "completed"),
      supabase.from("appointments").select("customer_phone, appointment_date"),
      supabase.from("services").select("name, price"),
    ]);
    if (appts.data) setAppointments(appts.data);
    if (allAppts.data) setAllAppointments(allAppts.data as any);
    if (svcs.data) setServices(svcs.data);
  };

  const checkClosing = () => {
    const now = getSaoPauloNow();
    // Fecha automaticamente no fim do expediente (19:00)
    setIsClosed(now.getHours() >= 19);
  };

  const getPrice = (serviceName: string): number => {
    const svc = services.find((s) => s.name.toLowerCase() === serviceName.toLowerCase());
    return svc?.price ?? 0;
  };

  const stats = useMemo(() => {
    const todayStr = getBrazilTodayStr();
    const weekStartStr = getBrazilWeekStartStr();
    const monthStartStr = getBrazilMonthStartStr();

    let daily = 0;
    let dailyCount = 0;
    let weekly = 0;
    let weeklyCount = 0;
    let monthly = 0;
    let monthlyCount = 0;

    for (const a of appointments) {
      const price = getPrice(a.service_name);
      if (a.appointment_date >= monthStartStr) {
        monthly += price;
        monthlyCount++;
      }
      if (a.appointment_date >= weekStartStr) {
        weekly += price;
        weeklyCount++;
      }
      if (a.appointment_date === todayStr) {
        daily += price;
        dailyCount++;
      }
    }

    // Contagem de clientes únicos (telefones distintos) que usaram o app
    const monthStart = monthStartStr;
    const todayPhones = new Set<string>();
    const monthPhones = new Set<string>();
    const allPhones = new Set<string>();
    for (const a of allAppointments) {
      if (!a.customer_phone) continue;
      allPhones.add(a.customer_phone);
      if (a.appointment_date >= monthStart) monthPhones.add(a.customer_phone);
      if (a.appointment_date === todayStr) todayPhones.add(a.customer_phone);
    }

    return {
      daily, dailyCount, weekly, weeklyCount, monthly, monthlyCount,
      clientsToday: todayPhones.size,
      clientsMonth: monthPhones.size,
      clientsTotal: allPhones.size,
    };
  }, [appointments, allAppointments, services]);

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Caixa</h2>
        </div>
        {isClosed ? (
          <span className="text-xs font-semibold bg-destructive/20 text-destructive border border-destructive/30 rounded-full px-3 py-1">
            Fechado
          </span>
        ) : (
          <span className="text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-3 py-1">
            Aberto
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Daily */}
        <div className="bg-background border border-border rounded-lg p-2 sm:p-3 text-center space-y-1 min-w-0">
          <Calendar className="w-4 h-4 text-primary mx-auto" />
          <p className="text-[10px] sm:text-xs text-muted-foreground">Hoje</p>
          <p className="text-sm sm:text-lg font-bold text-foreground break-all leading-tight">{formatCurrency(stats.daily)}</p>
          <p className="text-[10px] text-muted-foreground">{stats.dailyCount} serv.</p>
        </div>

        {/* Weekly */}
        <div className="bg-background border border-border rounded-lg p-2 sm:p-3 text-center space-y-1 min-w-0">
          <TrendingUp className="w-4 h-4 text-primary mx-auto" />
          <p className="text-[10px] sm:text-xs text-muted-foreground">Semana</p>
          <p className="text-sm sm:text-lg font-bold text-foreground break-all leading-tight">{formatCurrency(stats.weekly)}</p>
          <p className="text-[10px] text-muted-foreground">{stats.weeklyCount} serv.</p>
        </div>

        {/* Monthly */}
        <div className="bg-background border border-border rounded-lg p-2 sm:p-3 text-center space-y-1 min-w-0">
          <DollarSign className="w-4 h-4 text-primary mx-auto" />
          <p className="text-[10px] sm:text-xs text-muted-foreground">Mês</p>
          <p className="text-sm sm:text-lg font-bold text-foreground break-all leading-tight">{formatCurrency(stats.monthly)}</p>
          <p className="text-[10px] text-muted-foreground">{stats.monthlyCount} serv.</p>
        </div>
      </div>

      {isClosed && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          Caixa fechado automaticamente às 21:00. Reabre amanhã.
        </p>
      )}
    </div>
  );
};

export default CashRegister;
