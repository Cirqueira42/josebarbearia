# Ajustar contagem de atendimentos e responsividade móvel

## Objetivo
Preservar os dados e fluxos existentes, corrigindo somente a contagem dos atendimentos manuais, a visualização no celular, o botão flutuante da página pública e a indicação de conteúdo abaixo.

## Alterações
1. **Contagem do caixa do dia**
   - Usar a classificação já existente: entrada na categoria `atendimento` com `appointment_id` é atendimento do APP; sem `appointment_id` é atendimento manual.
   - Exibir no Caixa do Dia: “Cliente hoje pelo APP”, “Cliente adicionado manualmente” e “Atendimento total do dia”.
   - Fazer o total ser sempre APP + manual, sem contar vendas de produtos e sem modificar registros antigos.
   - Atualizar os indicadores automaticamente após adicionar, editar, excluir ou finalizar um atendimento.

2. **Contagem e fidelidade separadas**
   - Manter cada agendamento concluído como um atendimento real independente nos relatórios e no faturamento.
   - Manter a fidelidade em no máximo 1 ponto por telefone por dia, somente para atendimento concluído elegível de R$ 30 ou mais.
   - Corrigir apenas eventuais lacunas na validação, sem transformar pontos de fidelidade em contagem de clientes e sem alterar o histórico existente.

3. **Responsividade completa no celular**
   - Revisar página pública, agendamento, painel admin e todos os módulos inferiores.
   - Corrigir grids, linhas de ações, filtros, formulários, listas, gráficos e resumos que possam ultrapassar a largura; quando necessário, empilhar no celular sem remover informação.
   - Preservar o controle manual já existente no início do painel (diminuir, aumentar e Salvar), incluindo persistência ao sair e entrar novamente.
   - Impedir overflow horizontal involuntário sem esconder controles importantes.

4. **Página pública**
   - Remover somente a renderização do botão flutuante do WhatsApp na tela principal, mantendo as demais integrações e contatos.
   - Manter “AGENDAR MEU HORÁRIO” e reforçar a indicação automática, discreta e animada para rolar e conhecer o restante da página.

## Validação
- Testar as contagens com atendimentos do APP, lançamentos manuais e vendas de produtos.
- Confirmar que APP + manual = total e que produtos não entram na conta.
- Testar fidelidade com vários horários no mesmo telefone e no mesmo dia.
- Revisar as rotas públicas e administrativas em celulares pequenos e médios, verificando visualmente ausência de conteúdo cortado ou rolagem horizontal.
