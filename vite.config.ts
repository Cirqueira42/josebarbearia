import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Valores públicos (anon/publishable) — garantem que builds externos (ex.: Vercel)
// funcionem mesmo se as variáveis de ambiente não forem configuradas lá.
const FALLBACK_SUPABASE_URL = "https://alwujlbiqoevzsuckyrs.supabase.co";
const FALLBACK_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsd3VqbGJpcW9ldnpzdWNreXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTYyMDQsImV4cCI6MjA4Nzc5MjIwNH0.qDkusMFuibowvKSHoyI7-kwjuUn7-eeO2Y9cafIpyLQ";
const FALLBACK_SUPABASE_PROJECT_ID = "alwujlbiqoevzsuckyrs";

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env } as Record<string, string>;

  // Aceita vários nomes de variáveis (Vercel/Netlify/Cloudflare) para evitar
  // que o app aponte para o banco errado por causa do nome da chave.
  const pick = (...names: string[]) => {
    for (const n of names) {
      const v = env[n];
      if (v && v.trim()) return v.trim();
    }
    return "";
  };

  const supabaseUrl =
    pick("VITE_SUPABASE_URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL") || FALLBACK_SUPABASE_URL;
  const supabaseKey =
    pick(
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "VITE_SUPABASE_ANON_KEY",
      "SUPABASE_ANON_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    ) || FALLBACK_SUPABASE_KEY;
  const supabaseProjectId =
    pick("VITE_SUPABASE_PROJECT_ID", "SUPABASE_PROJECT_ID") ||
    (supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? FALLBACK_SUPABASE_PROJECT_ID);

  return {
  define: {
    // Marca a data/hora exata da versão publicada (usada no backup "Projeto da Barbearia")
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseKey),
    "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(supabaseProjectId),
  },


  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});

