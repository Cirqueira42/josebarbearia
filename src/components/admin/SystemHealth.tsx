import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, BellRing, Check } from "lucide-react";
import { getBrazilTodayStr } from "@/lib/brazilTime";
import { useAdminAnalytics, fmtDate, periodRange, completedIn, inRange } from "@/lib/adminAnalytics";
import { upcomingHolidays } from "@/lib/holidays";

type Issue = {
  id: string;
  level: "info" | "warn" | "error";
  title: string;
  where: string;
  impact: string;
  action: string;
};

const READ_KEY = "admin-read-notifications";
const loadRead = (): string[] => {
  try { return JSON.parse(localStorage.getItem(READ_KEY) || "[]"); } catch { return []; }
};

/**
 * Central de notificações + saúde do sistema.
 * Somente LEITURA e diagnóstico: nada é apagado ou corrigido automaticamente.
 */
const SystemHealth = () => {
  const { appts, entries, services, loading } = useAdminAnalytics();
  const [read, setRead] = useState<string[]>(loadRead);
  const [showHistory, setShowHistory] = useState(false);
  const [rewards, setRewards] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [r, c] = await Promise.all([
        (supabase as any).from("loyalty_rewards").select("id, customer_name, customer_phone, status, created_at").eq("status", "active"),
        (supabase as any).from("coupons").select("code, active, valid_until, max_uses, uses_count"),
      ]);
      setRewards(r.data || []);
      setCoupons(c.data || []);
    })();
  }, []);

  const markRead = (id: string) => {
    const next = [...new Set([...read, id])];
    setRead(next);
    try { localStorage.setItem(READ_KEY, JSON.stringify(next)); } catch {}
  };

  const issues = useMemo<Issue[]>(() => {
    const list: Issue[] = [];
    const today = getBrazilTodayStr();

    // 1. atendimentos concluídos sem lançamento no caixa
    const paidIds = new Set(entries.filter((e) => e.appointment_id).map((e) => e.appointment_id));
    const missing = appts.filter((a) => a.status === "completed" && !paidIds.has(a.id));
    if (missing.length > 0) {
      list.push({
        id: `cash-missing-${missing.length}`,
        level: "warn",
        title: `${missing.length} atendimento(s) concluído(s) sem lançamento no caixa`,
        where: "Agendamentos concluídos × Caixa",
        impact: "O faturamento bruto pode ficar menor que o real.",
        action: "Lance manualmente no Caixa (Entradas) apenas os que realmente foram pagos. Nada é lançado automaticamente aqui.",
      });
    }

    // 2. lançamentos duplicados para o mesmo atendimento
    const countById: Record<string, number> = {};
    entries.forEach((e) => { if (e.appointment_id) countById[e.appointment_id] = (countById[e.appointment_id] || 0) + 1; });
    const dupl = Object.values(countById).filter((n) => n > 1).length;
    if (dupl > 0) {
      list.push({
        id: `cash-dup-${dupl}`,
        level: "error",
        title: `${dupl} atendimento(s) com mais de um lançamento no caixa`,
        where: "Caixa / Fluxo de caixa",
        impact: "Faturamento contado em dobro.",
        action: "Revise no Caixa e apague apenas o lançamento repetido.",
      });
    }

    // 3. serviços sem preço
    const noPrice = services.filter((s) => !s.price || s.price <= 0);
    if (noPrice.length > 0) {
      list.push({
        id: `svc-noprice-${noPrice.map((s) => s.name).join("|")}`,
        level: "warn",
        title: `${noPrice.length} serviço(s) sem preço cadastrado`,
        where: `Serviços: ${noPrice.map((s) => s.name).join(", ")}`,
        impact: "Esses atendimentos não somam faturamento nem entram no ticket médio.",
        action: "Defina o preço em Gerenciar Serviços.",
      });
    }

    // 4. clientes possivelmente duplicados (mesmo nome, telefones diferentes)
    const byName: Record<string, Set<string>> = {};
    appts.forEach((a) => {
      const n = a.customer_name.trim().toLowerCase();
      (byName[n] ||= new Set()).add(a.customer_phone);
    });
    const dupNames = Object.entries(byName).filter(([, set]) => set.size > 1);
    if (dupNames.length > 0) {
      list.push({
        id: `client-dup-${dupNames.length}`,
        level: "info",
        title: `${dupNames.length} cliente(s) com mesmo nome e telefones diferentes`,
        where: `Ex.: ${dupNames.slice(0, 3).map(([n]) => n).join(", ")}`,
        impact: "Podem ser pessoas diferentes ou cadastro duplicado (afeta contagem de clientes únicos e fidelidade).",
        action: "Confira no painel de Clientes. Nenhum cadastro foi alterado.",
      });
    }

    // 5. agendamentos antigos ainda pendentes
    const stale = appts.filter((a) => (a.status === "pending" || a.status === "confirmed") && a.appointment_date < today);
    if (stale.length > 0) {
      list.push({
        id: `stale-${stale.length}`,
        level: "warn",
        title: `${stale.length} agendamento(s) de datas passadas ainda em aberto`,
        where: "Lista de agendamentos",
        impact: "Distorce o aproveitamento da agenda e o faturamento.",
        action: "Marque como Concluído ou Cancelado.",
      });
    }

    // 6. vales de fidelidade ativos aguardando uso
    if (rewards.length > 0) {
      list.push({
        id: `rewards-${rewards.length}`,
        level: "info",
        title: `${rewards.length} código(s) de fidelidade liberado(s) e ainda não usado(s)`,
        where: "Códigos de Fidelidade",
        impact: "Cliente já tem direito ao desconto de R$ 7.",
        action: `Enviar ao cliente: ${rewards.slice(0, 3).map((r: any) => r.customer_name || r.customer_phone).join(", ")}`,
      });
    }

    // 7. cupons com problema
    const badCoupons = coupons.filter((c: any) =>
      c.active && ((c.valid_until && c.valid_until < today) || (c.max_uses && c.uses_count >= c.max_uses)),
    );
    if (badCoupons.length > 0) {
      list.push({
        id: `coupon-${badCoupons.map((c: any) => c.code).join("|")}`,
        level: "warn",
        title: `${badCoupons.length} cupom(ns) ativos mas expirados ou esgotados`,
        where: `Cupons: ${badCoupons.map((c: any) => c.code).join(", ")}`,
        impact: "O cliente vê o cupom como ativo, mas ele será recusado na validação.",
        action: "Desative ou atualize a validade em Cupons. (Nada foi alterado automaticamente.)",
      });
    }

    // 8. meta do mês
    const gMonth = entries.filter((e) => e.kind === "in" && inRange(e.entry_date, periodRange("month"))).reduce((s, e) => s + e.amount, 0);
    if (gMonth === 0 && completedIn(appts, periodRange("month")).length > 0) {
      list.push({
        id: "no-cash-month",
        level: "error",
        title: "Há atendimentos concluídos no mês, mas nenhuma entrada no caixa",
        where: "Caixa do mês",
        impact: "Faturamento bruto aparece zerado.",
        action: "Verifique os lançamentos do Caixa.",
      });
    }

    // 9. feriados próximos
    upcomingHolidays(today, 30).forEach((h) => {
      list.push({
        id: `holiday-${h.date}`,
        level: "info",
        title: `⚠️ FERIADO — ${h.name} (${fmtDate(h.date)})`,
        where: "Agenda",
        impact: "Ser feriado não fecha a agenda automaticamente.",
        action: "Se não for trabalhar, use o bloqueio de horários/dias já existente no painel.",
      });
    });

    return list;
  }, [appts, entries, services, rewards, coupons]);

  const pending = issues.filter((i) => !read.includes(i.id));
  const history = issues.filter((i) => read.includes(i.id));

  const levelCls = {
    info: "border-blue-500/30 bg-blue-500/10",
    warn: "border-yellow-500/30 bg-yellow-500/10",
    error: "border-red-500/30 bg-red-500/10",
  };

  return (
    <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <BellRing className="w-5 h-5 text-primary" />
        <h2 className="text-base sm:text-lg font-bold">Notificações e Pendências</h2>
        {pending.length > 0 && (
          <span className="ml-auto text-[10px] bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-bold">
            {pending.length}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Verificando o sistema...</p>
      ) : pending.length === 0 ? (
        <p className="text-xs text-green-500">✓ Nenhuma pendência aberta. Sistema conferido.</p>
      ) : (
        <div className="space-y-2">
          {pending.map((i) => (
            <div key={i.id} className={`border rounded p-2 ${levelCls[i.level]}`}>
              <p className="text-[11px] font-bold flex items-start gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {i.title}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Onde: {i.where}</p>
              <p className="text-[10px] text-muted-foreground">Consequência: {i.impact}</p>
              <p className="text-[10px] text-muted-foreground">Sugestão: {i.action}</p>
              <Button size="sm" variant="outline" className="h-6 mt-1.5 text-[10px]" onClick={() => markRead(i.id)}>
                <Check className="w-3 h-3 mr-1" /> Confirmar que li
              </Button>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-3">
          <button onClick={() => setShowHistory((v) => !v)} className="text-[10px] text-muted-foreground underline">
            {showHistory ? "Ocultar" : "Ver"} histórico de notificações lidas ({history.length})
          </button>
          {showHistory && (
            <div className="mt-1.5 space-y-1">
              {history.map((i) => (
                <p key={i.id} className="text-[10px] text-muted-foreground bg-background/40 rounded px-2 py-1">✓ {i.title}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SystemHealth;
