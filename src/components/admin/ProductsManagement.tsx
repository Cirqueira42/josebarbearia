import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Camera, Package, Plus, Save, Trash2, Upload, X } from "lucide-react";
import CameraCapture from "./CameraCapture";
import { enhanceImage } from "@/lib/imageEnhance";

type Product = {
  id: string;
  brand: string;
  name: string;
  description: string | null;
  price: number;
  image_path: string | null;
  in_stock: boolean;
  highlight: string | null;
  display_order: number;
};

const emptyForm = { brand: "", name: "", description: "", price: 0, highlight: "" };

const ProductsManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [cameraFor, setCameraFor] = useState<Product | null>(null);
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (data) setProducts(data as Product[]);
  };

  useEffect(() => { load(); }, []);

  const publicUrl = (path: string | null) =>
    path ? supabase.storage.from("products").getPublicUrl(path).data.publicUrl : null;

  const addProduct = async () => {
    if (!form.brand || !form.name) {
      toast({ title: "Marca e nome obrigatórios", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("products").insert({
      brand: form.brand,
      name: form.name,
      description: form.description || null,
      price: form.price,
      highlight: form.highlight || null,
      display_order: products.length + 1,
    });
    if (error) {
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Produto adicionado ✅" });
      setForm(emptyForm);
      setShowAdd(false);
      load();
    }
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditData({ brand: p.brand, name: p.name, description: p.description, price: p.price, highlight: p.highlight });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from("products").update(editData).eq("id", editingId);
    if (error) toast({ title: "Erro", variant: "destructive" });
    else {
      toast({ title: "Salvo!" });
      setEditingId(null);
      load();
    }
  };

  const toggleStock = async (p: Product) => {
    await supabase.from("products").update({ in_stock: !p.in_stock }).eq("id", p.id);
    toast({ title: p.in_stock ? "Marcado como esgotado" : "Marcado como disponível" });
    load();
  };

  const deleteProduct = async (p: Product) => {
    if (!confirm(`Excluir "${p.name}"?`)) return;
    if (p.image_path) await supabase.storage.from("products").remove([p.image_path]);
    await supabase.from("products").delete().eq("id", p.id);
    toast({ title: "Produto removido" });
    load();
  };

  const uploadImage = async (p: Product, rawFile: File) => {
    if (rawFile.size > 15 * 1024 * 1024) {
      toast({ title: "Máx 15 MB", variant: "destructive" });
      return;
    }
    let file = rawFile;
    try {
      file = await enhanceImage(rawFile, rawFile.name);
    } catch {
      // se falhar, segue com o original
    }
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const { error: upErr } = await supabase.storage.from("products").upload(path, file, { upsert: false, contentType: "image/jpeg" });
    if (upErr) {
      toast({ title: "Erro upload", description: upErr.message, variant: "destructive" });
      return;
    }
    if (p.image_path) await supabase.storage.from("products").remove([p.image_path]);
    await supabase.from("products").update({ image_path: path }).eq("id", p.id);
    toast({ title: "Foto atualizada ✅" });
    load();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Produtos da Barbearia</h3>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? <X className="w-4 h-4" /> : <><Plus className="w-4 h-4 mr-1" />Novo</>}
        </Button>
      </div>

      {showAdd && (
        <div className="bg-background border border-border rounded-md p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Marca" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <Input placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" step="0.01" placeholder="Preço" value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            <Input placeholder="Destaque (opcional)" value={form.highlight} onChange={(e) => setForm({ ...form, highlight: e.target.value })} />
          </div>
          <Button size="sm" className="w-full" onClick={addProduct}>
            <Save className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {products.map((p) => {
          const url = publicUrl(p.image_path);
          return (
            <div key={p.id} className="bg-background border border-border rounded-md p-3">
              {editingId === p.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={editData.brand || ""} onChange={(e) => setEditData({ ...editData, brand: e.target.value })} placeholder="Marca" />
                    <Input value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} placeholder="Nome" />
                  </div>
                  <Input value={editData.description || ""} onChange={(e) => setEditData({ ...editData, description: e.target.value })} placeholder="Descrição" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" step="0.01" value={editData.price ?? ""} onChange={(e) => setEditData({ ...editData, price: Number(e.target.value) })} placeholder="Preço" />
                    <Input value={editData.highlight || ""} onChange={(e) => setEditData({ ...editData, highlight: e.target.value })} placeholder="Destaque" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} className="flex-1"><Save className="w-3 h-3 mr-1" />Salvar</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-md overflow-hidden bg-secondary flex-shrink-0 flex items-center justify-center">
                    {url ? (
                      <img src={url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-primary uppercase tracking-wider font-semibold truncate">{p.brand}</p>
                    <p className="font-bold text-foreground text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">R$ {p.price.toFixed(2)}{p.highlight ? ` • ${p.highlight}` : ""}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Switch checked={p.in_stock} onCheckedChange={() => toggleStock(p)} />
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${p.in_stock ? "text-success" : "text-destructive"}`}>
                        {p.in_stock ? "Disponível" : "Esgotado"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <input
                      type="file"
                      accept="image/*"
                      ref={(el) => (fileRefs.current[p.id] = el)}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadImage(p, f);
                        e.target.value = "";
                      }}
                    />
                    <Button size="sm" variant="ghost" onClick={() => fileRefs.current[p.id]?.click()} title="Trocar foto">
                      <Upload className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setCameraFor(p)} title="Tirar foto">
                      <Camera className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(p)} className="text-xs">Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteProduct(p)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {products.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto cadastrado.</p>
        )}
      </div>
      <CameraCapture
        open={!!cameraFor}
        onClose={() => setCameraFor(null)}
        onCapture={async (file) => {
          if (cameraFor) await uploadImage(cameraFor, file);
        }}
        fileName={cameraFor ? `${cameraFor.brand}-${cameraFor.name}.jpg` : "produto.jpg"}
      />
    </div>
  );
};

export default ProductsManagement;
