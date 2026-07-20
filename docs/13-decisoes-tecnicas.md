# Decisões Técnicas (ADR) - FinFam

Este documento adota o padrão **ADR** (Architecture Decision Record) para registrar as decisões tecnológicas e arquiteturais fundamentais tomadas para o **FinFam**, estabelecendo seu contexto, decisão, justificativa e consequências.

---

## ADR-01: Monólito Modular
* **Contexto:** Necessidade de simplificar o deploy, a manutenção e garantir rapidez na validação das ideias de negócio.
* **Decisão:** Unificar a API REST Express e a aplicação React (SPA) no mesmo repositório e sob uma mesma imagem de contêiner física.
* **Justificativa:** Reduz complexidade operacional e custos de infraestrutura no Cloud Run, além de permitir o compartilhamento de tipos TypeScript de ponta a ponta.
* **Consequências:** O build do frontend estático e do backend precisa ser feito de forma coordenada (`npm run build`).

---

## ADR-02: MySQL como Banco Principal
* **Contexto:** Exigência de forte consistência contábil, integridade referencial e transações robustas para dados financeiros familiares compartilhados.
* **Decisão:** Utilizar o MySQL como banco de dados relacional principal.
* **Justificativa:** Garantia nativa de suporte a transações ACID, chaves estrangeiras robustas e excelente performance para consultas de agregação de saldos.
* **Consequências:** Requer o provisionamento estável de uma instância de banco de dados e manutenção de migrações estruturadas (DDL).

---

## ADR-03: Autenticação baseada em Usuário e Senha
* **Contexto:** Manter a autenticação do MVP simples e de rápida adoção pelas famílias, sem depender de fluxos complexos de e-mail.
* **Decisão:** A autenticação será efetuada estritamente mediante o fornecimento de nome de usuário (`username`) e senha.
* **Justificativa:** Evita custos, dependências de envio de e-mails ou setups de login social complexos na fase de MVP.
* **Consequências:** O usuário é responsável por memorizar suas credenciais familiares.

---

## ADR-04: OTP Preparado para o Futuro (MFA)
* **Contexto:** Segurança futura para dados financeiros sem atrasar a entrega do MVP.
* **Decisão:** Estruturar o módulo e a tabela de usuários com propriedades nulas de TOTP para que o One-Time Password seja acoplado futuramente.
* **Justificativa:** Permite evolução rápida para autenticação de dois fatores sem quebrar a arquitetura ou requerer novas migrações drásticas no futuro.
* **Consequências:** Nenhum impacto no fluxo atual de login do MVP.

---

## ADR-05: Múltiplas Famílias na Mesma Instalação (SaaS Multi-tenant)
* **Contexto:** O sistema deve suportar que várias famílias se cadastrem no mesmo ambiente sem misturar dados.
* **Decisão:** Arquitetura Multi-tenant lógica onde todas as tabelas contêm uma referência direta à chave `family_id`.
* **Justificativa:** Escalabilidade da plataforma sem precisar instanciar servidores ou bancos isolados para cada família.
* **Consequências:** Todas as queries do banco de dados no Express devem obrigatoriamente validar o `family_id` para prevenir falhas de segurança.

---

## ADR-06: Cada Usuário pertence a uma única Família no MVP
* **Contexto:** Reduzir a complexidade de transições e vínculos de sessão.
* **Decisão:** No banco do MVP, o usuário possui uma relação `1:1` com sua família (uma chave estrangeira não nula `family_id` em `users`).
* **Justificativa:** Simplificação drástica das validações de tokens de acesso e do layout do menu de navegação da aplicação.
* **Consequências:** Se um usuário precisar gerenciar duas famílias distintas, precisará registrar usernames diferentes para cada uma delas no MVP.

---

## ADR-07: Nome de Usuário (`username`) Globalmente Único
* **Contexto:** Permitir um fluxo de login simplificado e direto.
* **Decisão:** Impor uma restrição `UNIQUE` na coluna `username` na tabela `users` do MySQL para toda a aplicação.
* **Justificativa:** Dispensa a necessidade de o usuário digitar o nome da família ou e-mail durante a tela de login.
* **Consequências:** Dois usuários de famílias diferentes não podem escolher o mesmo nome de login.

---

## ADR-08: Família como Contexto de Isolamento, não como Módulo Central
* **Contexto:** Evitar sobrecarregar o desenvolvimento com lógicas administrativas de grupos.
* **Decisão:** A entidade `families` funcionará apenas como uma "borda" de isolamento de consultas no backend.
* **Justificativa:** Foco de engenharia mantido nas funcionalidades puramente financeiras (saldos, transações e projetos).
* **Consequências:** Telas administrativas simples, exibindo o contexto da família em perfil ou rodapé.

---

## ADR-09: Atraso de Compromissos Calculado Dinamicamente
* **Contexto:** Evitar inconsistências contábeis e tarefas em segundo plano (cron jobs) de atualização de status de atraso.
* **Decisão:** O estado "atrasado" e os dias de atraso de um compromisso pendente não são salvos em banco. São calculados em tempo real na listagem com base na data atual.
* **Justificativa:** Economiza recursos do servidor e garante que as informações estejam sempre sincronizadas com a timezone correta em tempo real.
* **Consequências:** Requer que o cálculo seja implementado na query de seleção ou processado no controlador.

---

## ADR-10: Transferência não altera Patrimônio (Não é Receita nem Despesa)
* **Contexto:** Garantir consistência nas totalizações de caixa da família.
* **Decisão:** Transferências entre contas da mesma família não são somadas nas estatísticas de receitas ou despesas consolidadas.
* **Justificativa:** Evita inflacionar artificialmente o volume de entradas e saídas da família quando se trata de mera realocação de capital.
* **Consequências:** Filtros de estatísticas devem ignorar o tipo `'transfer'` ao apagar despesas/receitas.

