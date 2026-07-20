# Changelog — FinFam

Todas as principais alterações feitas neste repositório para estabilização, segurança e robustez estão listadas abaixo.

## [1.1.0] - 2026-07-20

### Adicionado
- **Suíte Completa de Testes de Integração de Sistema:** Criada suíte sob `/src/server/integration.test.ts` que executa testes ponta a ponta sem mocks contra banco de dados real, cobrindo 17 cenários completos (51 assertions) de autenticação, multi-tenant, transações, concorrência, idempotência e projetos.
- **Índice Único de Idempotência:** Adicionado índice único por `family_id` e `idempotency_key` no banco de dados para evitar lançamentos duplicados sob qualquer condição.

### Modificado
- **Quitação de Compromissos Concorrente:** Refatorado fluxo de pagamento para abrir a transação de forma precoce, buscar o compromisso via `SELECT ... FOR UPDATE` (travamento pessimista), validar status e saldos na mesma transação, e realizar o `UPDATE` atômico validando status `pending` e confirmando que exatamente uma linha foi alterada.
- **Estratégia de Idempotência Confiável:** Substituída a prevenção temporal por uma validação definitiva baseada em `idempotency_key`, retornando a resposta original armazenada e impedindo duplicidades paralelas de forma resiliente.
- **Cálculo Monetário Confiável:** Refatoração de todos os cálculos de saldo de contas e projetos para utilizar inteiros (centavos) para evitar imprecisões decimais inerentes ao ponto flutuante do JavaScript.

### Corrigido
- **Consulta de Balanços e Destruturação do Driver MySQL:** Corrigido bug de desestruturação múltipla nas respostas do `runner` de transação que limpava o invólucro do array de linhas do driver MySQL, resultando em erros `500 TypeError` nas operações de projetos.

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
