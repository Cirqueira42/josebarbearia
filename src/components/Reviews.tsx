import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Review = {
  id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

const Reviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, customer_name, rating, comment, created_at")
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .limit(12);
      if (data) setReviews(data);
    };
    load();
  }, []);

  const avg =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : "5.0";

  return (
    <section className="section-padding bg-background">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold font-display text-gradient text-center mb-2">
          Avaliações dos Clientes
        </h2>
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`w-5 h-5 ${
                  n <= Math.round(Number(avg)) ? "fill-primary text-primary" : "text-muted-foreground"
                }`}
              />
            ))}
          </div>
          <span className="text-foreground font-bold">{avg}</span>
          {reviews.length > 0 && (
            <span className="text-muted-foreground text-sm">({reviews.length})</span>
          )}
        </div>
        <p className="text-muted-foreground text-center mb-8">
          O que nossos clientes estão dizendo
        </p>

        {reviews.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Ainda não há avaliações. Seja o primeiro a avaliar!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {reviews.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-foreground">{r.customer_name}</h4>
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
                {r.comment && <p className="text-muted-foreground text-sm">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="text-center">
          <Button asChild size="lg" className="font-bold">
            <Link to="/avaliar">⭐ Deixar minha avaliação</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Reviews;