---

## ADR-11: Dinheiro Reservado pertence à Conta Financeira (Sem Duplicação)
* **Contexto:** Dinheiro reservado para metas não pode flutuar no limbo ou ser duplicado no balanço familiar.
* **Decisão:** Valores alocados em reservas e projetos continuam atrelados logicamente às contas bancárias físicas cadastradas.
* **Justificativa:** Fidelidade contábil ao dinheiro real da família custodiado nos bancos.
* **Consequências:** O cálculo de saldo livre requer a subtração aritmética dos valores reservados em cada conta.

---

## ADR-12: Saldo Livre é Diferente de Saldo Nominal (Total)
* **Contexto:** Prevenir compras desavisadas usando dinheiro que já foi alocado a um sonho ou compromisso futuro.
* **Decisão:** O painel principal exibirá de forma explícita e destacada o Saldo Nominal (total nos bancos) e o Saldo Livre (nominal - reservado).
* **Justificativa:** É a base da proposta de valor de transparência financeira familiar compartilhada.
* **Consequências:** Exige que a interface apresente legendas claras e didáticas explicativas aos membros da família.

---

## ADR-13: Compromissos Concluídos Geram Movimentações Reais Automaticamente
* **Contexto:** Evitar duplo trabalho de preenchimento pelo usuário (ter que agendar a conta e depois registrar o pagamento manualmente).
* **Decisão:** Ao marcar um compromisso como pago ou recebido, o backend cria de forma automática e integrada o respectivo registro de transação financeira real de entrada ou saída.
* **Justificativa:** Melhora drasticamente a experiência do usuário, mantendo a consistência dos dados em lote.
* **Consequências:** A quitação requer a indicação explícita da conta financeira utilizada e do valor real despendido.

---

## ADR-14: Valores Monetários com Tipo DECIMAL
* **Contexto:** Prevenir erros matemáticos acumulados no tratamento de moedas.
* **Decisão:** Toda coluna financeira no MySQL usará o tipo `DECIMAL(15,2)`. No JavaScript/TypeScript, cálculos devem evitar operações puras de ponto flutuante binário utilizando classes ou estratégias que evitem imprecisões decimais.
* **Justificativa:** Evita perdas inexplicáveis de centavos comuns em tipos de dados de ponto flutuante padrão (`FLOAT`, `DOUBLE`).
* **Consequências:** Maior consistência de auditoria contábil.

---

## ADR-15: Fuso Horário Padronizado em `America/Fortaleza`
* **Contexto:** Evitar divergências de vencimento de boletos para famílias brasileiras que utilizam o aplicativo em diferentes regiões de fuso.
* **Decisão:** O timezone oficial para cálculo de datas atuais do servidor será padronizado no fuso `America/Fortaleza` (UTC-3).
* **Justificativa:** Alinha a inteligência de atrasos do sistema com o calendário comercial comum.
* **Consequências:** O backend deve forçar essa configuração ou converter as datas de forma consistente em requisições de API.

---

## ADR-16: Semana Financeira Iniciando na Segunda-feira
* **Contexto:** Definir os atalhos de filtros dinâmicos de período (semana).
* **Decisão:** Os cálculos de filtro dinâmico de período "semana atual" consideram a segunda-feira como o primeiro dia e o domingo como o último.
* **Justificativa:** Alinha-se ao fluxo de planejamento financeiro semanal corporativo e familiar padrão no Brasil.
* **Consequências:** Funções utilitárias de datas devem ser customizadas para refletir esse início de semana.

---

## ADR-17: Operações Compostas usam Transações Atômicas (ACID)
* **Contexto:** Falhas parciais em cadastros ou quitações não podem deixar registros órfãos ou inconsistências.
* **Decisão:** Operações do sistema que afetam mais de uma tabela de forma dependente devem rodar dentro de transações explícitas (`BEGIN TRANSACTION ... COMMIT`).
* **Justificativa:** Segurança e integridade inegociáveis sobre o banco de dados.
* **Consequências:** Maior rigor de tratamento de exceções no Express.

---

## ADR-18: Categorias como Metadados Opcionais
* **Contexto:** Simplificação do cadastro financeiro para evitar fricção no primeiro uso.
* **Decisão:** O preenchimento ou associação de categorias em transações ou compromissos é totalmente opcional (`NULL` permitido).
* **Justificativa:** Usuários tendem a abandonar apps que obrigam a criar complexos planos de contas antes de registrar uma simples despesa.
* **Consequências:** A interface deve tolerar e renderizar de forma elegante movimentações sem classificação.

---

## ADR-19: Não Há Cadastro Público de Membros Familiares
* **Contexto:** Impedir que pessoas de fora tenham acesso aos dados internos de uma família por engano ou varredura de URLs.
* **Decisão:** O cadastro de um novo membro é restrito e operado exclusivamente por um administrador autenticado de dentro da aplicação.
* **Justificativa:** Segurança da informação e blindagem do núcleo de inquilinos da plataforma.
* **Consequências:** Elimina a necessidade de telas de cadastro de login públicas para novos membros (fora a criação de uma nova família).

---

## ADR-20: Novos Membros são Criados pelo Administrador Familiar
* **Contexto:** Evitar links de convites complexos e e-mails de confirmação que possam falhar no MVP.
* **Decisão:** O administrador familiar insere os dados iniciais do membro e define uma senha provisória, repassando-a de forma direta (ex: pessoalmente ou por chat externo).
* **Justificativa:** Abordagem pragmática e extremamente confiável para o escopo do MVP.
* **Consequências:** É recomendável que o membro tenha opção de alterar sua senha em seu primeiro login futuro.
