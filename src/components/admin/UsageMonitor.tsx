import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Database, CheckCircle2 } from "lucide-react";

// Limites do plano gratuito Lovable Cloud / Supabase Free
const LIMITS = {
  dbSizeMB: 500,        // 500 MB de banco de dados
  rows: 50000,          // estimativa de linhas confortáveis no free
  monthlyAI: 1,         // $1 de IA grátis/mês
  monthlyCloud: 25,     // $25 de Cloud grátis/mês
};

type Counts = {
  appointments: number;
  loyalty: number;
  blocked: number;
  barbers: number;
  services: number;
};

const UsageMonitor = () => {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [appts, loyalty, blocked, barbers, services] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("loyalty").select("id", { count: "exact", head: true }),
        supabase.from("blocked_slots").select("id", { count: "exact", head: true }),
        supabase.from("barbers").select("id", { count: "exact", head: true }),
        supabase.from("services").select("id", { count: "exact", head: true }),
      ]);
      setCounts({
        appointments: appts.count || 0,
        loyalty: loyalty.count || 0,
        blocked: blocked.count || 0,
        barbers: barbers.count || 0,
        services: services.count || 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading || !counts) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-muted-foreground text-sm">Carregando uso do sistema...</p>
      </div>
    );
  }

  const totalRows =
    counts.appointments + counts.loyalty + counts.blocked + counts.barbers + counts.services;

  // Estimativa: cada linha ≈ 1 KB → tamanho aproximado
  const estimatedSizeMB = (totalRows * 1) / 1024;
  const dbPercent = Math.min(100, (estimatedSizeMB / LIMITS.dbSizeMB) * 100);
  const rowsPercent = Math.min(100, (totalRows / LIMITS.rows) * 100);

  const overallPercent = Math.max(dbPercent, rowsPercent);
  const isWarning = overallPercent >= 70;
  const isCritical = overallPercent >= 90;

  const statusColor = isCritical
    ? "text-destructive"
    : isWarning
    ? "text-yellow-500"
    : "text-green-500";

  const barColor = isCritical
    ? "bg-destructive"
    : isWarning
    ? "bg-yellow-500"
    : "bg-green-500";

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className={`w-5 h-5 ${statusColor}`} />
          <h3 className="font-bold text-foreground">Uso do Sistema (Plano Grátis)</h3>
        </div>
        {isCritical ? (
          <AlertTriangle className="w-5 h-5 text-destructive" />
        ) : isWarning ? (
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        )}
      </div>

      {/* Barra principal */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Capacidade total</span>
          <span className={`font-bold ${statusColor}`}>{overallPercent.toFixed(1)}%</span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-500`}
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      </div>

      {/* Detalhes */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-background/50 rounded-lg p-3">
          <p className="text-muted-foreground text-xs">Banco de dados</p>
          <p className="font-bold text-foreground">
            ~{estimatedSizeMB.toFixed(2)} MB / {LIMITS.dbSizeMB} MB
          </p>
          <p className="text-xs text-muted-foreground mt-1">{dbPercent.toFixed(1)}% usado</p>
        </div>
        <div className="bg-background/50 rounded-lg p-3">
          <p className="text-muted-foreground text-xs">Registros totais</p>
          <p className="font-bold text-foreground">
            {totalRows.toLocaleString("pt-BR")} / {LIMITS.rows.toLocaleString("pt-BR")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{rowsPercent.toFixed(1)}% usado</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-3">
        <div className="flex justify-between">
          <span>📅 Agendamentos</span>
          <span className="font-mono">{counts.appointments}</span>
        </div>
        <div className="flex justify-between">
          <span>🏆 Fidelidade</span>
          <span className="font-mono">{counts.loyalty}</span>
        </div>
        <div className="flex justify-between">
          <span>⛔ Bloqueios</span>
          <span className="font-mono">{counts.blocked}</span>
        </div>
        <div className="flex justify-between">
          <span>💈 Barbeiros</span>
          <span className="font-mono">{counts.barbers}</span>
        </div>
        <div className="flex justify-between">
          <span>✂️ Serviços</span>
          <span className="font-mono">{counts.services}</span>
        </div>
      </div>

      {/* Aviso */}
      {isCritical && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
          <p className="text-destructive text-xs font-bold">
            ⚠️ ATENÇÃO: uso acima de 90%! Faça upgrade do plano em breve para não perder dados ou parar o sistema.
          </p>
        </div>
      )}
      {isWarning && !isCritical && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <p className="text-yellow-600 dark:text-yellow-400 text-xs font-bold">
            ⚡ Aviso: uso acima de 70%. Considere fazer limpeza de agendamentos antigos ou planejar upgrade.
          </p>
        </div>
      )}
      {!isWarning && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
          <p className="text-green-600 dark:text-green-400 text-xs">
            ✅ Tudo certo! Sistema com bastante espaço livre.
          </p>
        </div>
      )}
    </div>
  );
};

export default UsageMonitor;
