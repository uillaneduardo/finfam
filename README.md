# FinFam - Finanças Familiares Compartilhadas

O **FinFam** é uma aplicação web de organização financeira familiar compartilhada, destinada ao registro e acompanhamento de contas, entradas, saídas, compromissos financeiros, reservas e projetos. Este projeto foi desenhado sob a perspectiva de manter a simplicidade, a segurança e a colaboração necessárias para a gestão saudável das finanças de um lar.

Atualmente, o projeto encontra-se em sua **fase de estruturação técnica inicial, com documentação, modelagem de banco e scaffold da aplicação já criados**.

É importante destacar que:
* **Modelagem Física Inicial:** O banco de dados MySQL foi inicialmente modelado (`migrations/001_initial_schema.sql`) e possui uma carga de sementes inicial (`seeds/001_initial_seed.sql`) estruturada para testes de consistência matemática.
* **Frontend:** A interface frontend se encontra atualmente como um scaffold inicial pronto para desenvolvimento.
* **Backend Funcional:** A lógica de backend funcional (API, rotas de negócio, controladores, conexão ao banco) ainda não está concluída e precisa ser implementada.
* **Fluxos de Negócio:** Os fluxos operacionais completos (lançamentos, quitações, aportes, login) ainda não foram codificados.
* **Documentação como Referência:** A documentação detalhada continua sendo o guia e a referência principal de todo o desenvolvimento do FinFam.

---

## 🎯 Objetivo do Produto
O FinFam resolve a falta de transparência e o descontrole no orçamento familiar. Ele atua como um centralizador onde todos os membros da família podem registrar e acompanhar a saúde financeira comum, ajudando a responder a perguntas fundamentais como:
* Quanto dinheiro a família possui no total e onde ele está guardado?
* Qual é o saldo livre para gastos cotidianos após deduzir as reservas e projetos?
* Quais compromissos estão vencendo hoje, nesta semana ou estão atrasados?
* Quanto falta para atingir a meta de um projeto (ex: comprar uma geladeira ou formar a reserva de emergência)?
* Quem realizou cada movimentação ou é responsável por determinado pagamento?

---

## 🚀 Escopo do MVP (Módulos Principais)
O Produto Mínimo Viável (MVP) do FinFam contempla as seguintes capacidades essenciais:
1. **Multi-inquilinato (Famílias):** Suporte a isolamento completo de dados entre diferentes famílias.
2. **Contas Financeiras:** Cadastro e gestão de onde o dinheiro está guardado (contas correntes, poupanças, caixinhas, espécie).
3. **Movimentações:** Registro de Entradas (receitas), Saídas (despesas) e Transferências entre contas da mesma família.
4. **Contatos Financeiros:** Gestão de terceiros associados a pagamentos e recebimentos (amigos, empresas, concessionárias de serviços).
5. **Compromissos Financeiros:** Agendamento de contas a pagar e a receber com controle automático de atrasos e quitação transacional direta.
6. **Reservas e Projetos:** Separação do dinheiro das contas para metas específicas, diferenciando o Saldo Total do Saldo Livre.
7. **Auditoria e Filtros:** Rastreamento básico de criação/alteração de registros e filtros dinâmicos por período, responsável e tipo.

*Nota: Recursos como emissão de faturas de cartão de crédito, parcelamentos automáticos complexos, conciliação bancária via OFX/API e notificações automatizadas estão explicitamente fora do escopo do MVP.*

---

## 🛠️ Tecnologias Planejadas
O FinFam é concebido como um **Monólito Modular** de alta performance e baixo custo de manutenção:
* **Frontend:** React + TypeScript + Tailwind CSS (para um design limpo, de alto contraste e responsivo).
* **Backend:** Node.js + Express + TypeScript (API REST interna segura).
* **Banco de Dados:** MySQL (banco de dados relacional para consistência transacional forte e integridade referencial).

---

## 📂 Estrutura da Documentação
A especificação completa do FinFam está organizada na pasta `docs/` e pode ser navegada através dos links relativos abaixo:

1. [**01. Visão do Produto**](docs/01-visao-do-produto.md) — Conceito geral, problemas a resolver, público-alvo e proposição de valor.
2. [**02. Escopo do MVP e Limitações**](docs/02-escopo-do-mvp.md) — O que está incluído no MVP e o que foi deixado de fora do escopo inicial.
3. [**03. Requisitos Funcionais**](docs/03-requisitos-funcionais.md) — Lista completa de todos os requisitos funcionais mapeados por identificadores (RF-001 a RF-XXX).
4. [**04. Requisitos Não Funcionais**](docs/04-requisitos-nao-funcionais.md) — Atributos de qualidade como segurança, desempenho, integridade transacional e fuso horário.
5. [**05. Regras de Negócio**](docs/05-regras-de-negocio.md) — Regras de cálculo de saldos, regras de atraso, movimentações permitidas e restrições financeiras.
6. [**06. Modelo de Dados**](docs/06-modelo-de-dados.md) — Dicionário de entidades em inglês, atributos, chaves, índices, tipos conceituais e integridade.
7. [**07. Fluxos da Aplicação**](docs/07-fluxos-da-aplicacao.md) — Passo a passo lógico das interações de criação, autenticação, transações financeiras e resgates de reservas.
8. [**08. Autenticação e Segurança**](docs/08-autenticacao-e-seguranca.md) — Política de senhas, sessões via cookie seguro, isolamento estrito de dados e prevenção a ataques.
9. [**09. Critérios de Aceitação**](docs/09-criterios-de-aceitacao.md) — Cenários BDD (Dado que... Quando... Então...) para validação de fluxos críticos de negócio.
10. [**10. Arquitetura Planejada**](docs/10-arquitetura.md) — Padrão monolítico modular, estrutura de arquivos recomendada e fluxo de dados.
11. [**11. Roadmap de Desenvolvimento**](docs/11-roadmap.md) — Fases de execução planejadas, da infraestrutura básica à entrega das consultas.
12. [**12. Glossário de Termos**](docs/12-glossario.md) — Dicionário unificado de conceitos do FinFam em português.
13. [**13. Decisões Técnicas (ADRs)**](docs/13-decisoes-tecnicas.md) — Registro de decisões arquiteturais importantes e suas respectivas justificativas.
14. [**14. Migrations e Carga de Sementes**](docs/14-migrations-e-seed.md) — Planejamento das migrations estruturais, controle de versão do banco e a massa de dados (seed) de teste e homologação.
15. [**15. Diretrizes de Interface e Usabilidade**](docs/15-interface-e-usabilidade.md) — Princípios de design, navegação conceitual, registros rápidos, feedbacks de processamento, compatibilidade mobile/desktop e diretrizes de acessibilidade básica.


---

## 📈 Próximos Passos
1. **Validação da Especificação:** Revisão detalhada desta documentação junto aos stakeholders para congelar o escopo do MVP.
2. **Modelagem Física Inicial Criada:** Os scripts de DDL inicial (`migrations/001_initial_schema.sql`) e sementes de teste de consistência (`seeds/001_initial_seed.sql`) foram criados, restando ainda sua validação e execução em ambientes integrados.
3. **Setup do Repositório de Código:** Estruturação das pastas de backend e frontend no monólito (scaffold React pronto).
4. **Implementação da Etapa 1 (Pendente):** Desenvolvimento da autenticação segura, criação de família no primeiro uso, backend funcional e fluxos financeiros principais, que ainda precisam ser codificados.

---

*O projeto FinFam está sob licença Apache-2.0. Consulte o time de arquitetura para maiores informações de governança.*
