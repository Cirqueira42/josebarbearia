import { useEffect, useState, useCallback } from "react";
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
import { ArrowLeft, Check } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PhotoCarousel from "@/components/PhotoCarousel";

import serviceCorte from "@/assets/service-corte.jpg";
import serviceBarba from "@/assets/service-barba.jpg";
import serviceCorteBarba from "@/assets/service-corte-barba.jpg";
import serviceSobrancelha from "@/assets/service-sobrancelha.jpg";
import serviceInfantil from "@/assets/service-infantil.jpg";

const SERVICE_IMAGES: Record<string, string> = {
  "corte": serviceCorte,
  "barba": serviceBarba,
  "corte + barba": serviceCorteBarba,
  "sobrancelha": serviceSobrancelha,
  "corte infantil": serviceInfantil,
};

const getServiceImage = (name: string) => {
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(SERVICE_IMAGES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return serviceCorte; // fallback
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  icon: string | null;
  duration_minutes: number;
};

type BlockedSlot = {
  blocked_date: string;
  blocked_time: string | null;
};

type BookedSlot = {
  appointment_time: string;
  service_name: string;
  duration_minutes: number;
};

const BARBER_PHONE = "5516997369740";
const BOOKING_URL = "https://barber-hub-finder.lovable.app/agendar";
const GOOGLE_MAPS_LINK = "https://maps.app.goo.gl/JVahTmuAYLfAiyx57";
const ADDRESS = "Av. Otávio Rangel, 477 - Vila Cecap\nGuariba - SP, 14845-106";

const DAYS_PT = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const formatFullDate = (dateStr: string) => {
  const d = new Date(dateStr + "T12:00:00");
  const dayName = DAYS_PT[d.getDay()];
  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTHS_PT[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName}, ${day} de ${month} de ${year}`;
};

const generateBookingCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
};

const generateTimeSlots = () => {
  const slots: string[] = [];
  // Morning: 8:00 - 11:50, Afternoon: 13:00 - 19:00
  for (let h = 8; h < 12; h++) {
    for (let m = 0; m < 60; m += 10) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  for (let h = 13; h < 19; h++) {
    for (let m = 0; m < 60; m += 10) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  // 19:00
  slots.push("19:00");
  return slots;
};

const ALL_TIME_SLOTS = generateTimeSlots();

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const getBrazilNow = () => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
};

const Agendar = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
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
  const [searchParams] = useSearchParams();

  // Load saved customer data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("jose_customer");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.name) setCustomerName(data.name);
        if (data.phone) setCustomerPhone(data.phone);
        if (data.email) setCustomerEmail(data.email);
      } catch {}
    }
  }, []);

  useEffect(() => {
    fetchServices();
    fetchBlockedSlots();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchBookedSlots(selectedDate);
    }
  }, [selectedDate]);

  // Auto-select service from URL param
  useEffect(() => {
    const serviceId = searchParams.get("service");
    if (serviceId && services.length > 0) {
      const s = services.find((srv) => srv.id === serviceId);
      if (s) setSelectedService(s);
    }
  }, [searchParams, services]);

  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("*").order("name");
    if (data) setServices(data as Service[]);
  };

  const fetchBlockedSlots = async () => {
    const { data } = await supabase.from("blocked_slots").select("blocked_date, blocked_time");
    if (data) setBlockedSlots(data);
  };

  const fetchBookedSlots = async (date: string) => {
    const { data } = await supabase
      .from("appointments")
      .select("appointment_time, service_name")
      .eq("appointment_date", date)
      .in("status", ["pending", "confirmed"]);

    if (data) {
      // Map booked slots with duration from services
      const mapped = data.map((a) => {
        const svc = services.find((s) => s.name === a.service_name);
        return {
          appointment_time: a.appointment_time,
          service_name: a.service_name,
          duration_minutes: svc?.duration_minutes || 30,
        };
      });
      setBookedSlots(mapped);
    }
  };

  const isDateBlocked = (date: string) => {
    return blockedSlots.some((s) => s.blocked_date === date && s.blocked_time === null);
  };

  const isSunday = (date: string) => {
    const d = new Date(date + "T12:00:00");
    return d.getDay() === 0;
  };

  const isTimeAvailable = useCallback((date: string, time: string) => {
    // Blocked by admin
    if (blockedSlots.some((s) => s.blocked_date === date && (s.blocked_time === time || s.blocked_time === null))) {
      return false;
    }

    const slotMin = timeToMinutes(time);
    const serviceDuration = selectedService?.duration_minutes || 30;

    // Check if this slot conflicts with any booked appointment
    for (const booked of bookedSlots) {
      const bookedStart = timeToMinutes(booked.appointment_time);
      const bookedEnd = bookedStart + booked.duration_minutes + 10; // +10 buffer
      const newEnd = slotMin + serviceDuration;

      // Overlap check: new slot's range overlaps with booked range
      if (slotMin < bookedEnd && newEnd > bookedStart) {
        return false;
      }
    }

    return true;
  }, [blockedSlots, bookedSlots, selectedService]);

  const getAvailableTimes = () => {
    if (!selectedDate || !selectedService) return [];

    const brazilNow = getBrazilNow();
    const todayStr = brazilNow.toISOString().split("T")[0];

    return ALL_TIME_SLOTS.filter((t) => {
      if (!isTimeAvailable(selectedDate, t)) return false;
      // If today, hide past times
      if (selectedDate === todayStr) {
        const nowMinutes = brazilNow.getHours() * 60 + brazilNow.getMinutes();
        if (timeToMinutes(t) <= nowMinutes) return false;
      }
      return true;
    });
  };

  const getMinDate = () => {
    const brazilNow = getBrazilNow();
    return brazilNow.toISOString().split("T")[0];
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const getDayOfWeek = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return DAYS_PT[d.getDay()];
  };

  const sendTelegram = async (message: string) => {
    try {
      await supabase.functions.invoke("send-telegram", { body: { message } });
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !customerName || !customerPhone || !selectedDate || !selectedTime) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    // Save customer data to localStorage
    localStorage.setItem("jose_customer", JSON.stringify({
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
    }));

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

      const dateFormatted = new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR");
      const dayName = getDayOfWeek(selectedDate);
      const payLabel = paymentMethod ? `\nPagamento: ${paymentMethod}` : "";

      // Send WhatsApp to barber
      const msg = encodeURIComponent(
        `📅 Novo Agendamento!\n\nCliente: ${customerName}\nTelefone: ${customerPhone}\n\nServiço: ${selectedService.name}\nValor: R$ ${selectedService.price.toFixed(2)}\nData: ${dateFormatted} (${dayName})\nHora: ${selectedTime}${payLabel}\n\n⚡ Acesse o painel para confirmar.`
      );
      window.open(`https://wa.me/${BARBER_PHONE}?text=${msg}`, "_blank");

      // Send Telegram notification
      sendTelegram(
        `📅 <b>Novo Agendamento!</b>\n\n👤 Cliente: ${customerName}\n📞 Telefone: ${customerPhone}\n\n💈 Serviço: ${selectedService.name}\n💰 Valor: R$ ${selectedService.price.toFixed(2)}\n📅 Data: ${dateFormatted} (${dayName})\n🕐 Hora: ${selectedTime}${payLabel}\n\n⚡ Acesse o painel para confirmar.`
      );
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
        <PhotoCarousel overlay="heavy" />
        <div className="relative z-10 bg-card/90 backdrop-blur border border-border rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold font-display text-foreground mb-2">
            Agendamento Confirmado!
          </h2>
          <p className="text-muted-foreground mb-2">
            {selectedService?.name} - R$ {selectedService?.price.toFixed(2)}
          </p>
          <p className="text-primary font-medium mb-6">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR")} ({getDayOfWeek(selectedDate)}) às {selectedTime}
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
    <div className="min-h-screen bg-background relative">
      {/* Carousel background on service selection */}
      {!selectedService && (
        <div className="absolute inset-0 overflow-hidden">
          <PhotoCarousel overlay="heavy" />
        </div>
      )}

      <header className="relative z-10 bg-primary/90 backdrop-blur px-4 py-6">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => selectedService ? setSelectedService(null) : navigate("/")} className="text-primary-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold font-display text-primary-foreground">
              {selectedService ? `Agendar ${selectedService.name}` : "Agendar Horário"}
            </h1>
            {selectedService && (
              <p className="text-primary-foreground/80 text-sm">
                {selectedService.description} • {selectedService.duration_minutes} min
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-6">
        {!selectedService ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground mb-4 bg-background/60 backdrop-blur-sm inline-block px-3 py-1 rounded-lg">Escolha o serviço</h2>
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedService(s)}
                className="w-full relative overflow-hidden rounded-lg text-left hover:ring-2 hover:ring-primary/50 transition-all shadow-lg group h-32"
              >
                <img src={getServiceImage(s.name)} alt={s.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/50 to-transparent" />
                <div className="relative z-10 flex items-center gap-4 p-4 h-full">
                  <span className="text-3xl">{s.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg drop-shadow-lg">{s.name}</h3>
                    <p className="text-foreground/80 text-sm drop-shadow">{s.description}</p>
                    <p className="text-foreground/60 text-xs mt-1">⏱ {s.duration_minutes} min</p>
                  </div>
                  <span className="text-primary font-bold text-lg drop-shadow-lg">R$ {s.price.toFixed(2)}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="relative">
            {/* Carousel background for form */}
            <div className="absolute inset-0 -mx-4 -my-6 overflow-hidden rounded-lg">
              <PhotoCarousel overlay="heavy" />
            </div>

            <form onSubmit={handleSubmit} className="relative z-10 space-y-5 bg-card/50 backdrop-blur-sm rounded-xl p-5 border border-border/50">
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
                    if (isSunday(date)) {
                      toast({ title: "Domingo fechado!", description: "Não atendemos aos domingos.", variant: "destructive" });
                      return;
                    }
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Agendar;
