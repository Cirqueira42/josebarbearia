import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Users, Save, Copy, ExternalLink } from "lucide-react";

type Barber = {
  id: string;
  name: string;
  enabled: boolean;
};

const SITE_URL = "https://barber-hub-finder.lovable.app";

const BarberManagement = () => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    const { data } = await supabase.from("barbers").select("id, name, enabled").order("created_at");
    if (data) setBarbers(data);
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    await supabase.from("barbers").update({ enabled }).eq("id", id);
    setBarbers((prev) => prev.map((b) => (b.id === id ? { ...b, enabled } : b)));
    toast({ title: enabled ? "Barbeiro ativado" : "Barbeiro desativado" });
  };

  const startEdit = (b: Barber) => {
    setEditingId(b.id);
    setEditName(b.name);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await supabase.from("barbers").update({ name: editName.trim() }).eq("id", editingId);
    setBarbers((prev) => prev.map((b) => (b.id === editingId ? { ...b, name: editName.trim() } : b)));
    setEditingId(null);
    toast({ title: "Nome atualizado!" });
  };

  // The first barber is the main one (José Gilmário), second is the extra
  const mainBarber = barbers[0];
  const secondBarber = barbers[1];

  const addSecondBarber = async () => {
    const { error } = await supabase.from("barbers").insert({ name: "Novo Barbeiro", enabled: false });
    if (!error) {
      fetchBarbers();
      toast({ title: "2º barbeiro adicionado!" });
    }
  };

  const getBarberLink = (id: string) => `${SITE_URL}/barbeiro/${id}`;

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Barbeiros</h2>
      </div>

      <div className="space-y-3">
        {barbers.map((b, idx) => (
          <div key={b.id} className="bg-background border border-border rounded-md p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                {editingId === b.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Button size="sm" onClick={saveEdit} className="h-8">
                      <Save className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-foreground text-sm">
                      {b.name} {idx === 0 && <span className="text-xs text-muted-foreground">(Principal)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {b.enabled ? "✅ Ativo" : "❌ Inativo"}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {editingId !== b.id && (
                  <Button size="sm" variant="ghost" onClick={() => startEdit(b)} className="text-xs h-7">
                    Editar
                  </Button>
                )}
                {/* Don't allow disabling the main barber */}
                {idx > 0 && (
                  <Switch
                    checked={b.enabled}
                    onCheckedChange={(v) => toggleEnabled(b.id, v)}
                  />
                )}
              </div>
            </div>

            {/* Share link for second barber */}
            {idx > 0 && b.enabled && (
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(getBarberLink(b.id));
                    toast({ title: "Link copiado!", description: getBarberLink(b.id) });
                  }}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copiar Link
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => window.open(getBarberLink(b.id), "_blank")}
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        ))}

        {!secondBarber && (
          <Button variant="outline" onClick={addSecondBarber} className="w-full">
            + Adicionar 2º Barbeiro
          </Button>
        )}
      </div>
    </div>
  );
};

export default BarberManagement;
