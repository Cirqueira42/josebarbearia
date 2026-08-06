import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowDown, ArrowUp, Camera, Images, Star, Trash2 } from "lucide-react";
import CameraCapture from "./CameraCapture";
import { enhanceImage } from "@/lib/imageEnhance";

type Photo = {
  id: string;
  storage_path: string;
  caption: string | null;
  display_order: number;
  publicUrl: string;
};

const GalleryManagement = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const load = async () => {
    const { data, error } = await supabase
      .from("gallery_photos")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar portfólio", variant: "destructive" });
      return;
    }
    const mapped = (data || []).map((p) => {
      const { data: pub } = supabase.storage.from("gallery").getPublicUrl(p.storage_path);
      return { ...p, publicUrl: pub.publicUrl };
    });
    setPhotos(mapped);
  };

  useEffect(() => {
    load();
  }, []);

  const uploadFile = async (raw: File, order?: number) => {
    if (raw.size > 15 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máx 15 MB.", variant: "destructive" });
      return false;
    }
    let file = raw;
    try {
      file = await enhanceImage(raw, raw.name);
    } catch {
      // segue com original
    }
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

    const { error: upErr } = await supabase.storage.from("gallery").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: "image/jpeg",
    });

    if (upErr) {
      toast({ title: "Erro no upload", description: upErr.message, variant: "destructive" });
      return false;
    }

    const { error: dbErr } = await supabase.from("gallery_photos").insert({
      storage_path: path,
      caption: caption || null,
      display_order: order ?? photos.length,
    });

    if (dbErr) {
      toast({ title: "Erro ao salvar", description: dbErr.message, variant: "destructive" });
      await supabase.storage.from("gallery").remove([path]);
      return false;
    }
    return true;
  };

  const handleSingle = async (raw: File) => {
    setUploading(true);
    const ok = await uploadFile(raw);
    if (ok) {
      toast({ title: "Foto adicionada ao portfólio ✅" });
      setCaption("");
      await load();
    }
    setUploading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    let count = 0;
    for (let i = 0; i < files.length; i++) {
      setProgress(`Enviando ${i + 1} de ${files.length}...`);
      const ok = await uploadFile(files[i], photos.length + i);
      if (ok) count++;
    }
    setProgress("");
    setUploading(false);
    if (count > 0) {
      toast({ title: `${count} foto${count > 1 ? "s" : ""} adicionada${count > 1 ? "s" : ""} ✅` });
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
      await load();
    }
  };

  const persistOrder = async (list: Photo[]) => {
    setPhotos(list);
    await Promise.all(
      list.map((p, i) => supabase.from("gallery_photos").update({ display_order: i }).eq("id", p.id))
    );
    await load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= photos.length) return;
    const list = [...photos];
    [list[index], list[target]] = [list[target], list[index]];
    await persistOrder(list);
  };

  const setFeatured = async (index: number) => {
    if (index === 0) return;
    const list = [...photos];
    const [item] = list.splice(index, 1);
    list.unshift(item);
    await persistOrder(list);
    toast({ title: "Foto definida como destaque ⭐" });
  };

  const handleDelete = async (photo: Photo) => {
    if (!confirm("Excluir esta foto do portfólio?")) return;
    await supabase.storage.from("gallery").remove([photo.storage_path]);
    await supabase.from("gallery_photos").delete().eq("id", photo.id);
    toast({ title: "Foto removida" });
    load();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Images className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">Portfólio — Nossos Trabalhos</h3>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        As fotos aparecem automaticamente na tela principal. A primeira é a foto em destaque.
      </p>

      <div className="space-y-2">
        <Input
          placeholder="Legenda (opcional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={200}
        />
        <div className="flex gap-2">
          <Input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            className="flex-1"
          />
          <Button disabled={uploading} variant="outline" size="icon" onClick={() => setCameraOpen(true)} title="Tirar foto">
            <Camera className="w-4 h-4" />
          </Button>
        </div>
        {uploading && <p className="text-xs text-muted-foreground">{progress || "Enviando foto..."}</p>}
      </div>

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma foto enviada ainda. As fotos padrão do site serão usadas.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((p, i) => (
            <div key={p.id} className="rounded-lg overflow-hidden border border-border bg-background/50">
              <div className="relative">
                <img src={p.publicUrl} alt={p.caption || "Trabalho realizado"} className="w-full aspect-video object-cover" />
                {i === 0 && (
                  <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" /> Destaque
                  </span>
                )}
                {p.caption && (
                  <p className="text-[11px] text-foreground bg-background/80 px-2 py-1 absolute bottom-0 inset-x-0 truncate">
                    {p.caption}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 p-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Definir como destaque" onClick={() => setFeatured(i)} disabled={i === 0}>
                  <Star className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Mover para cima" onClick={() => move(i, -1)} disabled={i === 0}>
                  <ArrowUp className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Mover para baixo" onClick={() => move(i, 1)} disabled={i === photos.length - 1}>
                  <ArrowDown className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Excluir" onClick={() => handleDelete(p)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleSingle}
        fileName="portfolio.jpg"
      />
    </div>
  );
};

export default GalleryManagement;
