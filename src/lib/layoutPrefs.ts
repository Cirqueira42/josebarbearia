/**
 * Preferências de layout por tela (persistidas no navegador).
 * Guarda somente posição/tamanho visual dos quadros — nunca dados do sistema.
 */

export type CardPrefs = {
  /** escala de tamanho do conteúdo do quadro (0.8 – 1.3) */
  scale: number;
  /** largura: "full" = tela inteira, "half" = metade (apenas em telas largas) */
  width: "full" | "half";
  /** altura máxima em px; 0 = automática */
  maxH: number;
  /** oculto da tela (pode ser restaurado) */
  hidden?: boolean;
};

export type BoardPrefs = {
  order: string[];
  cards: Record<string, CardPrefs>;
};

export const DEFAULT_CARD: CardPrefs = { scale: 1, width: "full", maxH: 0, hidden: false };

const key = (boardId: string) => `layout_prefs_v1_${boardId}`;

export const loadBoardPrefs = (boardId: string): BoardPrefs => {
  try {
    const raw = localStorage.getItem(key(boardId));
    if (!raw) return { order: [], cards: {} };
    const parsed = JSON.parse(raw);
    return {
      order: Array.isArray(parsed?.order) ? parsed.order : [],
      cards: typeof parsed?.cards === "object" && parsed.cards ? parsed.cards : {},
    };
  } catch {
    return { order: [], cards: {} };
  }
};

export const saveBoardPrefs = (boardId: string, prefs: BoardPrefs) => {
  try {
    localStorage.setItem(key(boardId), JSON.stringify(prefs));
  } catch {}
};

export const clearBoardPrefs = (boardId: string) => {
  try {
    localStorage.removeItem(key(boardId));
  } catch {}
};

/** Ordena os ids conhecidos segundo a preferência salva, mantendo novos itens no fim. */
export const applyOrder = (ids: string[], order: string[]) => {
  const known = order.filter((id) => ids.includes(id));
  const rest = ids.filter((id) => !known.includes(id));
  return [...known, ...rest];
};

export const cardPrefsOf = (prefs: BoardPrefs, id: string): CardPrefs => ({
  ...DEFAULT_CARD,
  ...(prefs.cards[id] || {}),
});
