import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Calendar, TrendingUp, Users } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { getBrazilTodayStr, getBrazilWeekStartStr, getBrazilMonthStartStr } from "@/lib/brazilTime";
import { useDataRefresh } from "@/lib/refreshBus";

type Appointment = Tables<"appointments">;
type CashEntry = { entry_date: string; kind: string; category: string; appointment_id: string | null };

const getSaoPauloNow = () => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
};

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CashRegister = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Pick<Appointment, "customer_phone" | "appointment_date">[]>([]);
  const [services, setServices] = useState<{ name: string; price: number }[]>([]);
  const [expensesMonth, setExpensesMonth] = useState(0);
  const [isClosed, setIsClosed] = useState(false);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("cash-register-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "cash_entries" }, () => fetchData())
      .subscribe();

    // Check closing time every minute
    const interval = setInterval(checkClosing, 60_000);
    checkClosing();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  useDataRefresh(["cash", "appointments"], () => fetchData());

  const fetchData = async () => {
    const [appts, allAppts, svcs, exp, cash] = await Promise.all([
      supabase.from("appointments").select("*").eq("status", "completed"),
      supabase.from("appointments").select("customer_phone, appointment_date"),
      supabase.from("services").select("name, price"),
      (supabase as any).from("expenses").select("amount, expense_date").gte("expense_date", getBrazilMonthStartStr()),
      (supabase as any).from("cash_entries").select("entry_date, kind, category, appointment_id").gte("entry_date", getBrazilMonthStartStr()),
    ]);
    if (appts.data) setAppointments(appts.data);
    if (allAppts.data) setAllAppointments(allAppts.data as any);
    if (svcs.data) setServices(svcs.data);
    if (exp.data) setExpensesMonth((exp.data as any[]).reduce((a, b) => a + Number(b.amount), 0));
    if (cash.data) setCashEntries((cash.data as CashEntry[]) || []);
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

    const todayServices = cashEntries.filter((e) => e.entry_date === todayStr && e.kind === "in" && e.category === "atendimento");
    const appToday = todayServices.filter((e) => !!e.appointment_id).length;
    const manualToday = todayServices.filter((e) => !e.appointment_id).length;

    return {
      daily, dailyCount, weekly, weeklyCount, monthly, monthlyCount,
      clientsToday: todayPhones.size,
      clientsMonth: monthPhones.size,
      clientsTotal: allPhones.size,
      appToday,
      manualToday,
      attendanceToday: appToday + manualToday,
    };
  }, [appointments, allAppointments, services, cashEntries]);

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

      <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2 sm:gap-3">
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

      <div className="mt-3 grid grid-cols-1 min-[360px]:grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-background border border-border rounded-lg p-2 sm:p-3 text-center space-y-1 min-w-0">
          <Users className="w-4 h-4 text-primary mx-auto" />
          <p className="text-[10px] sm:text-xs text-muted-foreground">Cliente hoje pelo APP</p>
          <p className="text-sm sm:text-lg font-bold text-foreground leading-tight">{stats.appToday}</p>
        </div>
        <div className="bg-background border border-border rounded-lg p-2 sm:p-3 text-center space-y-1 min-w-0">
          <Users className="w-4 h-4 text-primary mx-auto" />
          <p className="text-[10px] sm:text-xs text-muted-foreground">Cliente adicionado manualmente</p>
          <p className="text-sm sm:text-lg font-bold text-foreground leading-tight">{stats.manualToday}</p>
        </div>
        <div className="bg-background border border-border rounded-lg p-2 sm:p-3 text-center space-y-1 min-w-0">
          <Users className="w-4 h-4 text-primary mx-auto" />
          <p className="text-[10px] sm:text-xs text-muted-foreground">Atendimento total do dia</p>
          <p className="text-sm sm:text-lg font-bold text-primary leading-tight">{stats.attendanceToday}</p>
        </div>
      </div>

      <div className="mt-3 bg-background border border-border rounded-lg p-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground">Despesas do mês</p>
          <p className="text-sm font-bold text-destructive">- {formatCurrency(expensesMonth)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">Lucro líquido do mês</p>
          <p className={`text-lg font-bold ${stats.monthly - expensesMonth >= 0 ? "text-green-500" : "text-destructive"}`}>
            {formatCurrency(stats.monthly - expensesMonth)}
          </p>
        </div>
      </div>

      {isClosed && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          Caixa fechado automaticamente às 19:00 (fim do expediente). Reabre amanhã.
        </p>
      )}
    </div>
  );
};

export default CashRegister;
