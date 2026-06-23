import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, History } from "lucide-react";

type Row = { id: string; appointment_date: string; appointment_time: string; service_name: string; status: string };

const CustomerHistory = () => {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [info, setInfo] = useState<{ name: string; phone: string; favorite: string; lastDate?: string; completed: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const digits = query.replace(/\D/g, "");
    let q = supabase.from("appointments").select("id, appointment_date, appointment_time, service_name, status, customer_name, customer_phone").order("appointment_date", { ascending: false });
    q = digits.length >= 4 ? q.eq("customer_phone", digits) : q.ilike("customer_name", `%${query}%`);
    const { data } = await q.limit(50);
    setLoading(false);
    if (!data || data.length === 0) { setRows([]); setInfo(null); return; }
    const counts: Record<string, number> = {};
    const completed = data.filter((a: any) => a.status === "completed");
    completed.forEach((a: any) => { counts[a.service_name] = (counts[a.service_name] || 0) + 1; });
    const favorite = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    setInfo({
      name: (data[0] as any).customer_name,
      phone: (data[0] as any).customer_phone,
      favorite,
      lastDate: completed[0]?.appointment_date,
      completed: completed.length,
    });
    setRows(data as any);
  };

  return (
    <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-5 h-5 text-primary" />
        <h2 className="text-base sm:text-lg font-bold">Histórico do Cliente</h2>
      </div>
      <div className="flex gap-2 mb-3">
        <Input placeholder="Nome ou telefone" value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()} className="h-9 text-sm" />
        <Button onClick={search} size="sm" disabled={loading}><Search className="w-4 h-4" /></Button>
      </div>
      {info && (
        <div className="bg-background/60 rounded p-2 mb-2 text-xs space-y-0.5">
          <p><b>{info.name}</b> · {info.phone}</p>
          <p>Atendimentos concluídos: <b>{info.completed}</b></p>
          <p>Serviço favorito: <b>{info.favorite}</b></p>
          {info.lastDate && <p>Último: <b>{new Date(info.lastDate + "T12:00:00").toLocaleDateString("pt-BR")}</b></p>}
        </div>
      )}
      {rows && rows.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Nenhum agendamento encontrado.</p>}
      {rows && rows.length > 0 && (
        <div className="space-y-1 max-h-60 overflow-auto">
          {rows.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-xs bg-background/40 rounded px-2 py-1">
              <span>{new Date(r.appointment_date + "T12:00:00").toLocaleDateString("pt-BR")} {r.appointment_time}</span>
              <span className="truncate flex-1 mx-2">{r.service_name}</span>
              <span className={r.status === "completed" ? "text-green-500" : r.status === "cancelled" ? "text-red-500" : "text-yellow-500"}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerHistory;
