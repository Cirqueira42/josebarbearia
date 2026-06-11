import { useEffect, useState, useCallback } from "react";
import { flushSync } from "react-dom";
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
import { ArrowLeft, Check, Award, Gift, Star } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PhotoCarousel from "@/components/PhotoCarousel";
import { getBrazilTodayStr, getBrazilNowMinutes } from "@/lib/brazilTime";
import { buildWhatsAppLink } from "@/lib/whatsapp";

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

type Barber = {
  id: string;
  name: string;
  enabled: boolean;
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
const BOOKING_URL = "https://josebarbearia.lovable.app/agendar";
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

// Removido: substituído por utilitários em @/lib/brazilTime para evitar bugs de fuso.

const Agendar = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [whatsAppRedirectUrl, setWhatsAppRedirectUrl] = useState("");
  const [lastLookedUpPhone, setLastLookedUpPhone] = useState("");
  const [confirmedNumber, setConfirmedNumber] = useState<number | null>(null);
  const [confirmedBarber, setConfirmedBarber] = useState<string>("");
  const [loyalty, setLoyalty] = useState<{ total: number; available: number; progress: number; goal: number; remaining: number } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const lookupCustomer = useCallback(async (phone: string) => {
    if (!phone || phone.length < 10 || phone === lastLookedUpPhone) return;

    setLastLookedUpPhone(phone);
    const { data } = await supabase.rpc("lookup_customer_by_phone", { _phone: phone });

    if (data && data.length > 0) {
      const found = data[0];
      if (found.customer_name) setCustomerName(found.customer_name);
      if (found.customer_email) setCustomerEmail(found.customer_email);
      toast({ title: "Cliente encontrado! ✅", description: `Bem-vindo de volta, ${found.customer_name}!` });
    }

    // Buscar progresso de fidelidade
    const { data: lp } = await supabase.rpc("get_loyalty_progress", { _phone: phone });
    if (lp && lp.length > 0) {
      const r: any = lp[0];
      const progress = r.progress ?? 0;
      const goal = r.goal ?? 10;
      setLoyalty({
        total: r.total_services ?? 0,
        available: r.available ?? 0,
        progress,
        goal,
        remaining: Math.max(goal - progress, 0),
      });
    } else {
      setLoyalty({ total: 0, available: 0, progress: 0, goal: 10, remaining: 10 });
    }
  }, [lastLookedUpPhone, toast]);

  useEffect(() => {
    fetchServices();
    fetchBlockedSlots();
    fetchBarbers();
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

  const fetchBarbers = async () => {
    const { data } = await supabase.from("barbers").select("id, name, enabled").eq("enabled", true).order("created_at");
    if (data) setBarbers(data);
  };

  const fetchBookedSlots = async (date: string) => {
    // Use secure RPC that returns only time/service info (no customer PII)
    const { data } = await supabase.rpc("get_booked_slots", { _date: date });

    if (data) {
      const mapped = data.map((a: any) => {
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

    const todayStr = getBrazilTodayStr();

    return ALL_TIME_SLOTS.filter((t) => {
      if (!isTimeAvailable(selectedDate, t)) return false;
      // If today, hide past times
      if (selectedDate === todayStr) {
        const nowMinutes = getBrazilNowMinutes();
        if (timeToMinutes(t) <= nowMinutes) return false;
      }
      return true;
    });
  };

  const getMinDate = () => getBrazilTodayStr();

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
    if (barbers.length > 1 && !selectedBarber) {
      toast({ title: "Selecione um barbeiro", variant: "destructive" });
      return;
    }

    const barber = selectedBarber || barbers[0];

    setSubmitting(true);
    const { data: inserted, error } = await supabase.from("appointments").insert({
      customer_name: customerName,
      customer_phone: customerPhone.replace(/\D/g, ""),
      customer_email: customerEmail || null,
      service_id: selectedService.id,
      service_name: selectedService.name,
      appointment_date: selectedDate,
      appointment_time: selectedTime,
      barber_id: barber?.id || null,
      barber_name: barber?.name || "José Gilmário",
    }).select("appointment_number, barber_name").single();

    if (error) {
      toast({ title: "Erro ao agendar", description: "Tente novamente.", variant: "destructive" });
    } else {
      const fullDate = formatFullDate(selectedDate);
      
      const payLabel = paymentMethod ? `\n💳 Pagamento: ${paymentMethod}` : "";

      // Use the real sequential number returned by the database
      const appointmentNum = inserted?.appointment_number ?? 0;
      const barberNameMsg = inserted?.barber_name || barber?.name || "José Gilmário";

      // Send WhatsApp to barber (no popup, direct redirect)
      const msg = encodeURIComponent(
        `📅 Novo Agendamento #${appointmentNum}\n\n👤 Cliente: ${customerName}\n📱 Telefone: ${customerPhone}\n\n📅 Data: ${fullDate}\n🕐 Horário: ${selectedTime}\n✂️ Serviço: ${selectedService.name}\n💰 Valor: R$ ${selectedService.price.toFixed(2)}\n💈 Barbeiro: ${barberNameMsg}${payLabel}\n\n📍 Local:\n${ADDRESS}\n\n🗺️ Ver no Mapa: ${GOOGLE_MAPS_LINK}\n\n⚡ Acesse o painel para confirmar.`
      );
      const redirectUrl = `https://api.whatsapp.com/send?phone=${BARBER_PHONE}&text=${msg}`;

      flushSync(() => {
        setConfirmedNumber(appointmentNum);
        setConfirmedBarber(barberNameMsg);
        setWhatsAppRedirectUrl(redirectUrl);
        setSuccess(true);
      });

      // Build WhatsApp confirmation message for Telegram (use wa.me for better compatibility)
      const clientPhone = customerPhone.replace(/\D/g, "");
      const confirmText = `Olá, ${customerName}! ✅ O seu agendamento com a *José Barbearia* foi confirmado!\n\n*Serviço:* ${selectedService.name.toUpperCase()}\n*Quando:* ${fullDate} às ${selectedTime}\n*Profissional:* ${barberNameMsg.toUpperCase()}\n*Valor:* R$ ${selectedService.price.toFixed(2)}\n\n📍*Endereço:* Av. Otávio Rangel, 477 - Vila Cecap, Guariba - SP\n📍*Google Maps:* ${GOOGLE_MAPS_LINK}\n\nTe esperamos! 💈`;
      const whatsConfirmLink = `https://wa.me/55${clientPhone}?text=${encodeURIComponent(confirmText)}`;

      // Send Telegram notification
      window.setTimeout(() => {
        sendTelegram(
          `📅 <b>NOVO AGENDAMENTO #${appointmentNum}</b>\n\n👤 Cliente: ${customerName}\n📱 Telefone: ${customerPhone}\n\n📅 Data: ${fullDate}\n🕐 Horário: ${selectedTime}\n✂️ Serviço: ${selectedService.name}\n💰 Valor: R$ ${selectedService.price.toFixed(2)}\n💈 Barbeiro: ${barberNameMsg}${payLabel}\n\n📍 Local:\nAv. Otávio Rangel, 477 - Vila Cecap\nGuariba - SP, 14845-106\n\n🗺️ <a href="${GOOGLE_MAPS_LINK}">Ver no Mapa</a>\n\n✅ <a href="${whatsConfirmLink}">CONFIRMAR VIA WHATSAPP</a>`
        );
      }, 0);
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-success flex items-center justify-center px-4 py-6">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-success rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Check className="w-10 h-10 text-success-foreground" />
          </div>
          <h2 className="text-2xl font-bold font-display text-foreground mb-2">
            Agendamento Confirmado!
          </h2>
          {confirmedNumber !== null && (
            <div className="inline-block bg-success text-success-foreground text-sm font-bold px-3 py-1 rounded-full mb-3 shadow">
              Agendamento #{confirmedNumber}
            </div>
          )}
          <p className="text-foreground font-medium mb-1">
            {selectedService?.name} - R$ {selectedService?.price.toFixed(2)}
          </p>
          <p className="text-success font-bold text-lg mb-4">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR")} ({getDayOfWeek(selectedDate)}) às {selectedTime}
          </p>
          {confirmedBarber && (
            <p className="text-foreground text-sm mb-4">
              💈 Profissional: <strong className="text-success">{confirmedBarber}</strong>
            </p>
          )}
          <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-6">
            <p className="text-foreground font-medium text-sm">
              💈 O barbeiro <strong>{confirmedBarber || "José"}</strong> vai te enviar a confirmação via WhatsApp em breve!
            </p>
          </div>
          <div className="space-y-3">
            {whatsAppRedirectUrl && (
              <Button
                asChild
                className="w-full bg-success hover:brightness-110 text-success-foreground py-6 text-lg font-bold"
              >
                <a href={whatsAppRedirectUrl} target="_blank" rel="noopener noreferrer">
                  Abrir mensagem no WhatsApp
                </a>
              </Button>
            )}
            <Button onClick={() => navigate("/")} variant="outline" className="w-full py-6 text-lg font-bold">
              Voltar ao Início
            </Button>
          </div>
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

              {/* Barber selection - only show when more than 1 barber */}
              {barbers.length > 1 && (
                <div>
                  <Label className="flex items-center gap-2 mb-2">💈 Barbeiro</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {barbers.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBarber(b)}
                        className={`p-3 rounded-lg border text-center font-medium text-sm transition-all ${
                          selectedBarber?.id === b.id
                            ? "border-primary bg-primary/20 text-primary"
                            : "border-border bg-background/50 text-foreground hover:border-primary/50"
                        }`}
                      >
                        ✂️ {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="flex items-center gap-2 mb-2">📱 Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={customerPhone}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    const digits = formatted.replace(/\D/g, "");
                    setCustomerPhone(formatted);

                    if (digits.length < 10) {
                      setLastLookedUpPhone("");
                      setLoyalty(null);
                    }

                    if (digits.length >= 10) {
                      lookupCustomer(digits);
                    }
                  }}
                  required
                />
              </div>

              {loyalty && (
                <div className="rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 p-4 space-y-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-foreground text-sm">Programa de Fidelidade</h3>
                    {loyalty.available > 0 && (
                      <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
                        <Gift className="w-3 h-3" />
                        {loyalty.available} grátis!
                      </span>
                    )}
                  </div>

                  {loyalty.available > 0 ? (
                    <p className="text-sm text-foreground">
                      🎉 Você tem <strong className="text-green-400">{loyalty.available} serviço{loyalty.available > 1 ? "s" : ""} grátis</strong> disponível! Avise o barbeiro ao chegar.
                    </p>
                  ) : (
                    <p className="text-sm text-foreground">
                      Faltam <strong className="text-primary text-base">{loyalty.remaining}</strong> agendamento{loyalty.remaining !== 1 ? "s" : ""} para você ganhar <strong className="text-primary">1 serviço grátis</strong>!
                    </p>
                  )}

                  <div>
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span>{loyalty.progress}/{loyalty.goal} concluídos</span>
                      <span>{Math.round((loyalty.progress / loyalty.goal) * 100)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primary to-amber-400 h-full rounded-full transition-all"
                        style={{ width: `${(loyalty.progress / loyalty.goal) * 100}%` }}
                      />
                    </div>
                    <div className="flex gap-0.5 mt-2 justify-between">
                      {Array.from({ length: loyalty.goal }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i < loyalty.progress ? "text-primary fill-primary" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground text-center">
                    Total de serviços já feitos: <strong>{loyalty.total}</strong>
                  </p>
                </div>
              )}

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

              {paymentMethod === "pix" && (
                <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <span className="text-xl">💸</span>
                    <span>Pagamento via PIX</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Caso queira adiantar o pagamento, faça o PIX para a chave abaixo. O agendamento será confirmado normalmente.
                  </p>
                  <div className="bg-background/80 rounded-md p-3 space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Banco</p>
                      <p className="font-semibold">Mercado Pago</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Chave PIX (Telefone)</p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-lg tracking-wide select-all">
                          75 99941-2596
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText("75999412596");
                            toast({ title: "Chave PIX copiada! ✅" });
                          }}
                        >
                          Copiar
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Após o pagamento, envie o comprovante pelo WhatsApp para confirmar.
                  </p>
                </div>
              )}

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
