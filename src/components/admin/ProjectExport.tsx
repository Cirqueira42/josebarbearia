import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package, Copy, Download, Loader2 } from "lucide-react";

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

const ProjectExport = () => {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const buildBundle = async (): Promise<string> => {
    const parts: string[] = [];
    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    parts.push(
      `# PROJETO DA BARBEARIA — José Barbearia\n`,
      `Cópia completa do sistema gerada em ${now} (horário de Brasília).\n\n`,
      `Este arquivo contém TODO o código-fonte do aplicativo, as funções do servidor e os dados do banco.\n`,
      `Basta colar este conteúdo em qualquer IA (ou entregar a outro desenvolvedor) para reconstruir o sistema.\n\n`,
      `Backend: Lovable Cloud (Supabase). Frontend: React + Vite + TypeScript + Tailwind.\n\n`,
      `---\n\n## 1. CÓDIGO-FONTE\n\n`
    );

    const paths = Object.keys(codeFiles).sort();
    for (const path of paths) {
      try {
        const content = await codeFiles[path]();
        const ext = path.split(".").pop() || "";
        parts.push(`\n### Arquivo: ${path}\n\n\`\`\`${ext}\n${content}\n\`\`\`\n`);
      } catch {
        parts.push(`\n### Arquivo: ${path}\n(não foi possível ler)\n`);
      }
    }

    parts.push(`\n---\n\n## 2. DADOS DO BANCO\n`);
    for (const table of TABLES) {
      try {
        const { data, error } = await (supabase as any).from(table).select("*").limit(5000);
        if (error) {
          parts.push(`\n### Tabela: ${table}\n(sem acesso: ${error.message})\n`);
        } else {
          parts.push(
            `\n### Tabela: ${table} (${data?.length ?? 0} registros)\n\n\`\`\`json\n${JSON.stringify(
              data ?? [],
              null,
              2
            )}\n\`\`\`\n`
          );
        }
      } catch (e: any) {
        parts.push(`\n### Tabela: ${table}\n(erro: ${e?.message || e})\n`);
      }
    }

    parts.push(
      `\n---\n\n## 3. COMO RESTAURAR\n\n`,
      `1. Crie um novo projeto React + Vite + TypeScript com Tailwind e shadcn/ui.\n`,
      `2. Recrie cada arquivo da seção 1 exatamente no mesmo caminho.\n`,
      `3. Crie um backend Supabase e recrie as tabelas listadas na seção 2 (com RLS).\n`,
      `4. Importe os dados JSON de cada tabela.\n`,
      `5. Configure as variáveis: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID.\n`,
      `6. Configure os segredos do servidor: TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID.\n`,
      `7. Rode: npm install && npm run dev.\n`
    );

    return parts.join("");
  };

  const handleCopy = async () => {
    setBusy(true);
    try {
      const text = await buildBundle();
      await navigator.clipboard.writeText(text);
      toast({
        title: "Cópia pronta!",
        description: `Projeto inteiro copiado (${Math.round(text.length / 1024)} KB). É só colar em outra IA.`,
      });
    } catch {
      toast({ title: "Erro", description: "Não foi possível copiar. Use o botão de baixar.", variant: "destructive" });
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
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground mb-4">
        Cópia completa e sempre atualizada do sistema: código, telas, funções e todos os dados do banco.
        Use para colar em outra IA ou guardar no celular caso o projeto se perca.
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
