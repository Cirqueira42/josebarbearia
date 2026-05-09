import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Check, X, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { enhanceImage } from "@/lib/imageEnhance";

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void | Promise<void>;
  fileName?: string;
};

const CameraCapture = ({ open, onClose, onCapture, fileName = "foto.jpg" }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [enhancedFile, setEnhancedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startCamera = async () => {
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      toast({
        title: "Câmera indisponível",
        description: err?.message || "Permita o acesso à câmera nas configurações do navegador.",
        variant: "destructive",
      });
      onClose();
    }
  };

  useEffect(() => {
    if (open && !previewUrl) startCamera();
    return () => {
      if (!open) {
        stopStream();
        setPreviewUrl(null);
        setEnhancedFile(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facingMode]);

  const snap = async () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    setBusy(true);
    try {
      const rawBlob: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", 0.95)
      );
      const rawFile = new File([rawBlob], fileName, { type: "image/jpeg" });
      const enhanced = await enhanceImage(rawFile, fileName);
      setEnhancedFile(enhanced);
      setPreviewUrl(URL.createObjectURL(enhanced));
      stopStream();
    } catch (err: any) {
      toast({ title: "Erro ao processar foto", description: err?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setEnhancedFile(null);
    startCamera();
  };

  const confirm = async () => {
    if (!enhancedFile) return;
    setBusy(true);
    try {
      await onCapture(enhancedFile);
      handleClose();
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    stopStream();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setEnhancedFile(null);
    onClose();
  };

  const flipCamera = () => setFacingMode((f) => (f === "environment" ? "user" : "environment"));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            {previewUrl ? "Pré-visualização (auto-aprimorada)" : "Tirar foto"}
          </DialogTitle>
        </DialogHeader>

        <div className="relative bg-black rounded-md overflow-hidden aspect-[3/4] sm:aspect-video">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
          ) : (
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          )}
          {busy && (
            <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              <p className="text-xs text-foreground">Aprimorando qualidade...</p>
            </div>
          )}
        </div>

        {previewUrl ? (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={retake} disabled={busy}>
              <RefreshCw className="w-4 h-4 mr-1" /> Repetir
            </Button>
            <Button className="flex-1" onClick={confirm} disabled={busy}>
              <Check className="w-4 h-4 mr-1" /> Usar foto
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={flipCamera} title="Virar câmera" disabled={busy}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button className="flex-1" onClick={snap} disabled={busy}>
              <Camera className="w-4 h-4 mr-1" /> Capturar
            </Button>
            <Button variant="ghost" size="icon" onClick={handleClose} title="Fechar">
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground text-center">
          ✨ A foto é otimizada automaticamente: brilho, contraste, cor e nitidez.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default CameraCapture;
