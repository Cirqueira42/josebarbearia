import { supabase } from "@/integrations/supabase/client";

/** Escapa conteúdo vindo do cliente para não injetar HTML/links nas mensagens do Telegram. */
export const escapeTg = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Envia mensagem para o Telegram da barbearia.
 * Chamadas anônimas (tela de agendamento) precisam informar o id do agendamento recém-criado.
 */
export const sendTelegramMessage = async (message: string, appointmentId?: string | null) => {
  try {
    await supabase.functions.invoke("send-telegram", {
      body: appointmentId ? { message, appointment_id: appointmentId } : { message },
    });
  } catch {
    /* silencioso: notificação não deve quebrar o fluxo */
  }
};
