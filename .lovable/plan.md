

## Problema

Todas as 11 políticas RLS do banco estão como **RESTRICTIVE**. No PostgreSQL, quando só existem políticas RESTRICTIVE e nenhuma PERMISSIVE, **nenhuma linha é acessível**. Isso causa:

1. Login admin faz `signInWithPassword` com sucesso, mas a query `user_roles` retorna vazio → "Acesso negado"
2. Tabelas públicas (barbers, services, blocked_slots) também bloqueadas para visitantes

## Correção

Uma única migração SQL que:

1. **Drop** todas as 11 políticas existentes
2. **Recria** todas como `PERMISSIVE` (usando `AS PERMISSIVE` explícito)

Políticas a recriar:

| Tabela | Policy | Tipo | Roles |
|--------|--------|------|-------|
| appointments | Anyone can create | INSERT | anon, authenticated |
| appointments | Admins can view | SELECT | authenticated |
| appointments | Admins can update | UPDATE | authenticated |
| appointments | Admins can delete | DELETE | authenticated |
| barbers | Anyone can view | SELECT | public |
| barbers | Admins can manage | ALL | authenticated |
| blocked_slots | Anyone can view | SELECT | public |
| blocked_slots | Admins can manage | ALL | authenticated |
| services | Viewable by everyone | SELECT | public |
| services | Admins can manage | ALL | authenticated |
| user_roles | Users can read own | SELECT | authenticated |

Nenhuma mudança de código necessária — o problema é 100% no banco.

