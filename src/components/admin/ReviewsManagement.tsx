import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Star, Check, Trash2, MessageSquare } from "lucide-react";

type Review = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  rating: number;
  comment: string | null;
  approved: boolean;
  created_at: string;
};

const ReviewsManagement = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending");
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setReviews(data);
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: string) => {
    await supabase.from("reviews").update({ approved: true }).eq("id", id);
    toast({ title: "Avaliação aprovada ✅" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta avaliação?")) return;
    await supabase.from("reviews").delete().eq("id", id);
    toast({ title: "Avaliação excluída" });
    load();
  };

  const filtered = reviews.filter((r) => {
    if (filter === "pending") return !r.approved;
    if (filter === "approved") return r.approved;
    return true;
  });

  const pendingCount = reviews.filter((r) => !r.approved).length;

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Avaliações</h3>
          {pendingCount > 0 && (
            <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full font-bold">
              {pendingCount} novas
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {(["pending", "approved", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-md transition ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/70"
              }`}
            >
              {f === "pending" ? "Pendentes" : f === "approved" ? "Aprovadas" : "Todas"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhuma avaliação {filter === "pending" ? "pendente" : filter === "approved" ? "aprovada" : ""}.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-background/50 border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-bold text-foreground">{r.customer_name}</p>
                  {r.customer_phone && (
                    <p className="text-xs text-muted-foreground">{r.customer_phone}</p>
                  )}
                </div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`w-4 h-4 ${
                        n <= r.rating ? "fill-primary text-primary" : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
              </div>
              {r.comment && <p className="text-sm text-foreground mb-3">{r.comment}</p>}
              <div className="flex gap-2">
                {!r.approved && (
                  <Button size="sm" onClick={() => approve(r.id)} className="flex-1">
                    <Check className="w-4 h-4 mr-1" /> Aprovar
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsManagement;
