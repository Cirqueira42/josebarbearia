import { supabase } from "@/integrations/supabase/client";

/**
 * Fonte única de classificação dos dados do negócio.
 * Regras (não duplicar valores):
 *  - Faturamento bruto  = cash_entries.kind = 'in'
 *  - Serviços           = entradas com category 'atendimento'
 *  - Produtos           = entradas com category 'produto'
 *  - Atendimento por agendamento = entrada de serviço COM appointment_id
 *  - Atendimento manual = entrada de serviço SEM appointment_id
 *  - Venda de produto NUNCA conta como atendimento
 */

export type RawEntry = {
  id: string;
  entry_date: string;
  kind: string;
  amount: number | string;
  category: string;
  description: string;
  appointment_id: string | null;
  created_at?: string;
};

export const isIn = (e: RawEntry) => e.kind === "in";
export const isService = (e: RawEntry) => isIn(e) && e.category === "atendimento";
export const isProduct = (e: RawEntry) => isIn(e) && e.category === "produto";
export const isScheduled = (e: RawEntry) => isService(e) && !!e.appointment_id;
export const isManual = (e: RawEntry) => isService(e) && !e.appointment_id;

export const num = (v: unknown) => Number(v || 0);

export type Totals = {
  gross: number;
  services: number;
  products: number;
  out: number;
  scheduledCount: number;
  manualCount: number;
  attendances: number;
  ticket: number;
};

export const totalsOf = (entries: RawEntry[]): Totals => {
  const gross = entries.filter(isIn).reduce((s, e) => s + num(e.amount), 0);
  const services = entries.filter(isService).reduce((s, e) => s + num(e.amount), 0);
  const products = entries.filter(isProduct).reduce((s, e) => s + num(e.amount), 0);
  const out = entries.filter((e) => e.kind === "out").reduce((s, e) => s + num(e.amount), 0);
  const scheduledCount = entries.filter(isScheduled).length;
  const manualCount = entries.filter(isManual).length;
  const attendances = scheduledCount + manualCount;
  return {
    gross,
    services,
    products,
    out,
    scheduledCount,
    manualCount,
    attendances,
    ticket: attendances > 0 ? services / attendances : 0,
  };
};

export const monthBounds = (year: number, month: number) => {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endY = month === 12 ? year + 1 : year;
  const endM = month === 12 ? 1 : month + 1;
  const nextStart = `${endY}-${String(endM).padStart(2, "0")}-01`;
  const end = new Date(new Date(nextStart + "T12:00:00").getTime() - 86400000)
    .toISOString()
    .slice(0, 10);
  return { start, end };
};

const topOf = (map: Record<string, number>) => {
  const list = Object.entries(map).sort((a, b) => b[1] - a[1]);
  return list.length ? list[0][0] : null;
};

/**
 * Consolida (e preserva permanentemente) o resumo de um mês.
 * Usado antes de qualquer limpeza de registros detalhados.
 */
export const consolidateMonth = async (year: number, month: number, goal = 0) => {
  const { start, end } = monthBounds(year, month);

  const [{ data: entriesData }, { data: apptsData }, { data: salesData }] = await Promise.all([
    (supabase as any)
      .from("cash_entries")
      .select("id, entry_date, kind, amount, category, description, appointment_id")
      .gte("entry_date", start)
      .lte("entry_date", end),
    supabase
      .from("appointments")
      .select("customer_phone, customer_name, service_name, status, appointment_date")
      .gte("appointment_date", start)
      .lte("appointment_date", end),
    (supabase as any)
      .from("product_sales")
      .select("product_name, qty, total, sale_date")
      .gte("sale_date", start)
      .lte("sale_date", end),
  ]);

  const entries = ((entriesData as RawEntry[]) || []).map((e) => ({ ...e, amount: num(e.amount) }));
  const t = totalsOf(entries);

  const completed = (apptsData || []).filter((a: any) => a.status === "completed");
  const phones = new Set(completed.map((a: any) => (a.customer_phone || "").replace(/\D/g, "")));
  const serviceMap: Record<string, number> = {};
  completed.forEach((a: any) => {
    serviceMap[a.service_name] = (serviceMap[a.service_name] || 0) + 1;
  });

  const productMap: Record<string, number> = {};
  let productsQty = 0;
  ((salesData as any[]) || []).forEach((s) => {
    productMap[s.product_name] = (productMap[s.product_name] || 0) + Number(s.qty || 0);
    productsQty += Number(s.qty || 0);
  });

  const payload = {
    year,
    month,
    gross_total: t.gross,
    services_total: t.services,
    products_total: t.products,
    out_total: t.out,
    appointments_count: t.scheduledCount,
    manual_count: t.manualCount,
    products_qty: productsQty,
    unique_clients: phones.size,
    visits: completed.length,
    ticket_avg: t.ticket,
    top_service: topOf(serviceMap),
    top_product: topOf(productMap),
    goal,
    updated_at: new Date().toISOString(),
  };

  const { error } = await (supabase as any)
    .from("monthly_summaries")
    .upsert(payload, { onConflict: "year,month" });

  return { error, payload };
};

/** Consolida todos os meses que possuem dados entre duas datas (inclusive). */
export const consolidateRange = async (startDate: string, endDate: string, goal = 0) => {
  const [sy, sm] = startDate.split("-").map(Number);
  const [ey, em] = endDate.split("-").map(Number);
  let y = sy;
  let m = sm;
  const done: string[] = [];
  while (y < ey || (y === ey && m <= em)) {
    await consolidateMonth(y, m, goal);
    done.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
    if (done.length > 120) break;
  }
  return done;
};
