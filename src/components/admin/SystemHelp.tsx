import { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";

const TOPICS = [
  { q: "Como consultar meu faturamento?", a: "No topo do painel, em 'Faturamento do Barbeiro', você vê o bruto do dia, semana, mês e ano, o ticket médio e o histórico de janeiro a dezembro. O valor bruto vem sempre das entradas reais do Caixa." },
  { q: "Por que o bruto não soma as categorias?", a: "As categorias (material, pessoal, lazer, etc.) são destinos do dinheiro que já entrou. Somá-las ao bruto contaria o mesmo valor duas vezes. Por isso o painel mostra: Bruto, Já destinado e Disponível." },
  { q: "Como entender a faixa de desempenho?", a: "🔴 abaixo do esperado para o dia do mês, 🟡 dentro do ritmo da meta, 🟢 meta atingida ou acima. O cálculo compara o faturado até hoje com a parte proporcional da meta." },
  { q: "Como consultar clientes?", a: "Em 'Clientes e Frequência' a lista fica em ordem alfabética com busca por nome ou telefone. Ao tocar em um cliente aparecem visitas, último atendimento, intervalo médio, previsão de retorno, serviços e valor gerado." },
  { q: "Qual a diferença entre clientes únicos e visitas?", a: "Clientes únicos são pessoas diferentes. Visitas são atendimentos. Se o mesmo cliente vier 3 vezes no mês: 1 cliente único e 3 visitas." },
  { q: "Como verificar a frequência de retorno?", a: "O sistema calcula o intervalo médio entre as visitas de cada cliente e estima quando ele costuma voltar. É apenas informativo: não cria agendamento." },
  { q: "Como consultar agendamentos futuros?", a: "Na lista de agendamentos use as abas Hoje, Futuros e Histórico, ou selecione uma data específica no filtro." },
  { q: "Como visualizar pendências?", a: "Em 'Notificações e Pendências'. Cada aviso fica visível até você tocar em 'Confirmar que li', e depois vai para o histórico." },
  { q: "Como bloquear um dia ou horário?", a: "Use 'Bloquear Horários', que já existe no painel. Feriados são apenas informados — a decisão de trabalhar continua sendo sua." },
  { q: "Como verificar descontos e cupons?", a: "Em 'Cupons' e 'Códigos de Fidelidade'. O vale de R$ 7 é liberado a cada 10 atendimentos válidos e vale para serviços a partir de R$ 30. Problemas de validade aparecem nas pendências." },
];

const SystemHelp = () => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="bg-card/90 backdrop-blur border border-border rounded-lg p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-2">
        <HelpCircle className="w-5 h-5 text-primary" />
        <h2 className="text-base sm:text-lg font-bold">Uso do Sistema</h2>
      </div>
      <div className="space-y-1">
        {TOPICS.map((t, i) => (
          <div key={i} className="bg-background/40 rounded">
            <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left text-[11px] font-medium">
              <span>{t.q}</span>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && <p className="px-2 pb-2 text-[10px] text-muted-foreground leading-snug">{t.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemHelp;
