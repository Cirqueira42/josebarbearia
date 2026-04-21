import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Star, Check } from "lucide-react";

const Avaliar = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || rating < 1) {
      toast({ title: "Preencha o nome e dê uma nota", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      customer_name: name,
      customer_phone: phone.replace(/\D/g, "") || null,
      rating,
      comment: comment || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao enviar avaliação", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-5">
            <Check className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold font-display text-foreground mb-2">
            Obrigado pela avaliação! 🙏
          </h2>
          <p className="text-muted-foreground mb-6">
            Sua opinião é muito importante para nós. Após aprovação ela aparecerá no site.
          </p>
          <Button onClick={() => navigate("/")} className="w-full py-6 text-lg font-bold">
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary/90 backdrop-blur px-4 py-6">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-primary-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold font-display text-primary-foreground">
            Deixar Avaliação
          </h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl p-5 border border-border">
          <div>
            <Label className="mb-2 block">Sua nota</Label>
            <div className="flex justify-center gap-2 py-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="transition-transform hover:scale-110"
                  aria-label={`${n} estrelas`}
                >
                  <Star
                    className={`w-10 h-10 ${
                      n <= (hover || rating)
                        ? "fill-primary text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {["", "Ruim", "Razoável", "Bom", "Muito Bom", "Excelente"][rating]}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-2 block">👤 Seu nome</Label>
            <Input
              placeholder="Como gostaria de aparecer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
            />
          </div>

          <div>
            <Label className="mb-2 block">
              📱 Telefone <span className="text-muted-foreground text-xs">(opcional)</span>
            </Label>
            <Input
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
            />
          </div>

          <div>
            <Label className="mb-2 block">
              💬 Comentário <span className="text-muted-foreground text-xs">(opcional)</span>
            </Label>
            <Textarea
              placeholder="Conte como foi sua experiência..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">{comment.length}/500</p>
          </div>

          <Button type="submit" disabled={submitting} className="w-full py-6 text-lg font-bold">
            {submitting ? "Enviando..." : "Enviar Avaliação"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Avaliar;
