import { supabase } from "@/integrations/supabase/client";

export const GOAL = 10;
// Valor mínimo do serviço para contar na fidelidade
export const MIN_VALUE = 30;

const getServicePrice = async (serviceName: string): Promise<number> => {
  const { data } = await supabase
    .from("services")
    .select("price")
    .eq("name", serviceName)
    .maybeSingle();
  return Number((data as any)?.price ?? 0);
};

// Conta um atendimento na fidelidade. Qualquer serviço a partir de R$ 30 e no máximo 1 por dia.
// Somente atendimentos realmente concluídos chamam esta função.
export const updateLoyalty = async (
  customerPhone: string,
  customerName: string,
  serviceName: string,
  appointmentDate: string,
  currentId: string,
  servicePrice?: number,
) => {
  const phone = (customerPhone || "").replace(/\D/g, "");
  if (!phone) return;

  const price = typeof servicePrice === "number" ? servicePrice : await getServicePrice(serviceName);
  if (price < MIN_VALUE) return;

  // Máximo 1 estrela por dia por cliente
  const { data: sameDay } = await supabase
    .from("appointments")
    .select("id")
    .eq("customer_phone", phone)
    .eq("appointment_date", appointmentDate)
    .eq("status", "completed")
    .neq("id", currentId);

  if ((sameDay || []).length > 0) return;

  const { data: existing } = await supabase
    .from("loyalty")
    .select("*")
    .eq("customer_phone", phone)
    .maybeSingle();

  if (existing) {
    const newTotal = ((existing as any).total_services || 0) + 1;
    await supabase
      .from("loyalty")
      .update({
        total_services: newTotal,
        free_services_earned: Math.floor(newTotal / GOAL),
        customer_name: customerName,
        updated_at: new Date().toISOString(),
      })
      .eq("customer_phone", phone);
  } else {
    await supabase.from("loyalty").insert({
      customer_phone: phone,
      customer_name: customerName,
      total_services: 1,
      free_services_earned: 0,
      free_services_redeemed: 0,
    });
  }

  // Gera o código exclusivo se o cliente bateu a meta
  const { data: issued } = await (supabase as any).rpc("issue_loyalty_rewards", {
    _phone: phone,
    _name: customerName,
  });
  return (issued as number) || 0;
};

// Cancelamento/exclusão de um atendimento concluído remove a estrela.
export const revertLoyalty = async (customerPhone: string) => {
  const phone = (customerPhone || "").replace(/\D/g, "");
  if (!phone) return;
  const { data: existing } = await supabase
    .from("loyalty")
    .select("*")
    .eq("customer_phone", phone)
    .maybeSingle();
  if (!existing) return;
  const newTotal = Math.max(((existing as any).total_services || 0) - 1, 0);
  await supabase
    .from("loyalty")
    .update({
      total_services: newTotal,
      free_services_earned: Math.floor(newTotal / GOAL),
      updated_at: new Date().toISOString(),
    })
    .eq("customer_phone", phone);
};
