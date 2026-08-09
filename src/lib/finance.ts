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
