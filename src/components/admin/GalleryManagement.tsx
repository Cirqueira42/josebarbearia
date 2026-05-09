import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Camera, Image as ImageIcon, Trash2, Upload } from "lucide-react";
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
      toast({ title: "Erro ao carregar galeria", variant: "destructive" });
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

  const uploadFile = async (raw: File) => {
    if (raw.size > 15 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máx 15 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
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
      setUploading(false);
      return;
    }

    const { error: dbErr } = await supabase.from("gallery_photos").insert({
      storage_path: path,
      caption: caption || null,
      display_order: photos.length,
    });

    if (dbErr) {
      toast({ title: "Erro ao salvar", description: dbErr.message, variant: "destructive" });
      await supabase.storage.from("gallery").remove([path]);
    } else {
      toast({ title: "Foto adicionada! ✅" });
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
      await load();
    }
    setUploading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleDelete = async (photo: Photo) => {
    if (!confirm("Excluir esta foto?")) return;
    await supabase.storage.from("gallery").remove([photo.storage_path]);
    await supabase.from("gallery_photos").delete().eq("id", photo.id);
    toast({ title: "Foto removida" });
    load();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">Galeria de Fotos</h3>
      </div>

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
            onChange={handleUpload}
            disabled={uploading}
            className="flex-1"
          />
          <Button disabled={uploading} variant="outline" size="icon" onClick={() => setCameraOpen(true)} title="Tirar foto">
            <Camera className="w-4 h-4" />
          </Button>
        </div>
        {uploading && <p className="text-xs text-muted-foreground">Enviando foto...</p>}
      </div>

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma foto enviada ainda. As fotos padrão do site serão usadas.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="relative group rounded-lg overflow-hidden border border-border">
              <img src={p.publicUrl} alt={p.caption || ""} className="w-full aspect-video object-cover" />
              {p.caption && (
                <p className="text-xs text-foreground bg-background/70 px-2 py-1 absolute bottom-0 inset-x-0 truncate">
                  {p.caption}
                </p>
              )}
              <button
                onClick={() => handleDelete(p)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1 rounded opacity-0 group-hover:opacity-100 transition"
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
        onCapture={uploadFile}
        fileName="galeria.jpg"
      />
    </div>
  );
};

export default GalleryManagement;
