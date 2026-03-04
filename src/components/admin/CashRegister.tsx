import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Calendar, TrendingUp } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Appointment = Tables<"appointments">;

const getSaoPauloNow = () => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
};

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CashRegister = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
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
    const [appts, svcs] = await Promise.all([
      supabase.from("appointments").select("*").eq("status", "completed"),
      supabase.from("services").select("name, price"),
    ]);
    if (appts.data) setAppointments(appts.data);
    if (svcs.data) setServices(svcs.data);
  };

  const checkClosing = () => {
    const now = getSaoPauloNow();
    // Auto-close after 21:00 (9 PM)
    setIsClosed(now.getHours() >= 21);
  };

  const getPrice = (serviceName: string): number => {
    const svc = services.find((s) => s.name.toLowerCase() === serviceName.toLowerCase());
    return svc?.price ?? 0;
  };

  const stats = useMemo(() => {
    const now = getSaoPauloNow();
    const todayStr = now.toISOString().split("T")[0];

    // Start of current week (Monday)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    const weekStartStr = monday.toISOString().split("T")[0];

    // Start of current month
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

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

    return { daily, dailyCount, weekly, weeklyCount, monthly, monthlyCount };
  }, [appointments, services]);

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

      <div className="grid grid-cols-3 gap-3">
        {/* Daily */}
        <div className="bg-background border border-border rounded-lg p-3 text-center space-y-1">
          <Calendar className="w-4 h-4 text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Hoje</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(stats.daily)}</p>
          <p className="text-[10px] text-muted-foreground">{stats.dailyCount} serviço(s)</p>
        </div>

        {/* Weekly */}
        <div className="bg-background border border-border rounded-lg p-3 text-center space-y-1">
          <TrendingUp className="w-4 h-4 text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Semana</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(stats.weekly)}</p>
          <p className="text-[10px] text-muted-foreground">{stats.weeklyCount} serviço(s)</p>
        </div>

        {/* Monthly */}
        <div className="bg-background border border-border rounded-lg p-3 text-center space-y-1">
          <DollarSign className="w-4 h-4 text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Mês</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(stats.monthly)}</p>
          <p className="text-[10px] text-muted-foreground">{stats.monthlyCount} serviço(s)</p>
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
