import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";
import { getBrazilMonthStartStr } from "@/lib/brazilTime";
import { useDataRefresh } from "@/lib/refreshBus";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const BarberRevenue = () => {
  const [appts, setAppts] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<{ name: string; price: number }[]>([]);

  const load = async () => {
      const [a, b, s] = await Promise.all([
        supabase.from("appointments").select("service_name, barber_name, appointment_date, status").eq("status", "completed").gte("appointment_date", getBrazilMonthStartStr()),
        (supabase as any).from("barbers").select("name, commission_percent, is_active"),
        supabase.from("services").select("name, price"),
      ]);
      setAppts(a.data || []);
      setBarbers((b.data as any) || []);
      setServices(s.data || []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("br-rt").on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useDataRefresh(["cash", "appointments"], load);

  const rows = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const a of appts) {
      const name = a.barber_name || "José Gilmário";
      const price = services.find(s => s.name.toLowerCase() === a.service_name.toLowerCase())?.price || 0;
      if (!map[name]) map[name] = { count: 0, total: 0 };
      map[name].count++;
      map[name].total += price;
    }
    return Object.entries(map).map(([name, v]) => {
      const b = barbers.find(x => x.name === name);
      const pct = b?.commission_percent ?? 100;
      return { name, count: v.count, total: v.total, pct, commission: v.total * pct / 100 };
    }).sort((a, b) => b.total - a.total);
  }, [appts, services, barbers]);

  return (
    <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="text-base sm:text-lg font-bold">Faturamento por Barbeiro (mês)</h2>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Sem dados no mês.</p>}
        {rows.map(r => (
          <div key={r.name} className="bg-background/60 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold truncate">{r.name}</span>
              <span className="text-xs text-muted-foreground">{r.count} atend.</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground">Faturado</p>
                <p className="font-bold text-primary">{fmt(r.total)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Comissão ({r.pct}%)</p>
                <p className="font-bold text-green-500">{fmt(r.commission)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">% de comissão configurável em "Gerenciar Barbeiros".</p>
    </div>
  );
};

export default BarberRevenue;
