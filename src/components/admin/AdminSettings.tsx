import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Trash2, Plus, Upload, Image as ImageIcon } from "lucide-react";

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  icon: string | null;
  duration_minutes: number;
  image_path: string | null;
};

const AdminSettings = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Service>>({});
  const [newService, setNewService] = useState({ name: "", description: "", price: 0, icon: "", duration_minutes: 30 });
  const [showAdd, setShowAdd] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("*").order("name");
    if (data) setServices(data as Service[]);
  };

  const startEdit = (s: Service) => {
    setEditingId(s.id);
    setEditData({ name: s.name, description: s.description, price: s.price, icon: s.icon, duration_minutes: s.duration_minutes });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from("services").update(editData).eq("id", editingId);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
    } else {
      toast({ title: "Salvo!", description: "Serviço atualizado." });
      setEditingId(null);
      fetchServices();
    }
  };

  const deleteService = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
    } else {
      toast({ title: "Excluído", description: "Serviço removido." });
      fetchServices();
    }
  };

  const addService = async () => {
    if (!newService.name) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("services").insert({
      name: newService.name,
      description: newService.description || null,
      price: newService.price,
      icon: newService.icon || null,
      duration_minutes: newService.duration_minutes,
    });
    if (error) {
      toast({ title: "Erro", description: "Não foi possível adicionar.", variant: "destructive" });
    } else {
      toast({ title: "Adicionado!", description: "Novo serviço criado." });
      setNewService({ name: "", description: "", price: 0, icon: "", duration_minutes: 30 });
      setShowAdd(false);
      fetchServices();
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Gerenciar Serviços</h2>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-1" />
          Novo
        </Button>
      </div>

      {showAdd && (
        <div className="bg-background border border-border rounded-md p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Emoji ✂️" value={newService.icon} onChange={(e) => setNewService({ ...newService, icon: e.target.value })} />
            <Input placeholder="Nome" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} />
          </div>
          <Input placeholder="Descrição" value={newService.description} onChange={(e) => setNewService({ ...newService, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" placeholder="Preço" value={newService.price || ""} onChange={(e) => setNewService({ ...newService, price: Number(e.target.value) })} />
            <Input type="number" placeholder="Duração (min)" value={newService.duration_minutes || ""} onChange={(e) => setNewService({ ...newService, duration_minutes: Number(e.target.value) })} />
          </div>
          <Button onClick={addService} size="sm" className="w-full">
            <Save className="w-4 h-4 mr-1" /> Adicionar Serviço
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {services.map((s) => (
          <div key={s.id} className="bg-background border border-border rounded-md p-3">
            {editingId === s.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input value={editData.icon || ""} onChange={(e) => setEditData({ ...editData, icon: e.target.value })} placeholder="Emoji" />
                  <Input value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} placeholder="Nome" />
                </div>
                <Input value={editData.description || ""} onChange={(e) => setEditData({ ...editData, description: e.target.value })} placeholder="Descrição" />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" value={editData.price || ""} onChange={(e) => setEditData({ ...editData, price: Number(e.target.value) })} placeholder="Preço" />
                  <Input type="number" value={editData.duration_minutes || ""} onChange={(e) => setEditData({ ...editData, duration_minutes: Number(e.target.value) })} placeholder="Duração (min)" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit} className="flex-1">
                    <Save className="w-3 h-3 mr-1" /> Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {s.image_path ? (
                    <img
                      src={supabase.storage.from("services").getPublicUrl(s.image_path).data.publicUrl}
                      alt={s.name}
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <span className="text-2xl w-12 h-12 flex items-center justify-center bg-secondary rounded flex-shrink-0">
                      {s.icon || "✂️"}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-foreground text-sm truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">R$ {s.price.toFixed(2)} • {s.duration_minutes} min</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    id={`svc-img-${s.id}`}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        toast({ title: "Máx 5 MB", variant: "destructive" });
                        return;
                      }
                      const ext = file.name.split(".").pop();
                      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                      const { error: upErr } = await supabase.storage.from("services").upload(path, file);
                      if (upErr) {
                        toast({ title: "Erro upload", description: upErr.message, variant: "destructive" });
                        return;
                      }
                      if (s.image_path) await supabase.storage.from("services").remove([s.image_path]);
                      await supabase.from("services").update({ image_path: path }).eq("id", s.id);
                      toast({ title: "Foto atualizada ✅" });
                      fetchServices();
                    }}
                  />
                  <Button size="sm" variant="ghost" onClick={() => document.getElementById(`svc-img-${s.id}`)?.click()} title="Foto">
                    <ImageIcon className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(s)} className="text-xs">Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteService(s.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSettings;
