import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

type UnseenAppointment = {
  id: string;
  customer_name: string;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
};

const NOTIFICATION_SOUND_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkZeLgHBkZXF+ipWTjIF0aGRxfouYl4+Dd2lld4KQl5aPhHdsaHWBjpaWj4Z4b2p1go+WlY+IfHFreYOPlpSPhX5xa3iDjpWUj4V+c2x5g46VlI+Gf3NteYOOlZOPh4B0bnqDjpWTj4eBdW96g46Vk4+IgnZwe4OOlZOPiIN3cXuDjpWTj4mEeHJ8g46VkpCKhXlzfIOOlZKQi4Z6dH2DjpWRkIuHe3V+g42VkZCMiHx2foONlJGQjIl9d3+DjZSRkI2KfniAg42UkJCOi399gYONlJCQjox/foGDjZSQkI+MgH+Bg42Uj5CPjYGAgYONlI+Qj42CgYGDjZSOkI+OgoGBg42UjpCPjoOCgoONlI6Pj4+Dg4KDjZSOj4+PhISCg42UjY+Pj4WEg4ONlI2Oj4+GhYODjZSNjo6PhoaEg42TjY6Oj4eGhIOMk42Ojo+HhoWDjJONjY6Ph4eFg4yTjY2Nj4iHhYOMk42NjY+IiIWDjJONjY2PiIiFg4yTjYyNj4mJhYOMk4yMjY+JiYaDjJOMjI2PiYmGg4yTjIyMj4qKhoOMk4yMjI+Kioa=";

const AdminNotification = () => {
  const [unseen, setUnseen] = useState<UnseenAppointment[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    fetchUnseen();

    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointments" },
        () => {
          fetchUnseen();
          playSound();
        }
      )
      .subscribe();

    // Poll every 30s as backup
    const interval = setInterval(fetchUnseen, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const fetchUnseen = async () => {
    const { data } = await supabase
      .from("appointments")
      .select("id, customer_name, service_name, appointment_date, appointment_time")
      .eq("seen_by_admin", false)
      .order("created_at", { ascending: false });

    if (data) {
      if (data.length > prevCountRef.current && prevCountRef.current > 0) {
        playSound();
      }
      prevCountRef.current = data.length;
      setUnseen(data);
    }
  };

  const playSound = () => {
    try {
      // Use Web Audio API for a notification beep
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.value = 0.3;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
      
      // Second beep
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1000;
        osc2.type = "sine";
        gain2.gain.value = 0.3;
        osc2.start();
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc2.stop(ctx.currentTime + 0.5);
      }, 200);
    } catch {}
  };

  const markSeen = async (id: string) => {
    await supabase.from("appointments").update({ seen_by_admin: true }).eq("id", id);
    setUnseen((prev) => prev.filter((a) => a.id !== id));
  };

  const markAllSeen = async () => {
    const ids = unseen.map((a) => a.id);
    if (ids.length === 0) return;
    await supabase.from("appointments").update({ seen_by_admin: true }).in("id", ids);
    setUnseen([]);
  };

  if (unseen.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full space-y-2 animate-in slide-in-from-right">
      <div className="bg-primary text-primary-foreground rounded-lg p-3 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 animate-bounce" />
          <span className="font-bold text-sm">{unseen.length} novo(s) agendamento(s)</span>
        </div>
        <Button size="sm" variant="secondary" onClick={markAllSeen} className="text-xs h-7">
          Marcar todos vistos
        </Button>
      </div>
      {unseen.slice(0, 3).map((a) => (
        <div
          key={a.id}
          className="bg-card border border-primary/50 rounded-lg p-3 shadow-lg flex items-start justify-between gap-2"
        >
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-sm truncate">
              📅 {a.customer_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {a.service_name} • {new Date(a.appointment_date + "T12:00:00").toLocaleDateString("pt-BR")} às {a.appointment_time}
            </p>
          </div>
          <button onClick={() => markSeen(a.id)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      {unseen.length > 3 && (
        <p className="text-xs text-muted-foreground text-center">
          +{unseen.length - 3} mais
        </p>
      )}
    </div>
  );
};

export default AdminNotification;
