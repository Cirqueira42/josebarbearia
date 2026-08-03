import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera, ImagePlus, Trash2, MonitorSmartphone, ArrowUp, ArrowDown } from "lucide-react";
import CameraCapture from "./CameraCapture";
import { enhanceImage } from "@/lib/imageEnhance";

type Bg = {
  id: string;
  storage_path: string;
  display_order: number;
  publicUrl: string;
};

const BackgroundManagement = () => {
  const [items, setItems] = useState<Bg[]>([]);
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase
      .from("hero_backgrounds")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    setItems(
      (data || []).map((b) => ({
        ...b,
        publicUrl: supabase.storage.from("gallery").getPublicUrl(b.storage_path).data.publicUrl,
      })) as Bg[]
    );
  };

  useEffect(() => {
    load();
  }, []);

  const uploadOne = async (raw: File, index: number) => {
    let file = raw;
    try {
      file = await enhanceImage(raw, raw.name);
    } catch {
      // segue com original
    }
    const path = `fundo/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("gallery")
      .upload(path, file, { contentType: "image/jpeg", cacheControl: "3600" });
    if (upErr) throw upErr;
    const { error: dbErr } = await supabase
      .from("hero_backgrounds")
      .insert({ storage_path: path, display_order: items.length + index });
    if (dbErr) {
      await supabase.storage.from("gallery").remove([path]);
      throw dbErr;
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    try {
      let i = 0;
      for (const f of list) {
        if (f.size > 15 * 1024 * 1024) {
          toast({ title: `"${f.name}" tem mais de 15 MB`, variant: "destructive" });
          continue;
        }
        await uploadOne(f, i);
        i++;
      }
      toast({ title: "Fundo atualizado! ✅", description: "A tela principal já mostra as novas fotos." });
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (e: any) {
      toast({ title: "Erro no envio", description: e?.message || "Tente novamente.", variant: "destructive" });
    }
    setUploading(false);
  };

  const remove = async (bg: Bg) => {
    if (!confirm("Remover esta foto do fundo?")) return;
    await supabase.storage.from("gallery").remove([bg.storage_path]);
    await supabase.from("hero_backgrounds").delete().eq("id", bg.id);
    toast({ title: "Foto removida" });
    load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const a = items[index];
    const b = items[target];
    await supabase.from("hero_backgrounds").update({ display_order: target }).eq("id", a.id);
    await supabase.from("hero_backgrounds").update({ display_order: index }).eq("id", b.id);
    load();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <MonitorSmartphone className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">Fundo da Tela Principal</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Escolha fotos da galeria do celular. Pode enviar várias — o carrossel troca automaticamente a cada 5 segundos.
        Sem fotos aqui, o app usa as imagens padrão.
      </p>

      <div className="flex gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <Button className="flex-1" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <ImagePlus className="w-4 h-4 mr-1" />
          {uploading ? "Enviando..." : "Escolher da galeria"}
        </Button>
        <Button variant="outline" size="icon" disabled={uploading} onClick={() => setCameraOpen(true)} title="Tirar foto">
          <Camera className="w-4 h-4" />
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">Usando as fotos padrão do app.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((b, i) => (
            <div key={b.id} className="relative rounded-lg overflow-hidden border border-border">
              <img src={b.publicUrl} alt={`Fundo ${i + 1}`} className="w-full aspect-video object-cover" />
              <span className="absolute top-1 left-1 text-[10px] bg-background/80 px-1.5 py-0.5 rounded">
                {i + 1}º
              </span>
              <div className="absolute bottom-1 left-1 flex gap-1">
                <button onClick={() => move(i, -1)} className="bg-background/80 p-1 rounded" aria-label="Subir">
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button onClick={() => move(i, 1)} className="bg-background/80 p-1 rounded" aria-label="Descer">
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
              <button
                onClick={() => remove(b)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1 rounded"
                aria-label="Excluir"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => handleFiles([file])}
        fileName="fundo.jpg"
      />
    </div>
  );
};

export default BackgroundManagement;
