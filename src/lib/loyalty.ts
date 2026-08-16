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

/**
 * Conta um atendimento na fidelidade. 
 * Regras: Preço >= R$ 30 e no máximo 1 por dia por cliente.
 * A lógica de "1 por dia" e atomicidade agora é tratada no banco (RPC).
 */
export const updateLoyalty = async (
  customerPhone: string,
  customerName: string,
  serviceName: string,
  appointmentDate: string,
  appointmentId: string,
  servicePrice?: number,
) => {
  const phone = (customerPhone || "").replace(/\D/g, "");
  if (!phone) return;

  const price = typeof servicePrice === "number" ? servicePrice : await getServicePrice(serviceName);
  
  // Se o serviço não atingir o valor mínimo, não faz nada
  if (price < MIN_VALUE) return;

  // Chama a RPC para processar o incremento de forma atômica e validando o limite diário
  const { data, error } = await (supabase as any).rpc("handle_loyalty_change", {
    _appointment_id: appointmentId,
    _delta: 1
  });

  if (error) {
    console.error("Error updating loyalty:", error);
    return 0;
  }

  // O handle_loyalty_change já chama o issue_loyalty_rewards internamente.
  // Retornamos 1 apenas para sinalizar sucesso, embora o retorno real dependa da RPC.
  return 1;
};

/**
 * Reverte um atendimento na fidelidade.
 * Deve ser chamado quando um agendamento concluído é cancelado ou excluído.
 */
export const revertLoyalty = async (
  customerPhone: string,
  serviceName: string,
  appointmentId: string,
  servicePrice?: number,
) => {
  const phone = (customerPhone || "").replace(/\D/g, "");
  if (!phone) return;

  const price = typeof servicePrice === "number" ? servicePrice : await getServicePrice(serviceName);
  
  // Se o serviço original não contou para a fidelidade, não precisamos reverter nada
  if (price < MIN_VALUE) return;

  // Chama a RPC para processar o decremento validando se era o único do dia
  const { error } = await (supabase as any).rpc("handle_loyalty_change", {
    _appointment_id: appointmentId,
    _delta: -1
  });

  if (error) {
    console.error("Error reverting loyalty:", error);
  }
};
