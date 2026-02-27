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
import { useToast } from "@/hooks/use-toast";
import { Scissors, ArrowLeft, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  icon: string | null;
};

type BlockedSlot = {
  blocked_date: string;
  blocked_time: string | null;
};

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00",
];

const Agendar = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchServices();
    fetchBlockedSlots();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchBookedSlots(selectedDate);
    }
  }, [selectedDate]);

  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("*").order("name");
    if (data) setServices(data);
  };

  const fetchBlockedSlots = async () => {
    const { data } = await supabase.from("blocked_slots").select("blocked_date, blocked_time");
    if (data) setBlockedSlots(data);
  };

  const fetchBookedSlots = async (date: string) => {
    const { data } = await supabase
      .from("appointments")
      .select("appointment_time")
      .eq("appointment_date", date)
      .in("status", ["pending", "confirmed"]);
    if (data) setBookedSlots(data.map((a) => a.appointment_time));
  };

  const isDateBlocked = (date: string) => {
    return blockedSlots.some((s) => s.blocked_date === date && s.blocked_time === null);
  };

  const isTimeBlocked = (date: string, time: string) => {
    return (
      blockedSlots.some(
        (s) => s.blocked_date === date && (s.blocked_time === time || s.blocked_time === null)
      ) || bookedSlots.includes(time)
    );
  };

  const getAvailableTimes = () => {
    if (!selectedDate) return [];
    return timeSlots.filter((t) => !isTimeBlocked(selectedDate, t));
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !customerName || !customerPhone || !selectedDate || !selectedTime) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("appointments").insert({
      customer_name: customerName,
      customer_phone: customerPhone.replace(/\D/g, ""),
      customer_email: customerEmail || null,
      service_id: selectedService.id,
      service_name: selectedService.name,
      appointment_date: selectedDate,
      appointment_time: selectedTime,
    });

    if (error) {
      toast({ title: "Erro ao agendar", description: "Tente novamente.", variant: "destructive" });
    } else {
      setSuccess(true);
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold font-display text-foreground mb-2">
            Agendamento Confirmado!
          </h2>
          <p className="text-muted-foreground mb-2">
            {selectedService?.name} - {selectedService && `R$ ${selectedService.price.toFixed(2)}`}
          </p>
          <p className="text-primary font-medium mb-6">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR")} às {selectedTime}
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            Aguarde a confirmação do barbeiro. Você receberá uma mensagem no WhatsApp.
          </p>
          <Button onClick={() => navigate("/")} className="w-full">
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary px-4 py-6">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-primary-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold font-display text-primary-foreground">
              {selectedService ? `Agendar ${selectedService.name}` : "Agendar Horário"}
            </h1>
            {selectedService && (
              <p className="text-primary-foreground/80 text-sm">{selectedService.description}</p>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Step 1: Choose service */}
        {!selectedService ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground mb-4">Escolha o serviço</h2>
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedService(s)}
                className="w-full bg-card border border-border rounded-lg p-4 text-left hover:border-primary/50 transition-all flex items-center gap-4"
              >
                <span className="text-3xl">{s.icon}</span>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">{s.name}</h3>
                  <p className="text-muted-foreground text-sm">{s.description}</p>
                </div>
                <span className="text-primary font-bold">R$ {s.price.toFixed(2)}</span>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <button
              type="button"
              onClick={() => setSelectedService(null)}
              className="text-sm text-primary hover:underline mb-2"
            >
              ← Trocar serviço
            </button>

            <div>
              <Label className="flex items-center gap-2 mb-2">📱 Telefone</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                required
              />
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">👤 Nome Completo</Label>
              <Input
                placeholder="Seu nome"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">
                ✉️ Email <span className="text-muted-foreground text-xs">(opcional)</span>
              </Label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">📅 Data</Label>
              <Input
                type="date"
                min={getMinDate()}
                value={selectedDate}
                onChange={(e) => {
                  const date = e.target.value;
                  if (isDateBlocked(date)) {
                    toast({ title: "Data indisponível", description: "Este dia está bloqueado.", variant: "destructive" });
                    return;
                  }
                  setSelectedDate(date);
                  setSelectedTime("");
                }}
                required
              />
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">🕐 Horário</Label>
              <Select
                value={selectedTime}
                onValueChange={setSelectedTime}
                disabled={!selectedDate}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedDate ? "Selecione o horário" : "Selecione uma data primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableTimes().length === 0 ? (
                    <SelectItem value="none" disabled>
                      Nenhum horário disponível
                    </SelectItem>
                  ) : (
                    getAvailableTimes().map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">
                💳 Forma de Pagamento <span className="text-muted-foreground text-xs">(opcional)</span>
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full py-6 text-lg font-bold"
            >
              {submitting ? "Agendando..." : "Confirmar Agendamento"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Agendar;
