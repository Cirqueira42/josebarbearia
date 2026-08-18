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
import { ArrowLeft, Check, Award, Gift, Star, Clock, CalendarPlus, MessageCircle } from "lucide-react";
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

const getServiceImage = (svc: { name: string; image_path?: string | null }) => {
  if (svc.image_path) {
    return supabase.storage.from("services").getPublicUrl(svc.image_path).data.publicUrl;
  }
  const key = svc.name.toLowerCase();
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
  image_path?: string | null;
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

import { BusinessHours, DEFAULT_HOURS, DAY_LABELS as BH_DAY_LABELS, isClosedDay, parseHours, slotsForDate } from "@/lib/businessHours";


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
  const [loyalty, setLoyalty] = useState<{ total: number; available: number; progress: number; goal: number; remaining: number; hasReward: boolean } | null>(null);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number; loyalty?: boolean; fixed?: number } | null>(null);
  const [rewardCode, setRewardCode] = useState<string | null>(null);
  const [rewardValue, setRewardValue] = useState(7);
  const [voucherChoice, setVoucherChoice] = useState<"use" | "keep" | null>(null);
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
        hasReward: r.has_reward === true,
      });
    } else {
      setLoyalty({ total: 0, available: 0, progress: 0, goal: 10, remaining: 10, hasReward: false });
    }

    // Vale-presente disponível (1 por vez)
    const { data: rw } = await (supabase as any).rpc("get_active_reward", { _phone: phone });
    const reward = Array.isArray(rw) ? rw[0] : rw;
    if (reward?.code) {
      setRewardCode(reward.code);
      setRewardValue(Number(reward.discount_amount) || 7);
    } else {
      setRewardCode(null);
    }
    setVoucherChoice(null);
    setCouponApplied(null);
  }, [lastLookedUpPhone, toast]);

  useEffect(() => {
    fetchServices();
    fetchBlockedSlots();
    fetchBarbers();
    fetchLoyaltyEnabled();
    fetchBusinessHours();
  }, []);

  const fetchLoyaltyEnabled = async () => {
    const { data } = await supabase.from("app_settings").select("value").eq("key", "loyalty_enabled").maybeSingle();
    setLoyaltyEnabled(data?.value === true);
  };

  const fetchBusinessHours = async () => {
    const { data } = await supabase.from("app_settings").select("value").eq("key", "business_hours").maybeSingle();
    if (data?.value) setBusinessHours(parseHours(data.value));
  };

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

  const isClosedDate = (date: string) => isClosedDay(businessHours, date);


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

    return slotsForDate(businessHours, selectedDate).filter((t) => {
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

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    const code = couponCode.trim().toUpperCase();
    const { data } = await (supabase as any).rpc("validate_coupon", { _code: code });
    const r = (data as any[])?.[0];
    if (r?.valid) {
      setCouponApplied({ code, discount: r.discount_percent });
      toast({ title: `Cupom aplicado: ${r.discount_percent}% OFF` });
      return;
    }
    // Pode ser um código exclusivo de fidelidade — validado na confirmação
    if (loyalty?.hasReward) {
      setCouponApplied({ code, discount: 0, loyalty: true });
      toast({ title: "Código registrado", description: "Ele será validado ao confirmar o agendamento." });
      return;
    }
    toast({ title: "Cupom inválido", description: r?.message || "Verifique o código", variant: "destructive" });
    setCouponApplied(null);
  };


  // Fidelidade só vale para serviços participantes (Corte / Corte+Barba / valor >= R$ 30)
  const serviceEligibleForLoyalty =
    !!selectedService &&
    selectedService.price >= 30 &&
    !/^\s*barba/i.test(selectedService.name);

  const voucherEligible =
    loyaltyEnabled && !!rewardCode && !!selectedService && selectedService.price >= 30;

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

    // Verifica se o telefone está bloqueado
    const cleanPhone = customerPhone.replace(/\D/g, "");
    const { data: blockedCheck } = await (supabase as any).rpc("is_phone_blocked", { _phone: cleanPhone });
    if (blockedCheck === true) {
      toast({ title: "Não foi possível agendar", description: "Entre em contato com a barbearia.", variant: "destructive" });
      return;
    }

    // Vale-presente: escolha obrigatória (usar agora ou guardar)
    if (voucherEligible && !voucherChoice) {
      toast({
        title: "Escolha o seu Vale-Presente",
        description: "Selecione USAR AGORA ou GUARDAR PARA DEPOIS antes de confirmar.",
        variant: "destructive",
      });
      return;
    }

    const barber = selectedBarber || barbers[0];

    // Confere se o benefício ainda está disponível (não consome nada aqui)
    if (couponApplied?.loyalty) {
      const { data: rwCheck } = await (supabase as any).rpc("get_active_reward", { _phone: cleanPhone });
      const activeReward = Array.isArray(rwCheck) ? rwCheck[0] : rwCheck;
      if (!activeReward?.code || String(activeReward.code).toUpperCase() !== couponApplied.code.toUpperCase()) {
        toast({ title: "Benefício indisponível", description: "Esse código não está mais disponível para este telefone.", variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    const { data: createdRows, error } = await (supabase as any).rpc("create_appointment", {
      _service_id: selectedService.id,
      _service_name: selectedService.name,
      _customer_name: customerName,
      _customer_phone: cleanPhone,
      _appointment_date: selectedDate,
      _appointment_time: selectedTime,
      _barber_id: barber?.id || null,
      _barber_name: barber?.name || "José Gilmário",
      _customer_email: customerEmail || null,
    });
    const inserted = Array.isArray(createdRows) ? createdRows[0] : createdRows;

    if (error) {
      const msg = String((error as any)?.message || "");
      toast({
        title: "Erro ao agendar",
        description: msg.includes("blocked_customer")
          ? "Entre em contato com a barbearia."
          : "Não foi possível concluir. Tente novamente em instantes.",
        variant: "destructive",
      });
      console.error("Erro ao agendar:", error);
    } else {
      const fullDate = formatFullDate(selectedDate);

      // Cadastro inteligente: salva/atualiza os dados do cliente para autopreenchimento
      try {
        await (supabase as any).rpc("upsert_customer", {
          _phone: cleanPhone,
          _name: customerName,
          _email: customerEmail || null,
          _date: selectedDate,
        });
      } catch {}

      // Reserva o benefício de fidelidade para ESTE agendamento (só vira "usado" quando o atendimento for concluído)
      let loyaltyReserved = false;
      if (couponApplied?.loyalty && inserted?.appointment_id) {
        const { data: rs } = await (supabase as any).rpc("reserve_loyalty_reward", {
          _phone: cleanPhone,
          _code: couponApplied.code,
          _appointment_id: inserted.appointment_id,
        });
        loyaltyReserved = (Array.isArray(rs) ? rs[0] : rs)?.valid === true;
      }

      const payLabel = paymentMethod ? `\n💳 Pagamento: ${paymentMethod}` : "";
      const loyaltyDiscount = loyaltyReserved ? (couponApplied?.fixed ?? rewardValue) : 0;
      const finalPrice = loyaltyDiscount
        ? Math.max(selectedService.price - loyaltyDiscount, 0)
        : couponApplied && !couponApplied.loyalty
          ? selectedService.price * (1 - couponApplied.discount / 100)
          : selectedService.price;
      const priceLabel = loyaltyDiscount
        ? `R$ ${finalPrice.toFixed(2)} (Fidelidade -R$ ${loyaltyDiscount.toFixed(2)})`
        : couponApplied && !couponApplied.loyalty
          ? `R$ ${finalPrice.toFixed(2)} (cupom ${couponApplied.code} -${couponApplied.discount}%)`
          : `R$ ${selectedService.price.toFixed(2)}`;

      // Incrementa uso do cupom (apenas cupons promocionais da tabela de cupons)
      if (couponApplied && !couponApplied.loyalty) {
        try {
          const { data: c } = await (supabase as any).from("coupons").select("id, uses_count").eq("code", couponApplied.code).maybeSingle();
          if (c) await (supabase as any).from("coupons").update({ uses_count: (c.uses_count || 0) + 1 }).eq("id", c.id);
        } catch {}
      }


      // Use the real sequential number returned by the database
      const appointmentNum = inserted?.appointment_number ?? 0;
      const barberNameMsg = inserted?.barber_name || barber?.name || "José Gilmário";

      // Send WhatsApp to barber (no popup, direct redirect) — abre direto no app (Business)
      const barberText = `📅 Novo Agendamento #${appointmentNum}\n\n👤 Cliente: ${customerName}\n📱 Telefone: ${customerPhone}\n\n📅 Data: ${fullDate}\n🕐 Horário: ${selectedTime}\n✂️ Serviço: ${selectedService.name}\n💰 Valor: ${priceLabel}\n💈 Barbeiro: ${barberNameMsg}${payLabel}\n\n📍 Local:\n${ADDRESS}\n\n🗺️ Ver no Mapa: ${GOOGLE_MAPS_LINK}\n\n⚡ Acesse o painel para confirmar.`;
      // Sempre abre a conversa com o número da barbearia (nunca o WhatsApp do cliente)
      const redirectUrl = `https://wa.me/${BARBER_PHONE}?text=${encodeURIComponent(barberText)}`;

      flushSync(() => {
        setConfirmedNumber(appointmentNum);
        setConfirmedBarber(barberNameMsg);
        setWhatsAppRedirectUrl(redirectUrl);
        setSuccess(true);
      });

      // Build WhatsApp confirmation message for Telegram (wa.me funciona melhor em links externos)
      const clientPhone = customerPhone.replace(/\D/g, "");
      const loyaltyBlock = loyaltyDiscount
        ? `\n\n🎁 *Benefício Fidelidade aplicado!*\n*Valor original:* R$ ${selectedService.price.toFixed(2)}\n*Desconto:* R$ ${loyaltyDiscount.toFixed(2)}\n*Valor final:* R$ ${finalPrice.toFixed(2)}`
        : "";
      const confirmText = loyaltyDiscount
        ? `Olá, ${customerName}! 🎉 O seu agendamento com a *José Barbearia* foi confirmado!\n\n*Serviço:* ${selectedService.name.toUpperCase()}\n*Quando:* ${fullDate} às ${selectedTime}\n*Profissional:* ${barberNameMsg.toUpperCase()}${loyaltyBlock}\n\n📍*Endereço:* Av. Otávio Rangel, 477 - Vila Cecap, Guariba - SP\n📍*Google Maps:* ${GOOGLE_MAPS_LINK}\n\nTe esperamos! 💈`
        : `Olá, ${customerName}! ✅ O seu agendamento com a *José Barbearia* foi confirmado!\n\n*Serviço:* ${selectedService.name.toUpperCase()}\n*Quando:* ${fullDate} às ${selectedTime}\n*Profissional:* ${barberNameMsg.toUpperCase()}\n*Valor:* ${priceLabel}\n\n📍*Endereço:* Av. Otávio Rangel, 477 - Vila Cecap, Guariba - SP\n📍*Google Maps:* ${GOOGLE_MAPS_LINK}\n\nTe esperamos! 💈`;
      const whatsConfirmLink = `https://wa.me/55${clientPhone}?text=${encodeURIComponent(confirmText)}`;

      // Send Telegram notification
      window.setTimeout(() => {
        sendTelegram(
          `📅 <b>NOVO AGENDAMENTO #${appointmentNum}</b>\n\n👤 Cliente: ${customerName}\n📱 Telefone: ${customerPhone}\n\n📅 Data: ${fullDate}\n🕐 Horário: ${selectedTime}\n✂️ Serviço: ${selectedService.name}\n💰 Valor: ${priceLabel}\n💈 Barbeiro: ${barberNameMsg}${payLabel}\n\n📍 Local:\nAv. Otávio Rangel, 477 - Vila Cecap\nGuariba - SP, 14845-106\n\n🗺️ <a href="${GOOGLE_MAPS_LINK}">Ver no Mapa</a>\n\n✅ <a href="${whatsConfirmLink}">CONFIRMAR VIA WHATSAPP</a>`
        );
      }, 0);
    }
    setSubmitting(false);
  };

  if (success) {
    const calStart = `${selectedDate.replace(/-/g, "")}T${selectedTime.replace(":", "")}00`;
    const endMin = timeToMinutes(selectedTime) + (selectedService?.duration_minutes || 30);
    const calEnd = `${selectedDate.replace(/-/g, "")}T${String(Math.floor(endMin / 60)).padStart(2, "0")}${String(endMin % 60).padStart(2, "0")}00`;
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `${selectedService?.name} — José Barbearia`
    )}&dates=${calStart}/${calEnd}&location=${encodeURIComponent(ADDRESS.replace("\n", ", "))}&details=${encodeURIComponent(
      `Agendamento #${confirmedNumber ?? ""} • Profissional: ${confirmedBarber || "José Gilmário"}`
    )}&ctz=America/Sao_Paulo`;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 pt-8 pb-6 text-center border-b border-border/70">
              <div className="w-14 h-14 rounded-full border border-success/50 bg-success/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-success" />
              </div>
              <h2 className="text-lg font-bold uppercase tracking-[0.2em] text-foreground">
                Horário reservado
              </h2>
              {confirmedNumber !== null && (
                <p className="text-xs text-muted-foreground mt-2">Agendamento #{confirmedNumber}</p>
              )}
            </div>

            <div className="divide-y divide-border/60">
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 sm:px-6 py-3.5">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Serviço</span>
                <span className="font-semibold text-foreground text-right">{selectedService?.name}</span>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 sm:px-6 py-3.5">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Data</span>
                <span className="font-semibold text-foreground text-right">
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR")} · {getDayOfWeek(selectedDate)}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 sm:px-6 py-3.5">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Horário</span>
                <span className="font-bold text-primary text-lg">{selectedTime}</span>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 sm:px-6 py-3.5">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Profissional</span>
                <span className="font-semibold text-foreground text-right">{confirmedBarber || "José Gilmário"}</span>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 sm:px-6 py-3.5">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Valor</span>
                <span className="font-semibold text-foreground">R$ {selectedService?.price.toFixed(2)}</span>
              </div>
            </div>

            <div className="px-6 py-5 text-center border-t border-border/70">
              <p className="text-[11px] uppercase tracking-[0.35em] text-primary/80">José Barbearia</p>
              <p className="text-xs text-muted-foreground mt-2">
                Seu horário está reservado. Estamos esperando por você.
              </p>
            </div>
          </div>

          {/* Programa de Fidelidade - aparece somente para serviço de CORTE */}
          {loyaltyEnabled && serviceEligibleForLoyalty && loyalty && (
            <div className="bg-card border border-primary/30 rounded-xl p-4 mt-4 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-primary" />
                <p className="font-semibold text-foreground text-xs uppercase tracking-widest">Fidelidade</p>
                {loyalty.available > 0 && (
                  <span className="ml-auto bg-success/15 text-success border border-success/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Gift className="w-3 h-3" /> Benefício liberado
                  </span>
                )}
              </div>
              {loyalty.available > 0 ? (
                <p className="text-xs text-muted-foreground mb-2">
                  🎉 Parabéns! Você completou a meta e liberou um <strong className="text-success">benefício exclusivo</strong>. O barbeiro vai te enviar o seu código pelo WhatsApp.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mb-2">
                  Você já fez <strong className="text-primary">{loyalty.progress}</strong> de <strong>{loyalty.goal}</strong>. Faltam <strong className="text-primary">{loyalty.remaining}</strong> para liberar um benefício exclusivo.
                </p>
              )}
              <div className="w-full bg-muted rounded-full h-1.5 mb-1">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all"
                  style={{ width: `${(loyalty.progress / loyalty.goal) * 100}%` }}
                />
              </div>
               <div className="grid grid-cols-10 gap-0.5 mt-1.5">
                {Array.from({ length: loyalty.goal }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${i < loyalty.progress ? "text-primary fill-primary" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                * Conta apenas 1 corte por dia. Atualiza após o barbeiro concluir o atendimento.
              </p>
            </div>
          )}

          <div className="space-y-2.5 mt-5">
            <Button
              asChild
              variant="outline"
              className="w-full py-6 text-sm font-bold uppercase tracking-wider border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <a href={calendarUrl} target="_blank" rel="noopener noreferrer">
                <CalendarPlus className="w-4 h-4" />
                Adicionar à agenda
              </a>
            </Button>
            {whatsAppRedirectUrl && (
              <Button
                asChild
                className="w-full bg-success hover:brightness-110 text-success-foreground py-6 text-sm font-bold uppercase tracking-wider"
              >
                <a href={whatsAppRedirectUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4" />
                  Falar no WhatsApp
                </a>
              </Button>
            )}
            <Button onClick={() => navigate("/")} variant="ghost" className="w-full py-5 text-sm text-muted-foreground">
              Voltar ao início
            </Button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="admin-scope min-h-screen bg-background relative">
      {/* Carousel background on service selection */}
      {!selectedService && (
        <div className="absolute inset-0 overflow-hidden">
          <PhotoCarousel overlay="heavy" />
        </div>
      )}

      <header className="relative z-10 bg-background/80 backdrop-blur border-b border-border/60 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => (selectedService ? setSelectedService(null) : navigate("/"))}
            className="text-foreground/80 hover:text-primary transition-colors p-1 -ml-1"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80">José Barbearia</p>
            <h1 className="text-base font-bold font-display text-foreground truncate">
              {selectedService ? selectedService.name : "Agendar horário"}
            </h1>
          </div>
          {selectedService && (
            <span className="ml-auto text-right shrink-0">
              <span className="block text-primary font-bold leading-none">R$ {selectedService.price.toFixed(2)}</span>
              <span className="block text-[11px] text-muted-foreground mt-1">{selectedService.duration_minutes} min</span>
            </span>
          )}
        </div>
      </header>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-6">
        {!selectedService ? (
          <div className="space-y-3 animate-fade-in-up">
            <p className="text-[11px] uppercase tracking-[0.35em] text-primary/80 mb-1">Etapa 1 de 4</p>
            <h2 className="text-2xl font-bold font-display text-foreground mb-5">Escolha o serviço</h2>
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedService(s)}
                className="w-full relative overflow-hidden rounded-xl text-left border border-border/70 hover:border-primary/60 active:scale-[0.99] transition-all shadow-lg group h-28"
              >
                <img
                  src={getServiceImage(s)}
                  alt={s.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
                <div className="relative z-10 flex items-center gap-3 p-4 h-full">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground uppercase tracking-wide truncate">{s.name}</h3>
                      {/corte\s*\+\s*barba/i.test(s.name) && (
                        <span className="text-[9px] uppercase tracking-[0.15em] font-semibold text-primary border border-primary/50 px-1.5 py-0.5 rounded-full shrink-0">
                          Mais pedido
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{s.description}</p>
                    <p className="text-muted-foreground/80 text-[11px] mt-1.5 inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {s.duration_minutes} min
                    </p>
                  </div>
                  <span className="text-primary font-bold text-xl shrink-0">R$ {s.price.toFixed(0)}</span>
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

            <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-5 bg-card/90 backdrop-blur-md rounded-2xl p-3 min-[360px]:p-5 border border-border/60 shadow-2xl min-w-0 overflow-hidden">
              <button
                type="button"
                onClick={() => setSelectedService(null)}
                className="order-1 text-sm text-primary hover:underline mb-2"
              >
                ← Trocar serviço
              </button>

              {/* Barber selection - only show when more than 1 barber */}
              {barbers.length > 1 && (
                <div className="order-2">
                  <Label className="mb-2 block text-sm">Profissional</Label>
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

              <div className="order-5">
                <p className="text-[11px] uppercase tracking-[0.3em] text-primary/80 mb-3">Etapa 4 · Seus dados</p>
                <Label className="mb-2 block text-sm">Telefone</Label>
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

              {loyaltyEnabled && serviceEligibleForLoyalty && loyalty && (
                <div className="order-6 rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 p-4 space-y-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-foreground text-sm">Programa de Fidelidade</h3>
                    {loyalty.available > 0 && (
                      <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
                        <Gift className="w-3 h-3" />
                        Benefício liberado
                      </span>
                    )}
                  </div>

                  {loyalty.available > 0 ? (
                    <p className="text-sm text-foreground">
                      🎉 Parabéns! Você completou a meta e liberou um <strong className="text-green-400">benefício exclusivo</strong>. O barbeiro vai te enviar o seu código pelo WhatsApp para usar no próximo atendimento.
                    </p>
                  ) : (
                    <p className="text-sm text-foreground">
                      Faltam <strong className="text-primary text-base">{loyalty.remaining}</strong> agendamento{loyalty.remaining !== 1 ? "s" : ""} para você liberar um <strong className="text-primary">benefício exclusivo</strong> no próximo atendimento!
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

              <div className="order-7">
                <Label className="mb-2 block text-sm">Nome completo</Label>
                <Input
                  placeholder="Seu nome"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>

              <div className="order-8">
                <Label className="mb-2 block text-sm text-muted-foreground">E-mail <span className="text-xs">(opcional)</span></Label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>

              <div className="order-3">
                <p className="text-[11px] uppercase tracking-[0.3em] text-primary/80 mb-3">Etapa 2 · Data</p>
                <Label className="mb-2 block text-sm">Escolha o dia</Label>
                <Input
                  type="date"
                  min={getMinDate()}
                  value={selectedDate}
                  onChange={(e) => {
                    const date = e.target.value;
                    if (isClosedDate(date)) {
                      toast({
                        title: "Dia fechado!",
                        description: `Não atendemos ${BH_DAY_LABELS[new Date(date + "T12:00:00").getDay()]}.`,
                        variant: "destructive",
                      });
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

              <div className="order-4">
                <p className="text-[11px] uppercase tracking-[0.3em] text-primary/80 mb-3">Etapa 3 · Horário</p>
                <Label className="mb-2 block text-sm">Escolha o horário</Label>
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

              <div className="order-9">
                <Label className="mb-2 block text-sm text-muted-foreground">Forma de pagamento <span className="text-xs">(opcional)</span></Label>
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
                <div className="order-9 rounded-lg border-2 border-primary/40 bg-primary/5 p-4 space-y-3">
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

              {voucherEligible && (
                <div className="order-10 rounded-xl border-2 border-green-500/50 bg-gradient-to-br from-green-500/15 to-green-500/5 p-4 space-y-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-green-400" />
                    <h3 className="font-bold text-sm text-foreground">
                      🎁 Vale-Presente de R$ {rewardValue.toFixed(2)} disponível
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Parabéns! Você completou {loyalty?.goal ?? 10}/{loyalty?.goal ?? 10} atendimentos.
                    Escolha o que fazer com o seu vale antes de confirmar (só é possível usar 1 por vez).
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={voucherChoice === "use" ? "default" : "outline"}
                      className="h-auto py-3 text-xs font-bold leading-tight"
                      onClick={() => {
                        setVoucherChoice("use");
                        setCouponApplied({ code: rewardCode!, discount: 0, loyalty: true, fixed: rewardValue });
                        toast({ title: "Vale-Presente selecionado 🎁", description: `Desconto de R$ ${rewardValue.toFixed(2)} neste atendimento.` });
                      }}
                    >
                      USAR AGORA
                      <br />
                      <span className="font-normal">-R$ {rewardValue.toFixed(2)}</span>
                    </Button>
                    <Button
                      type="button"
                      variant={voucherChoice === "keep" ? "default" : "outline"}
                      className="h-auto py-3 text-xs font-bold leading-tight"
                      onClick={() => {
                        setVoucherChoice("keep");
                        setCouponApplied(null);
                        toast({ title: "Vale guardado ✅", description: "Ele continua disponível para o próximo atendimento." });
                      }}
                    >
                      GUARDAR
                      <br />
                      <span className="font-normal">para depois</span>
                    </Button>
                  </div>
                  {voucherChoice === "use" && selectedService && (
                    <p className="text-xs text-center text-green-400 font-bold">
                      Valor final: R$ {Math.max(selectedService.price - rewardValue, 0).toFixed(2)}
                    </p>
                  )}
                  {!voucherChoice && (
                    <p className="text-[11px] text-center text-amber-400">Escolha uma opção para continuar</p>
                  )}
                </div>
              )}

              {loyaltyEnabled && rewardCode && selectedService && selectedService.price < 30 && (
                <p className="order-10 text-xs text-muted-foreground rounded-lg border border-border bg-background/60 p-3">
                  🎁 Você tem um Vale-Presente de R$ {rewardValue.toFixed(2)}, válido em serviços a partir de R$ 30,00.
                </p>
              )}

              <div className="order-11 rounded-lg border border-border bg-background/60 p-3 space-y-2">

                <Label className="block text-sm text-muted-foreground">Cupom de desconto</Label>
                {loyaltyEnabled && serviceEligibleForLoyalty && loyalty && !loyalty.hasReward ? (
                  <div className="flex items-center gap-2 rounded bg-muted/40 border border-border px-3 py-2">
                    <span className="text-xs text-muted-foreground">
                      🔒 Bloqueado — liberado automaticamente quando você completar os {loyalty.goal} atendimentos.
                    </span>
                  </div>
                ) : couponApplied ? (
                  <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded px-3 py-2">
                    <span className="text-sm text-green-500 font-bold">
                      {couponApplied.code}{couponApplied.fixed ? ` · -R$ ${couponApplied.fixed.toFixed(2)}` : couponApplied.loyalty ? " · benefício exclusivo" : ` · -${couponApplied.discount}%`}
                    </span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => { setCouponApplied(null); setCouponCode(""); }}>Remover</Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input placeholder="DIGITE O CÓDIGO" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="uppercase" />
                    <Button type="button" variant="outline" onClick={applyCoupon}>Aplicar</Button>
                  </div>
                )}
                {couponApplied && !couponApplied.loyalty && selectedService && (
                  <p className="text-xs text-muted-foreground">
                    Valor com desconto: <b className="text-green-500">R$ {(selectedService.price * (1 - couponApplied.discount / 100)).toFixed(2)}</b>
                  </p>
                )}
              </div>


              <Button
                type="submit"
                disabled={submitting}
                className="order-12 w-full py-6 text-base font-bold uppercase tracking-wider active:scale-[0.99] transition-transform"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                    Confirmando...
                  </span>
                ) : (
                  "Confirmar agendamento"
                )}
              </Button>
              <p className="order-12 text-[11px] text-center text-muted-foreground -mt-2">
                Você recebe a confirmação do barbeiro pelo WhatsApp.
              </p>

            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Agendar;
