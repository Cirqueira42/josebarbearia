import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Calendar, TrendingUp, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getBrazilTodayStr, getBrazilWeekStartStr, getBrazilMonthStartStr } from "@/lib/brazilTime";

type Appointment = {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  appointment_number: number | null;
  barber_name: string | null;
  status: string;
};

type Service = { name: string; price: number };

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  completed: "Concluído",
};

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ReportsHistory = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [filterPeriod, setFilterPeriod] = useState("month");
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [appts, svcs] = await Promise.all([
      supabase.from("appointments").select("*").order("appointment_date", { ascending: false }).order("appointment_time", { ascending: false }),
      supabase.from("services").select("name, price"),
    ]);
    if (appts.data) setAppointments(appts.data as Appointment[]);
    if (svcs.data) setServices(svcs.data);
  };

  const getPrice = (serviceName: string): number => {
    const svc = services.find((s) => s.name.toLowerCase() === serviceName.toLowerCase());
    return svc?.price ?? 0;
  };

  const todayStr = getBrazilTodayStr();

  const filteredAppointments = useMemo(() => {
    let startDate = "";
    if (filterPeriod === "today") startDate = todayStr;
    else if (filterPeriod === "week") {
      startDate = getBrazilWeekStartStr();
    } else if (filterPeriod === "month") {
      startDate = getBrazilMonthStartStr();
    } else if (filterPeriod === "year") {
      startDate = `${todayStr.slice(0, 4)}-01-01`;
    }

    return appointments.filter((a) => {
      if (startDate && a.appointment_date < startDate) return false;
      if (filterDate && a.appointment_date !== filterDate) return false;
      return true;
    });
  }, [appointments, filterPeriod, filterDate]);

  const stats = useMemo(() => {
    const completed = filteredAppointments.filter((a) => a.status === "completed");
    const revenue = completed.reduce((sum, a) => sum + getPrice(a.service_name), 0);
    const uniqueClients = new Set(completed.map((a) => a.customer_phone)).size;

    // Service breakdown
    const serviceMap: Record<string, { count: number; revenue: number }> = {};
    for (const a of completed) {
      const p = getPrice(a.service_name);
      if (!serviceMap[a.service_name]) serviceMap[a.service_name] = { count: 0, revenue: 0 };
      serviceMap[a.service_name].count++;
      serviceMap[a.service_name].revenue += p;
    }

    // Daily chart data (last 30 days)
    const dailyMap: Record<string, number> = {};
    for (const a of completed) {
      dailyMap[a.appointment_date] = (dailyMap[a.appointment_date] || 0) + getPrice(a.service_name);
    }
    const chartData = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, value]) => ({
        date: `${date.split("-")[2]}/${date.split("-")[1]}`,
        valor: value,
      }));

    return { total: filteredAppointments.length, completed: completed.length, revenue, uniqueClients, serviceMap, chartData };
  }, [filteredAppointments, services]);

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Relatórios & Histórico</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Select value={filterPeriod} onValueChange={(v) => { setFilterPeriod(v); setFilterDate(""); }}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="year">Este ano</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input type="date" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setFilterPeriod("all"); }} className="w-full sm:w-44" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <div className="bg-background border border-border rounded-lg p-2 sm:p-3 text-center min-w-0">
          <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Agendamentos</p>
        </div>
        <div className="bg-background border border-border rounded-lg p-2 sm:p-3 text-center min-w-0">
          <p className="text-xl sm:text-2xl font-bold text-green-400">{stats.completed}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Concluídos</p>
        </div>
        <div className="bg-background border border-border rounded-lg p-2 sm:p-3 text-center min-w-0">
          <p className="text-base sm:text-2xl font-bold text-primary break-all leading-tight">{formatCurrency(stats.revenue)}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Faturamento</p>
        </div>
        <div className="bg-background border border-border rounded-lg p-2 sm:p-3 text-center min-w-0">
          <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.uniqueClients}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Clientes</p>
        </div>
      </div>

      {/* Chart */}
      {stats.chartData.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Faturamento diário (últimos 30 dias)</p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Faturamento"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Service breakdown */}
      {Object.keys(stats.serviceMap).length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Por serviço</p>
          <div className="space-y-2">
            {Object.entries(stats.serviceMap)
              .sort(([, a], [, b]) => b.count - a.count)
              .map(([name, data]) => (
                <div key={name} className="flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground">{data.count} atendimento(s)</p>
                  </div>
                  <p className="text-sm font-bold text-primary">{formatCurrency(data.revenue)}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Full history */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Histórico ({filteredAppointments.length} registros)</p>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {filteredAppointments.slice(0, 50).map((a) => (
            <div key={a.id} className="flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {a.appointment_number && (
                    <span className="text-xs font-mono text-primary">#{a.appointment_number}</span>
                  )}
                  <p className="text-sm font-medium text-foreground truncate">{a.customer_name}</p>
                </div>
                <p className="text-xs text-muted-foreground">{a.service_name} • {new Date(a.appointment_date + "T12:00:00").toLocaleDateString("pt-BR")} às {a.appointment_time}</p>
                {a.barber_name && <p className="text-[10px] text-muted-foreground">💈 {a.barber_name}</p>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                a.status === "completed" ? "bg-green-500/20 text-green-400" :
                a.status === "confirmed" ? "bg-blue-500/20 text-blue-400" :
                a.status === "cancelled" ? "bg-red-500/20 text-red-400" :
                "bg-yellow-500/20 text-yellow-400"
              }`}>
                {statusLabels[a.status] || a.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportsHistory;
