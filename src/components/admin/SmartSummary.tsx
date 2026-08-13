import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";
import { getBrazilTodayStr } from "@/lib/brazilTime";
import {
  useAdminAnalytics, fmtBR, grossIn, completedIn, periodRange, inRange, WEEKDAYS_PT, weekdayOf,
} from "@/lib/adminAnalytics";
import { upcomingHolidays } from "@/lib/holidays";

/** Frases geradas SOMENTE a partir de dados reais já existentes no sistema. */
const SmartSummary = () => {
  const { appts, entries, services, loading } = useAdminAnalytics();
  const [goal, setGoal] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "monthly_revenue_goal").maybeSingle();
      setGoal(Number(data?.value ?? 0));
    })();
  }, []);

  const lines = useMemo(() => {
    const out: string[] = [];
    const today = getBrazilTodayStr();
    const rMonth = periodRange("month");
    const rLast = periodRange("lastmonth");
    const gMonth = grossIn(entries, rMonth);
    const gLast = grossIn(entries, rLast);
    const doneMonth = completedIn(appts, rMonth);
    const doneLast = completedIn(appts, rLast);

    if (gMonth <= 0 && doneMonth.length === 0) {
      return ["Ainda não há movimento suficiente neste mês para gerar análises."];
    }

    if (gLast > 0) {
      const diff = ((gMonth - gLast) / gLast) * 100;
      out.push(
        diff >= 0
          ? `Seu faturamento está ${diff.toFixed(0)}% acima do mês anterior (${fmtBR(gMonth)} contra ${fmtBR(gLast)}).`
          : `Seu faturamento está ${Math.abs(diff).toFixed(0)}% abaixo do mês anterior (${fmtBR(gMonth)} contra ${fmtBR(gLast)}).`,
      );
    }

    // dia mais forte (mês)
    const byDay: Record<number, number> = {};
    doneMonth.forEach((a) => { const w = weekdayOf(a.appointment_date); byDay[w] = (byDay[w] || 0) + 1; });
    const bestDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
    if (bestDay) out.push(`${WEEKDAYS_PT[Number(bestDay[0])]} é atualmente seu dia com maior número de atendimentos (${bestDay[1]} no mês).`);

    // serviço mais feito
    const bySvc: Record<string, number> = {};
    doneMonth.forEach((a) => { bySvc[a.service_name] = (bySvc[a.service_name] || 0) + 1; });
    const topSvc = Object.entries(bySvc).sort((a, b) => b[1] - a[1])[0];
    if (topSvc) out.push(`O serviço mais realizado neste mês foi ${topSvc[0]} (${topSvc[1]}x).`);

    // ticket médio
    const tkNow = doneMonth.length ? gMonth / doneMonth.length : 0;
    const tkPrev = doneLast.length ? gLast / doneLast.length : 0;
    if (tkNow > 0 && tkPrev > 0) {
      out.push(
        tkNow >= tkPrev
          ? `Seu ticket médio subiu para ${fmtBR(tkNow)} (antes ${fmtBR(tkPrev)}).`
          : `Seu ticket médio caiu para ${fmtBR(tkNow)} (antes ${fmtBR(tkPrev)}).`,
      );
    } else if (tkNow > 0) {
      out.push(`Seu ticket médio no mês é de ${fmtBR(tkNow)}.`);
    }

    // meta
    if (goal > 0) {
      const [y, m, dd] = today.split("-").map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();
      const remaining = Math.max(1, daysInMonth - dd);
      const need = Math.max(0, goal - gMonth) / remaining;
      out.push(
        gMonth >= goal
          ? `Meta de ${fmtBR(goal)} já atingida neste mês. 🎉`
          : `Você precisa faturar aproximadamente ${fmtBR(need)} por dia nos ${remaining} dias restantes para atingir a meta.`,
      );
    }

    // aproveitamento da agenda
    const allMonth = appts.filter((a) => inRange(a.appointment_date, rMonth));
    if (allMonth.length > 0) {
      const rate = (doneMonth.length / allMonth.length) * 100;
      out.push(`Sua agenda está com ${rate.toFixed(0)}% de aproveitamento no mês.`);
    }

    // clientes perto de retornar
    const doneAll = appts.filter((a) => a.status === "completed");
    const byPhone: Record<string, string[]> = {};
    doneAll.forEach((a) => { (byPhone[a.customer_phone] ||= []).push(a.appointment_date); });
    let near = 0;
    Object.values(byPhone).forEach((dates) => {
      const s = dates.sort();
      if (s.length < 2) return;
      let sum = 0;
      for (let i = 1; i < s.length; i++) sum += (new Date(s[i]).getTime() - new Date(s[i - 1]).getTime()) / 86400000;
      const avg = sum / (s.length - 1);
      const since = (new Date(today).getTime() - new Date(s[s.length - 1]).getTime()) / 86400000;
      if (since >= avg - 3) near++;
    });
    if (near > 0) out.push(`${near} cliente(s) estão no período em que costumam retornar.`);

    const hol = upcomingHolidays(today, 20)[0];
    if (hol) out.push(`⚠️ Feriado próximo: ${new Date(hol.date + "T12:00:00").toLocaleDateString("pt-BR")} — ${hol.name}. Decida se vai trabalhar ou bloquear a agenda.`);

    return out;
  }, [appts, entries, services, goal]);

  return (
    <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-base sm:text-lg font-bold">Resumo Inteligente da Barbearia</h2>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : (
        <ul className="space-y-1.5">
          {lines.map((l, i) => (
            <li key={i} className="text-[11px] sm:text-xs bg-background/50 rounded px-2 py-1.5 leading-snug">• {l}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SmartSummary;
