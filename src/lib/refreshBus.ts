import { useEffect, useRef } from "react";

/**
 * Barramento simples de atualização.
 * Permite que uma ação (ex.: finalizar atendimento) force a atualização
 * imediata de todos os painéis que dependem daquele dado, sem esperar
 * o realtime, rolagem de tela ou recarregar o app.
 */
const EVENT = "app:data-refresh";

export type RefreshTopic =
  | "appointments"
  | "cash"
  | "loyalty"
  | "all";

export const emitDataRefresh = (topic: RefreshTopic = "all") => {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: topic }));
};

/** Executa o callback quando algum dos tópicos observados for atualizado. */
export const useDataRefresh = (topics: RefreshTopic[], callback: () => void) => {
  const cbRef = useRef(callback);
  cbRef.current = callback;
  const key = topics.join(",");

  useEffect(() => {
    const list = key.split(",") as RefreshTopic[];
    const handler = (e: Event) => {
      const topic = (e as CustomEvent).detail as RefreshTopic;
      if (topic === "all" || list.includes(topic) || list.includes("all")) {
        cbRef.current();
      }
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, [key]);
};
