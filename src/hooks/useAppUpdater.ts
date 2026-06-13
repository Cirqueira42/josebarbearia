import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Sistema de auto-atualização do app.
 * - Remove service workers antigos e caches (uma vez ao abrir).
 * - Verifica NO MÁXIMO 1 VEZ POR DIA se há uma nova versão.
 * - Detecta nova versão pelo hash do bundle JS principal (estável).
 */
const BUNDLE_KEY = "app:bundle-id";
const LAST_CHECK_KEY = "app:last-check-date";

const getTodayInSP = (): string => {
  // YYYY-MM-DD no fuso de São Paulo
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

const fetchBundleId = async (): Promise<string | null> => {
  try {
    const res = await fetch(`/?_v=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    const text = await res.text();
    // Extrai o src do bundle principal (ex.: /assets/index-AbC123.js)
    const match = text.match(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/i)
      || text.match(/src=["'](\/assets\/[^"']+\.js)["']/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

const forceReload = async () => {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // ignore
  }
  window.location.reload();
};

export const useAppUpdater = () => {
  const checkingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Remove qualquer service worker antigo
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
    }

    // 2. Checa no máximo 1x por dia
    const checkForUpdate = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        const today = getTodayInSP();
        const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
        if (lastCheck === today) return; // já checou hoje

        const newBundle = await fetchBundleId();
        if (!newBundle) return;

        localStorage.setItem(LAST_CHECK_KEY, today);

        const savedBundle = localStorage.getItem(BUNDLE_KEY);
        if (!savedBundle) {
          // primeira execução: só armazena, não recarrega
          localStorage.setItem(BUNDLE_KEY, newBundle);
          return;
        }

        if (savedBundle !== newBundle) {
          localStorage.setItem(BUNDLE_KEY, newBundle);
          toast.success("Nova versão disponível! Atualizando...", {
            duration: 2500,
          });
          setTimeout(forceReload, 1500);
        }
      } finally {
        checkingRef.current = false;
      }
    };

    checkForUpdate();
  }, []);
};
