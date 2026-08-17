import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Move,
  RotateCcw,
  X,
} from "lucide-react";
import {
  BoardPrefs,
  applyOrder,
  cardPrefsOf,
  clearBoardPrefs,
  loadBoardPrefs,
  saveBoardPrefs,
} from "@/lib/layoutPrefs";

export type BoardItem = { id: string; title: string; node: ReactNode };

type Props = {
  boardId: string;
  items: BoardItem[];
  className?: string;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const CustomizableBoard = ({ boardId, items, className }: Props) => {
  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const [prefs, setPrefs] = useState<BoardPrefs>({ order: [], cards: {} });
  const [editing, setEditing] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const timer = useRef<number | null>(null);
  const blockClick = useRef(false);
  const snapshot = useRef<BoardPrefs | null>(null);

  useEffect(() => setPrefs(loadBoardPrefs(boardId)), [boardId]);

  const persist = useCallback(
    (next: BoardPrefs) => {
      setPrefs(next);
      saveBoardPrefs(boardId, next);
    },
    [boardId],
  );

  const order = useMemo(() => applyOrder(ids, prefs.order), [ids, prefs.order]);

  const startPress = (id: string) => (e: React.PointerEvent) => {
    if (editing) return;
    const startY = e.clientY;
    const startX = e.clientX;
    const cancel = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
      window.removeEventListener("pointerup", cancel);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("pointermove", onMove);
    };
    const onMove = (ev: PointerEvent) => {
      if (Math.abs(ev.clientY - startY) > 8 || Math.abs(ev.clientX - startX) > 8) cancel();
    };
    window.addEventListener("pointerup", cancel);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("pointermove", onMove);
    timer.current = window.setTimeout(() => {
      cancel();
      snapshot.current = JSON.parse(JSON.stringify(prefs));
      blockClick.current = true;
      window.setTimeout(() => (blockClick.current = false), 600);
      setEditing(id);
      try {
        navigator.vibrate?.(25);
      } catch {}
    }, 550);
  };

  const update = (id: string, patch: Partial<ReturnType<typeof cardPrefsOf>>) => {
    const curr = cardPrefsOf(prefs, id);
    persist({ ...prefs, cards: { ...prefs.cards, [id]: { ...curr, ...patch } } });
  };

  const move = (id: string, dir: -1 | 1) => {
    const list = [...order];
    const i = list.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    persist({ ...prefs, order: list });
  };

  const finish = () => {
    setEditing(null);
    snapshot.current = null;
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1600);
  };

  const cancel = () => {
    if (snapshot.current) persist(snapshot.current);
    snapshot.current = null;
    setEditing(null);
  };

  const restore = () => {
    clearBoardPrefs(boardId);
    setPrefs({ order: [], cards: {} });
    snapshot.current = null;
    setEditing(null);
  };

  const hiddenIds = order.filter((id) => cardPrefsOf(prefs, id).hidden);

  return (
    <div className={className}>
      {(savedFlash || editing) && (
        <div className="sticky top-1 z-30 mb-2">
          <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-[11px] font-medium shadow-lg flex items-center gap-2">
            <Move className="w-3.5 h-3.5 shrink-0" />
            <span className="min-w-0 flex-1">
              {editing ? "Modo de personalização — ajuste tamanho e posição do quadro." : "Organização salva neste aparelho."}
            </span>
          </div>
        </div>
      )}

      {hiddenIds.length > 0 && (
        <div className="mb-2 flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setShowHidden((s) => !s)}>
            {showHidden ? "Ocultar recolhidos" : `Quadros recolhidos (${hiddenIds.length})`}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={restore}>
            <RotateCcw className="w-3 h-3 mr-1" /> Restaurar organização original desta tela
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 items-start">
        {order.map((id) => {
          const item = items.find((i) => i.id === id);
          if (!item) return null;
          const cp = cardPrefsOf(prefs, id);
          const isEditing = editing === id;
          if (cp.hidden && !showHidden && !isEditing) return null;

          return (
            <div
              key={id}
              className={`min-w-0 w-full ${cp.width === "full" ? "lg:col-span-2" : "lg:col-span-1"} ${
                isEditing ? "ring-2 ring-primary rounded-lg" : ""
              }`}
            >
              {isEditing && (
                <div className="bg-card border border-primary/60 rounded-t-lg p-2 flex flex-wrap items-center gap-1">
                  <span className="text-[11px] font-bold text-primary w-full truncate">{item.title}</span>
                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => move(id, -1)} aria-label="Mover para cima">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => move(id, 1)} aria-label="Mover para baixo">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={() => update(id, { scale: clamp(+(cp.scale - 0.05).toFixed(2), 0.8, 1.3) })}
                    aria-label="Diminuir"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-[10px] text-muted-foreground w-9 text-center">{Math.round(cp.scale * 100)}%</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={() => update(id, { scale: clamp(+(cp.scale + 0.05).toFixed(2), 0.8, 1.3) })}
                    aria-label="Aumentar"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[10px]"
                    onClick={() => update(id, { maxH: cp.maxH === 0 ? 320 : cp.maxH <= 240 ? 0 : cp.maxH - 80 })}
                  >
                    Altura: {cp.maxH === 0 ? "auto" : `${cp.maxH}px`}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[10px] hidden lg:inline-flex"
                    onClick={() => update(id, { width: cp.width === "full" ? "half" : "full" })}
                  >
                    {cp.width === "full" ? "Largura total" : "Meia largura"}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => update(id, { hidden: !cp.hidden })}>
                    {cp.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={restore}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Padrão
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={cancel}>
                    <X className="w-3.5 h-3.5 mr-1" /> Cancelar
                  </Button>
                  <Button size="sm" className="h-7 px-2 text-[10px] ml-auto" onClick={finish}>
                    <Check className="w-3.5 h-3.5 mr-1" /> Salvar
                  </Button>
                </div>
              )}

              <div
                onPointerDown={startPress(id)}
                onClickCapture={(e) => {
                  if (blockClick.current) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                className="min-w-0 w-full overflow-x-hidden"
                style={{
                  fontSize: `${cp.scale}rem`,
                  maxHeight: cp.maxH ? `${cp.maxH}px` : undefined,
                  overflowY: cp.maxH ? "auto" : undefined,
                  opacity: cp.hidden ? 0.5 : 1,
                }}
              >
                <div style={{ fontSize: "16px" }} className="min-w-0">
                  {item.node}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] text-muted-foreground text-center">
        Dica: pressione e segure qualquer quadro para ajustar tamanho, altura e posição. A organização fica salva.
      </p>
    </div>
  );
};

export default CustomizableBoard;
