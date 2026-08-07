import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DAYS_PT = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current time in São Paulo timezone
    const nowSP = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    
    // Calculate the time window: appointments happening in ~45 minutes
    const reminderTime = new Date(nowSP.getTime() + 45 * 60 * 1000);
    const reminderTimeLow = new Date(nowSP.getTime() + 40 * 60 * 1000);
    
    const todayStr = `${nowSP.getFullYear()}-${String(nowSP.getMonth() + 1).padStart(2, '0')}-${String(nowSP.getDate()).padStart(2, '0')}`;
    
    // Format time range for query (HH:MM)
    const timeHigh = `${String(reminderTime.getHours()).padStart(2, '0')}:${String(reminderTime.getMinutes()).padStart(2, '0')}`;
    const timeLow = `${String(reminderTimeLow.getHours()).padStart(2, '0')}:${String(reminderTimeLow.getMinutes()).padStart(2, '0')}`;

    // Find confirmed appointments within the window that haven't been reminded
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('appointment_date', todayStr)
      .eq('reminder_sent', false)
      .in('status', ['confirmed', 'pending'])
      .gte('appointment_time', timeLow)
      .lte('appointment_time', timeHigh);

    if (error) {
      console.error('Error fetching appointments:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ message: 'No reminders to send', checked: `${timeLow}-${timeHigh}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID');

    let sentCount = 0;

    for (const appt of appointments) {
      // Marca ANTES de enviar (evita duplicidade se duas execuções coincidirem)
      const { data: claimed } = await supabase
        .from('appointments')
        .update({ reminder_sent: true })
        .eq('id', appt.id)
        .eq('reminder_sent', false)
        .select('id');

      if (!claimed || claimed.length === 0) continue;

      const d = new Date(appt.appointment_date + 'T12:00:00');
      const dayName = DAYS_PT[d.getDay()];
      const day = String(d.getDate()).padStart(2, '0');
      const month = MONTHS_PT[d.getMonth()];

      // Send Telegram reminder to admin
      if (botToken && chatId) {
        const clientPhone = appt.customer_phone.replace(/\D/g, '');
        const reminderText = `Olá, ${appt.customer_name}! 👋\n\nLembrete do seu agendamento na *José Barbearia*:\n\n*Serviço:* ${appt.service_name.toUpperCase()}\n*Quando:* ${dayName}, ${day} de ${month} às ${appt.appointment_time}\n*Profissional:* ${(appt.barber_name || 'José Gilmário').toUpperCase()}\n\nFalta cerca de 45 minutos! Te esperamos! 💈`;
        const whatsLink = `https://wa.me/55${clientPhone}?text=${encodeURIComponent(reminderText)}`;
        const telegramMsg = `⏰ <b>LEMBRETE - 45 MIN</b>\n\n👤 ${appt.customer_name}\n📱 ${appt.customer_phone}\n✂️ ${appt.service_name}\n📅 ${dayName}, ${day} de ${month}\n🕐 ${appt.appointment_time}\n💈 ${appt.barber_name || 'José Gilmário'}\n\n💬 <a href="${whatsLink}">LEMBRAR CLIENTE NO WHATSAPP</a>`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: telegramMsg,
            parse_mode: 'HTML',
          }),
        });
      }




      sentCount++;
    }

    return new Response(JSON.stringify({ message: `Sent ${sentCount} reminders` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
