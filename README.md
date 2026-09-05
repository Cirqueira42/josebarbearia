# José Barbearia — Aplicativo completo

Sistema de agendamento, fidelidade, caixa e painel administrativo da José Barbearia (Guariba/SP).

Stack: React 18 + Vite 5 + TypeScript + Tailwind + shadcn/ui. Backend: Supabase (banco, auth, storage e Edge Functions).

## Estrutura

```
├── index.html
├── package.json / vite.config.ts / tsconfig*.json / tailwind.config.ts
├── .env.example
├── public/               ícones PWA, manifest, robots, sitemap
├── src/
│   ├── main.tsx, App.tsx
│   ├── pages/            Index, Agendar, Admin, AdminLogin, BarberView, MeusAgendamentos
│   ├── components/       UI pública + components/admin (painel completo)
│   ├── hooks/            atualizador do app, install prompt, toasts
│   ├── lib/              disponibilidade, fidelidade, finanças, horários, WhatsApp
│   ├── assets/           imagens de serviços e produtos
│   └── integrations/supabase/   client e tipos
└── supabase/
    ├── config.toml
    ├── functions/        send-booking-email, send-reminders, send-telegram
    ├── migrations/       histórico completo do banco
    └── schema/           josebarbearia-schema.sql (estrutura pronta) e migracao-dados.sql
```

## Rodar localmente

```bash
npm install
cp .env.example .env    # preencha as variáveis
npm run dev
```

Build de produção: `npm run build` (saída em `dist/`). Testes: `npm run test`.

## Hospedagem independente

O projeto é um SPA estático. Em Vercel, Cloudflare Pages, Netlify ou similar:

- Build command: `npm run build`
- Output: `dist`
- Variáveis de ambiente: as três `VITE_*` do `.env.example`
- Redirecionar todas as rotas para `/index.html` (o `vercel.json` já faz isso na Vercel)

## Backend Supabase

Para subir em um projeto Supabase novo:

1. Rode `supabase/schema/josebarbearia-schema.sql` no SQL Editor (tabelas, RLS, funções, triggers, RPCs).
2. Crie os buckets públicos `gallery`, `products` e `services`.
3. Crie o usuário administrador no Auth e garanta o papel `admin` em `public.user_roles`.
4. Se estiver migrando de um banco antigo, rode depois `supabase/schema/migracao-dados.sql`.
5. Faça deploy das Edge Functions em `supabase/functions/` e configure os segredos `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` e `CRON_SECRET`.

O que precisa permanecer no Supabase (não vai no ZIP): usuários do Auth, arquivos do Storage e os dados das tabelas.

## Segurança

Nenhum segredo fica no código. O frontend usa apenas a chave pública (anon). A `service_role` é usada exclusivamente dentro das Edge Functions, via variáveis de ambiente do Supabase.
