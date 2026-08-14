import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Package, ShoppingCart, AlertTriangle, Trophy, Save } from "lucide-react";
import { emitDataRefresh, useDataRefresh } from "@/lib/refreshBus";
import { getBrazilTodayStr, getBrazilMonthStartStr } from "@/lib/brazilTime";

type Product = {
  id: string;
  brand: string;
  name: string;
  price: number;
  in_stock: boolean;
  stock_qty: number;
  min_stock: number;
};

type Sale = {
  id: string;
  product_name: string;
  qty: number;
  total: number;
  sale_date: string;
};

const fmt = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ProductSales = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [stockDraft, setStockDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    const [p, s] = await Promise.all([
      (supabase as any).from("products").select("id, brand, name, price, in_stock, stock_qty, min_stock").order("display_order"),
      (supabase as any).from("product_sales").select("id, product_name, qty, total, sale_date").order("sale_date", { ascending: false }).limit(500),
    ]);
    setProducts(((p.data as Product[]) || []).map((x) => ({ ...x, price: Number(x.price || 0) })));
    setSales(((s.data as Sale[]) || []).map((x) => ({ ...x, total: Number(x.total || 0), qty: Number(x.qty || 0) })));
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("product-sales-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "product_sales" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useDataRefresh(["cash", "all"], load);

  const lowStock = useMemo(
    () => products.filter((p) => Number(p.stock_qty) <= Number(p.min_stock)),
    [products],
  );

  const monthStart = getBrazilMonthStartStr();
  const ranking = useMemo(() => {
    const map: Record<string, { qty: number; total: number }> = {};
    sales.filter((s) => s.sale_date >= monthStart).forEach((s) => {
      map[s.product_name] = map[s.product_name] || { qty: 0, total: 0 };
      map[s.product_name].qty += s.qty;
      map[s.product_name].total += s.total;
    });
    return Object.entries(map).sort((a, b) => b[1].qty - a[1].qty);
  }, [sales, monthStart]);

  const monthTotal = ranking.reduce((s, [, v]) => s + v.total, 0);
  const monthQty = ranking.reduce((s, [, v]) => s + v.qty, 0);

  const sell = async (p: Product) => {
    const q = Math.max(1, parseInt(qty[p.id] || "1", 10) || 1);
    if (p.stock_qty > 0 && q > p.stock_qty) {
      toast({ title: "Estoque insuficiente", description: `Disponível: ${p.stock_qty}`, variant: "destructive" });
      return;
    }
    setBusy(p.id);
    try {
      const total = p.price * q;
      const today = getBrazilTodayStr();
      const { data: entry, error: entryErr } = await (supabase as any)
        .from("cash_entries")
        .insert({
          entry_date: today,
          kind: "in",
          description: `Produto: ${p.brand} ${p.name} x${q}`,
          amount: total,
          category: "produto",
          investment_amount: 0,
        })
        .select("id")
        .single();
      if (entryErr) throw entryErr;

      const { error: saleErr } = await (supabase as any).from("product_sales").insert({
        product_id: p.id,
        product_name: p.name,
        brand: p.brand,
        qty: q,
        unit_price: p.price,
        total,
        sale_date: today,
        cash_entry_id: entry?.id ?? null,
      });
      if (saleErr) throw saleErr;

      const newStock = Math.max(0, Number(p.stock_qty) - q);
      await (supabase as any)
        .from("products")
        .update({ stock_qty: newStock, in_stock: newStock > 0 ? p.in_stock : false })
        .eq("id", p.id);

      toast({ title: "Venda registrada ✅", description: `${p.name} x${q} · ${fmt(total)}` });
      emitDataRefresh("cash");
      load();
    } catch (e: any) {
      toast({ title: "Erro ao registrar venda", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const saveStock = async (p: Product) => {
    const v = stockDraft[p.id];
    if (v === undefined) return;
    const n = Math.max(0, parseInt(v, 10) || 0);
    await (supabase as any).from("products").update({ stock_qty: n }).eq("id", p.id);
    setStockDraft((d) => { const c = { ...d }; delete c[p.id]; return c; });
    toast({ title: "Estoque atualizado" });
    load();
  };

  return (
    <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-3 sm:p-4 w-full min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <ShoppingCart className="w-5 h-5 text-primary shrink-0" />
        <h2 className="text-base sm:text-lg font-bold">Vendas e Estoque de Produtos</h2>
        <Badge variant="outline" className="ml-auto text-[10px]">Mês: {monthQty} un · {fmt(monthTotal)}</Badge>
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 mb-3">
          <p className="text-[11px] font-semibold text-amber-500 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Estoque baixo
          </p>
          <p className="text-[11px] text-muted-foreground break-words">
            {lowStock.map((p) => `${p.name} (${p.stock_qty})`).join(" · ")}
          </p>
        </div>
      )}

      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {products.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">Nenhum produto cadastrado.</p>
        )}
        {products.map((p) => (
          <div key={p.id} className="bg-background/40 rounded p-2 flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{p.brand} · {p.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {fmt(p.price)} · estoque {p.stock_qty} (mín. {p.min_stock})
              </p>
            </div>
            <Input
              className="h-8 w-14 text-xs"
              inputMode="numeric"
              placeholder="Qtd"
              value={qty[p.id] ?? ""}
              onChange={(e) => setQty((q) => ({ ...q, [p.id]: e.target.value }))}
            />
            <Button size="sm" className="h-8 text-[11px]" disabled={busy === p.id} onClick={() => sell(p)}>
              Vender
            </Button>
            <Input
              className="h-8 w-16 text-xs"
              inputMode="numeric"
              placeholder="Estoq."
              value={stockDraft[p.id] ?? String(p.stock_qty)}
              onChange={(e) => setStockDraft((d) => ({ ...d, [p.id]: e.target.value }))}
            />
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              disabled={stockDraft[p.id] === undefined}
              onClick={() => saveStock(p)}
            >
              <Save className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
          <Trophy className="w-3.5 h-3.5 text-primary" /> Mais vendidos (mês)
        </p>
        {ranking.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Nenhuma venda registrada neste mês.</p>
        ) : (
          <div className="space-y-1">
            {ranking.slice(0, 5).map(([name, v], i) => (
              <div key={name} className="flex items-center justify-between gap-2 text-[11px] bg-background/40 rounded px-2 py-1">
                <span className="truncate">{i + 1}. {name}</span>
                <span className="shrink-0 text-muted-foreground">{v.qty} un</span>
                <span className="shrink-0 font-bold text-primary">{fmt(v.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
        <Package className="w-3 h-3" /> Vendas entram no caixa como “produto” e nunca contam como atendimento.
      </p>
    </div>
  );
};

export default ProductSales;
