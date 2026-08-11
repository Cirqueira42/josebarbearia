// Categorias financeiras do painel da barbearia
// Regras: faturamento bruto vem dos atendimentos concluídos + entradas manuais
// que NÃO estejam ligadas a um atendimento (evita duplicidade).

export type Bucket = "despesa" | "material" | "pessoal" | "lazer";

export const PERSONAL_CATEGORIES = [
  { value: "pessoal_cartao", label: "💳 Cartão" },
  { value: "pessoal_comida", label: "🍽️ Comida" },
  { value: "pessoal_pensao", label: "👨‍👦 Pensão" },
  { value: "pessoal_outras", label: "🏠 Outras contas pessoais" },
] as const;

export const MATERIAL_CATEGORIES = [
  { value: "material", label: "🧰 Materiais / equipamentos" },
] as const;

export const LAZER_CATEGORIES = [
  { value: "lazer", label: "🎉 Lazer" },
] as const;

export const SHOP_EXPENSE_CATEGORIES = [
  { value: "despesa", label: "🔧 Despesa da barbearia" },
  { value: "produto", label: "Produtos para revenda" },
  { value: "aluguel", label: "Aluguel" },
  { value: "energia", label: "Energia" },
  { value: "água", label: "Água" },
  { value: "manutenção", label: "Manutenção" },
  { value: "equipamento", label: "Equipamento" },
  { value: "taxas", label: "Taxas" },
  { value: "marketing", label: "Marketing" },
  { value: "outros", label: "Outros" },
] as const;

export const ALL_OUT_CATEGORIES = [
  ...MATERIAL_CATEGORIES,
  ...SHOP_EXPENSE_CATEGORIES,
  ...PERSONAL_CATEGORIES,
  ...LAZER_CATEGORIES,
];

export const bucketOf = (category: string): Bucket => {
  const c = (category || "").toLowerCase();
  if (c === "lazer") return "lazer";
  if (c.startsWith("pessoal")) return "pessoal";
  if (c === "material" || c === "materiais") return "material";
  return "despesa";
};

export const categoryLabel = (value: string) =>
  ALL_OUT_CATEGORIES.find((c) => c.value === value)?.label || value;

export const fmtBRL = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ==========================================================
// Metas mensais (substituem a antiga distribuição percentual)
// ==========================================================
export type GoalKey = "pensao" | "aluguel" | "contas" | "material" | "diversao";

export type MonthlyGoal = {
  key: GoalKey;
  label: string;
  target: number;
  /** categorias de SAÍDA que abatem/realizam essa meta */
  categories: string[];
};

export const DEFAULT_MONTHLY_GOALS: MonthlyGoal[] = [
  { key: "pensao", label: "👨‍👦 Pensão", target: 500, categories: ["pessoal_pensao"] },
  { key: "aluguel", label: "🏠 Aluguel", target: 250, categories: ["aluguel"] },
  { key: "contas", label: "💳 Contas de casa / cartão", target: 1000, categories: ["pessoal_cartao", "pessoal_comida", "pessoal_outras", "energia", "água"] },
  { key: "material", label: "🧰 Material da barbearia", target: 350, categories: ["material", "materiais", "equipamento"] },
  { key: "diversao", label: "🎉 Diversão / lazer", target: 250, categories: ["lazer"] },
];

export const goalsTotal = (goals: MonthlyGoal[]) =>
  goals.reduce((s, g) => s + Number(g.target || 0), 0);

export const goalPercent = (goals: MonthlyGoal[], g: MonthlyGoal) => {
  const total = goalsTotal(goals);
  return total > 0 ? (Number(g.target || 0) / total) * 100 : 0;
};

/**
 * Distribui (virtualmente) o faturamento bruto entre as metas.
 * - Nunca destina mais que a meta de cada categoria.
 * - O que sobraria de uma meta já completa é redistribuído entre as demais.
 * - Não gera lançamento financeiro: é apenas organização/reserva.
 */
export const allocateToGoals = (
  gross: number,
  goals: MonthlyGoal[],
): { allocated: Record<string, number>; totalAllocated: number; leftover: number } => {
  const allocated: Record<string, number> = {};
  goals.forEach((g) => { allocated[g.key] = 0; });

  let remaining = Math.max(0, Number(gross) || 0);

  // até 10 rodadas de redistribuição (converge bem antes disso)
  for (let round = 0; round < 10 && remaining > 0.005; round++) {
    const active = goals.filter((g) => allocated[g.key] < Number(g.target || 0) - 0.005);
    if (active.length === 0) break;

    const capacity = active.reduce((s, g) => s + (Number(g.target || 0) - allocated[g.key]), 0);

    if (remaining >= capacity) {
      active.forEach((g) => { allocated[g.key] = Number(g.target || 0); });
      remaining -= capacity;
      break;
    }

    active.forEach((g) => {
      const share = (Number(g.target || 0) - allocated[g.key]) / capacity;
      allocated[g.key] += remaining * share;
    });
    remaining = 0;
  }

  const totalAllocated = goals.reduce((s, g) => s + allocated[g.key], 0);
  return { allocated, totalAllocated, leftover: Math.max(0, (Number(gross) || 0) - totalAllocated) };
};

