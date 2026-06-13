# Corrigir loop de atualização — verificar 1x por dia

## Problema
O app fica recarregando sozinho em loop com "Nova versão disponível! Atualizando...", impedindo o agendamento. Causa: o verificador atual compara o HTML inteiro a cada 1 minuto, e qualquer diferença (até dinâmica) dispara recarregamento.

## Solução
Reescrever o verificador para rodar **no máximo 1 vez por dia** e ser confiável:

1. **Trocar a estratégia de detecção:** em vez de comparar o HTML inteiro (instável), buscar o `index.html` e extrair apenas o caminho do bundle JS principal (ex.: `/assets/index-AbC123.js`). Esse hash só muda quando há build novo de verdade — elimina falsos positivos.

2. **Verificar só 1x por dia:**
   - Guardar no `localStorage` a data da última verificação (`app:last-check-date`, formato `YYYY-MM-DD` no fuso de São Paulo).
   - Só checar se a data de hoje for diferente da última verificação.
   - Remover o `setInterval` de 1 minuto, o trigger de `visibilitychange` e o de `online` (ou mantê-los, mas todos respeitando o "1x por dia").

3. **Primeira execução:** apenas armazena o bundle atual, sem recarregar (evita reload no primeiro acesso).

4. **Quando detectar atualização real:** mostra o toast "Nova versão disponível! Atualizando..." e recarrega uma única vez.

5. **Manter** a limpeza de service workers antigos e caches que já existe (segura, roda 1x ao abrir).

## Resultado
- Loop infinito eliminado — o agendamento volta a funcionar.
- Clientes recebem atualizações automaticamente, mas no máximo 1 vez por dia, sem incomodar durante o uso.

## Detalhes técnicos
- Editar `src/hooks/useAppUpdater.ts`:
  - Substituir `hashString(htmlInteiro)` por extração via regex do `src` do `<script type="module">` principal
  - Adicionar chave `app:last-check-date` no localStorage (data no fuso `America/Sao_Paulo`, usando o helper existente em `src/lib/brazilTime.ts` se aplicável)
  - Remover `CHECK_INTERVAL_MS`, `setInterval`, listeners de `visibilitychange` e `online`
  - Manter `unregister()` dos service workers antigos
- Nenhuma mudança em `App.tsx`, backend, banco ou edge functions
