import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Simple in-memory rate limiter (per edge function instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute

// Limita quantas mensagens podem ser disparadas por agendamento (fluxo anônimo)
const perAppointment = new Map<string, number>();
const MAX_PER_APPOINTMENT = 3;
const APPOINTMENT_MAX_AGE_MS = 15 * 60_000;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// Domínios permitidos em links <a href="..."> (evita phishing injetado por clientes)
const ALLOWED_LINK_HOSTS = [
  'wa.me',
  'api.whatsapp.com',
  'web.whatsapp.com',
  'www.google.com',
  'google.com',
  'maps.google.com',
  'maps.app.goo.gl',
  'g.page',
  'search.google.com',
  'goo.gl',
];

function isAllowedHref(href: string): boolean {
  try {
    const url = new URL(href.trim());
    if (url.protocol !== 'https:') return false;
    return ALLOWED_LINK_HOSTS.includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function sanitizeHtml(text: string): string {
  // Remove qualquer tag fora da lista suportada pelo Telegram
  let out = text.replace(/<(?!\/?(?:b|i|u|s|a|code|pre)\b)[^>]*>/gi, '');
  // Mantém apenas links para domínios confiáveis; os demais viram texto simples
  out = out.replace(/<a\b[^>]*>/gi, (tag) => {
    const m = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (m && isAllowedHref(m[1])) return `<a href="${m[1]}">`;
    return '';
  });
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const unauthorized = () =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return unauthorized();

    const token = authHeader.replace('Bearer ', '');

    // Rate limit by token hash (simple approach)
    const rateLimitKey = token.slice(-16);
    if (isRateLimited(rateLimitKey)) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => null);
    const message = body?.message;
    const appointmentId = typeof body?.appointment_id === 'string' ? body.appointment_id : null;

    if (!message || typeof message !== 'string' || message.length > 2000) {
      return new Response(JSON.stringify({ error: 'Invalid message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1) Usuário autenticado: precisa ser admin para enviar mensagens livres
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: userData } = await authClient.auth.getUser(token);
    const user = userData?.user ?? null;

    const admin = createClient(supabaseUrl, serviceKey);

    let authorized = false;

    if (user) {
      const { data: roles } = await admin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin');
      authorized = !!roles && roles.length > 0;
    }

    // 2) Fluxo público de agendamento: só permite notificar sobre um agendamento
    //    real recém-criado (o token sozinho não autoriza nada).
    if (!authorized) {
      if (!appointmentId) return unauthorized();

      const used = perAppointment.get(appointmentId) ?? 0;
      if (used >= MAX_PER_APPOINTMENT) return unauthorized();

      const { data: appt } = await admin
        .from('appointments')
        .select('id, created_at')
        .eq('id', appointmentId)
        .maybeSingle();

      if (!appt) return unauthorized();
      const createdAt = new Date(appt.created_at as string).getTime();
      if (!createdAt || Date.now() - createdAt > APPOINTMENT_MAX_AGE_MS) return unauthorized();

      perAppointment.set(appointmentId, used + 1);
      authorized = true;
    }

    if (!authorized) return unauthorized();

    const sanitizedMessage = sanitizeHtml(message);

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!botToken || !chatId) {
      return new Response(JSON.stringify({ error: 'Telegram not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: sanitizedMessage,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify({ success: data.ok }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
