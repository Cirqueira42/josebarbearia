import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Sistema de auto-atualização do app.
 * - Remove qualquer service worker antigo (evita cache de versão antiga).
 * - Limpa caches do navegador.
 * - Verifica periodicamente se o index.html mudou (hash) e recarrega.
 */
const CHECK_INTERVAL_MS = 60_000; // checa a cada 1 minuto
const STORAGE_KEY = "app:last-html-hash";

const hashString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
};

const fetchHtmlHash = async (): Promise<string | null> => {
  try {
    const res = await fetch(`/?_v=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    const text = await res.text();
    return hashString(text);
  } catch {
    return null;
  }
};

const forceReload = () => {
  // Limpa caches antes de recarregar para garantir versão nova
  if ("caches" in window) {
    caches.keys().then((keys) => {
      Promise.all(keys.map((k) => caches.delete(k))).finally(() => {
        window.location.reload();
      });
    });
  } else {
    window.location.reload();
  }
};

export const useAppUpdater = () => {
  const checkingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Garante que nenhum service worker antigo esteja interceptando requests
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
    }

    // 2. Função que checa se há nova versão
    const checkForUpdate = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        const newHash = await fetchHtmlHash();
        if (!newHash) return;

        const lastHash = localStorage.getItem(STORAGE_KEY);
        if (!lastHash) {
          localStorage.setItem(STORAGE_KEY, newHash);
          return;
        }

        if (lastHash !== newHash) {
          localStorage.setItem(STORAGE_KEY, newHash);
          toast.success("Nova versão disponível! Atualizando...", {
            duration: 2500,
          });
          setTimeout(forceReload, 1500);
        }
      } finally {
        checkingRef.current = false;
      }
    };

    // 3. Checa ao abrir o app
    checkForUpdate();

    // 4. Checa periodicamente
    const interval = window.setInterval(checkForUpdate, CHECK_INTERVAL_MS);

    // 5. Checa quando a aba volta a ficar visível
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // 6. Checa quando a conexão volta
    const onOnline = () => checkForUpdate();
    window.addEventListener("online", onOnline);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, []);
};
