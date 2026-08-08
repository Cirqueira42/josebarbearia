import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package, Copy, Download, Loader2, CheckCircle2 } from "lucide-react";

// Todos os arquivos de código do projeto são lidos em tempo de build.
// Qualquer atualização feita no sistema entra automaticamente nesta cópia.
const codeFiles = import.meta.glob(
  [
    "/src/**/*.{ts,tsx,js,jsx,css,json,html,md}",
    "/supabase/**/*.{ts,toml,sql,json}",
    "/*.{ts,js,json,html,md,cjs,mjs}",
  ],
  { query: "?raw", import: "default" }
) as Record<string, () => Promise<string>>;

const TABLES = [
  "app_settings",
  "appointments",
  "barbers",
  "blocked_customers",
  "blocked_slots",
  "cash_entries",
  "coupons",
  "customers",
  "expenses",
  "gallery_photos",
  "loyalty",
  "loyalty_rewards",
  "products",
  "services",
] as const;

// Limite de registros por tabela — evita travar o celular com arquivos gigantes.
const ROW_LIMIT = 1000;

// Cache do código-fonte (só muda quando o app é atualizado/recarregado).
let codeCache: string | null = null;
let codePromise: Promise<string> | null = null;

const buildCodeSection = (): Promise<string> => {
  if (codeCache) return Promise.resolve(codeCache);
  if (codePromise) return codePromise;

  const paths = Object.keys(codeFiles).sort();
  codePromise = Promise.all(
    paths.map(async (path) => {
      try {
        const content = await codeFiles[path]();
        const ext = path.split(".").pop() || "";
        return `\n### Arquivo: ${path}\n\n\`\`\`${ext}\n${content}\n\`\`\`\n`;
      } catch {
        return `\n### Arquivo: ${path}\n(não foi possível ler)\n`;
      }
    })
  ).then((chunks) => {
    codeCache = chunks.join("");
    codePromise = null;
    return codeCache;
  });

  return codePromise;
};

const buildDataSection = async (): Promise<string> => {
  const results = await Promise.all(
    TABLES.map(async (table) => {
      try {
        const { data, error } = await (supabase as any).from(table).select("*").limit(ROW_LIMIT);
        if (error) return `\n### Tabela: ${table}\n(sem acesso: ${error.message})\n`;
        return `\n### Tabela: ${table} (${data?.length ?? 0} registros)\n\n\`\`\`json\n${JSON.stringify(
          data ?? []
        )}\n\`\`\`\n`;
      } catch (e: any) {
        return `\n### Tabela: ${table}\n(erro: ${e?.message || e})\n`;
      }
    })
  );
  return results.join("");
};

const ProjectExport = () => {
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const mounted = useRef(true);

  // Deixa o projeto já preparado em segundo plano: ao clicar, é instantâneo.
  useEffect(() => {
    mounted.current = true;
    const start = () => {
      buildCodeSection()
        .then(() => mounted.current && setReady(true))
        .catch(() => {});
    };
    const idle = (window as any).requestIdleCallback;
    const id = idle ? idle(start, { timeout: 3000 }) : window.setTimeout(start, 800);
    return () => {
      mounted.current = false;
      if (!idle) window.clearTimeout(id);
    };
  }, []);

  const buildBundle = async (): Promise<string> => {
    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const [code, data] = await Promise.all([buildCodeSection(), buildDataSection()]);

    return (
      `# PROJETO DA BARBEARIA — José Barbearia\n` +
      `Cópia completa do sistema gerada em ${now} (horário de Brasília).\n\n` +
      `Este arquivo contém TODO o código-fonte do aplicativo, as funções do servidor e os dados do banco.\n` +
      `Basta colar este conteúdo em qualquer IA (ou entregar a outro desenvolvedor) para reconstruir o sistema.\n\n` +
      `Backend: Lovable Cloud (Supabase). Frontend: React + Vite + TypeScript + Tailwind.\n\n` +
      `---\n\n## 1. CÓDIGO-FONTE\n` +
      code +
      `\n---\n\n## 2. DADOS DO BANCO (até ${ROW_LIMIT} registros por tabela)\n` +
      data +
      `\n---\n\n## 3. COMO RESTAURAR\n\n` +
      `1. Crie um novo projeto React + Vite + TypeScript com Tailwind e shadcn/ui.\n` +
      `2. Recrie cada arquivo da seção 1 exatamente no mesmo caminho.\n` +
      `3. Crie um backend Supabase e recrie as tabelas listadas na seção 2 (com RLS).\n` +
      `4. Importe os dados JSON de cada tabela.\n` +
      `5. Configure as variáveis: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID.\n` +
      `6. Configure os segredos do servidor: TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID.\n` +
      `7. Rode: npm install && npm run dev.\n`
    );
  };

  // Alguns celulares bloqueiam a área de transferência para textos muito grandes.
  // Tentamos 3 caminhos, do melhor para o mais simples, e por último baixamos o arquivo.
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* tenta o próximo modo */ }

    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      ta.remove();
      if (ok) return true;
    } catch { /* último recurso abaixo */ }

    return false;
  };

  const handleCopy = async () => {
    setBusy(true);
    try {
      const text = await buildBundle();
      const ok = await copyToClipboard(text);
      if (ok) {
        toast({
          title: "Cópia pronta!",
          description: `Projeto inteiro copiado (${Math.round(text.length / 1024)} KB). É só colar em outra IA.`,
        });
      } else {
        await handleDownload(text);
        toast({
          title: "Cópia muito grande para a área de transferência",
          description: "Baixamos o arquivo no seu celular. É só anexar/colar o conteúdo dele na outra IA.",
        });
      }
    } catch (e: any) {
      toast({
        title: "Erro ao gerar a cópia",
        description: e?.message ? String(e.message).slice(0, 140) : "Tente novamente pelo botão de baixar.",
        variant: "destructive",
      });
    }
    setBusy(false);
  };

  const handleDownload = async () => {
    setBusy(true);
    try {
      const text = await buildBundle();
      const date = new Date().toISOString().slice(0, 10);
      const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `projeto-da-barbearia-${date}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast({ title: "Download iniciado", description: "Arquivo salvo na memória do celular." });
    } catch {
      toast({ title: "Erro", description: "Não foi possível gerar o arquivo.", variant: "destructive" });
    }
    setBusy(false);
  };

  return (
    <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-3 sm:p-6">
      <div className="flex items-center gap-2 mb-2">
        <Package className="w-5 h-5 text-primary shrink-0" />
        <h2 className="text-base sm:text-lg font-bold text-foreground">Projeto da Barbearia</h2>
        {ready && (
          <span className="flex items-center gap-1 text-[11px] text-primary ml-auto">
            <CheckCircle2 className="w-3.5 h-3.5" /> pronto
          </span>
        )}
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground mb-4">
        Cópia completa e sempre atualizada do sistema: código, telas, funções e dados do banco.
        O projeto já fica preparado ao abrir o painel — ao clicar, sai na hora.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={handleCopy} disabled={busy} className="flex-1">
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
          Copiar projeto inteiro
        </Button>
        <Button onClick={handleDownload} disabled={busy} variant="outline" className="flex-1">
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Baixar no celular
        </Button>
      </div>
    </div>
  );
};

export default ProjectExport;
