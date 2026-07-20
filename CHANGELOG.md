# Changelog — FinFam

Todas as principais alterações feitas neste repositório para estabilização, segurança e robustez estão listadas abaixo.

## [1.0.0] - 2026-07-20

### Adicionado
- **Esquemas de Validação com Zod:** Criados esquemas estritos no arquivo `/src/server/schemas/validation.schemas.ts` para validar todas as entradas financeiras, autenticação e usuários.
- **Isolamento de Dados por Família (Multi-tenant):** Implementado o validador `/src/server/utils/family.validator.ts` que valida a propriedade de toda e qualquer entidade referenciada por um usuário (impedindo manipulação maliciosa de IDs de outras famílias).
- **Testes Automatizados com Vitest:** Desenvolvida uma suíte robusta de testes automatizados (`/src/server/schemas/validation.schemas.test.ts` e `/src/server/utils/family.validator.test.ts`) para certificar que as regras financeiras e barreiras de segurança não sofram regressões.
- **Fuso Horário Local:** Adicionado tratamento explícito de datas com base no fuso brasileiro `America/Fortaleza`.

### Modificado
- **Segurança no Login:** O sistema agora responde com mensagens de erro neutras e genéricas ("Nome de usuário ou senha incorretos.") em caso de erros de autenticação ou se o status do usuário estiver inativo.
- **Segurança da Sessão (Live DB Check):** Refatorado o middleware `requireAuth` para executar uma consulta ao vivo no banco de dados para confirmar se a conta do usuário ainda está ativa.
- **Transações ACID e Concorrência:** Adicionado uso de bloqueio pessimista `SELECT ... FOR UPDATE` para sincronização confiável do saldo das contas e das metas poupadas nas caixinhas sob alta concorrência.
- **Eliminação de Mock de JSON:** Removida por completo a contingência de fallback de arquivos JSON locais no banco de dados para garantir que o MySQL seja a única fonte de verdade e integridade referencial física.

### Corrigido
- **Prevenção contra Clique Duplo:** Introduzida janela de idempotência de 3 segundos para lançamentos financeiros idênticos para mitigar registros duplicados por impaciência do usuário.
- **Prevenção de Orphaning em Transações:** Todos os endpoints que realizam múltiplos registros integrados (como quitação de compromisso, aporte e resgate de metas) agora executam suas ações em lote atômico encapsulado em transações MySQL gerenciadas.
