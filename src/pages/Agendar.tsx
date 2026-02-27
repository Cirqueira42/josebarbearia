import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Scissors, Calendar, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Service = Tables<"services">;

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
];

const Agendar = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [blockedTimes, setBlockedTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("services").select("*").then(({ data }) => {
      if (data) setServices(data);
    });
  }, []);

  useEffect(() => {
    if (!date) return;
    // Fetch blocked times for selected date
    supabase
      .from("appointments")
      .select("appointment_time")
      .eq("appointment_date", date)
      .in("status", ["confirmed", "completed", "pending"])
      .then(({ data }) => {
        if (data) setBlockedTimes(data.map((d) => d.appointment_time));
      });
    setTime("");
  }, [date]);

  const selectedService = services.find((s) => s.id === serviceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId || !date || !time) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { error } = await supabase.from("appointments").insert({
      service_id: serviceId,
      service_name: selectedService?.name || "",
      customer_name: name,
      customer_email: email || null,
      customer_phone: phone,
      appointment_date: date,
      appointment_time: time,
    });

    if (error) {
      toast({ title: "Erro ao agendar", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Send WhatsApp message
    const msg = encodeURIComponent(
      `📅 Novo agendamento!\n\nCliente: ${name}\nTelefone: ${phone}\n\nServiço: ${selectedService?.name}\nData: ${new Date(date + "T12:00:00").toLocaleDateString("pt-BR")}\nHora: ${time}\n\nProfissional: JOSE GILMARIO`
    );
    window.open(`https://wa.me/5516997369740?text=${msg}`, "_blank");

    toast({ title: "Agendamento realizado! ✅", description: "Você será redirecionado ao WhatsApp." });

    // Reset
    setName("");
    setEmail("");
    setPhone("");
    setServiceId("");
    setDate("");
    setTime("");
    setLoading(false);
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8">
        <a href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao site
        </a>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border border-primary/30 mb-4">
            <Calendar className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold font-display text-gradient">Agendar Horário</h1>
          <p className="text-muted-foreground mt-1">Escolha o serviço e horário</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
          </div>
          <div className="space-y-2">
            <Label>Telefone *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(16) 99999-9999" required />
          </div>
          <div className="space-y-2">
            <Label>Serviço *</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.icon} {s.name} – R$ {s.price.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data *</Label>
            <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          {date && (
            <div className="space-y-2">
              <Label>Horário *</Label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const blocked = blockedTimes.includes(slot);
                  return (
                    <Button
                      key={slot}
                      type="button"
                      variant={time === slot ? "default" : "outline"}
                      size="sm"
                      disabled={blocked}
                      onClick={() => setTime(slot)}
                      className={blocked ? "opacity-40 line-through" : ""}
                    >
                      {slot}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
          <Button type="submit" className="w-full glow-primary" disabled={loading}>
            <Scissors className="w-4 h-4 mr-2" />
            {loading ? "Agendando..." : "Confirmar Agendamento"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Agendar;
