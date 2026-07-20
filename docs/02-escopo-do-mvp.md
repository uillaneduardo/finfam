# Escopo do MVP e Limitações - FinFam

Este documento delimita formalmente as barreiras funcionais do **FinFam** em seu Produto Mínimo Viável (MVP), garantindo um desenvolvimento focado, sustentável e livre de "scope creep" (aumento descontrolado do escopo).

---

## 1. O que está DENTRO do MVP

O MVP do FinFam abrange exclusivamente as seguintes capacidades:

### 1.1 Gestão de Inquilinato e Autenticação
* **Criação de Família (Primeiro Uso):** Cadastro de uma nova família em conjunto com o primeiro usuário administrador em uma única transação atômica.
* **Autenticação Segura:** Autenticação por nome de usuário (globalmente único) e senha criptografada em hash. Sem login social ou OTP nesta fase (mas preparado estruturalmente para TOTP futuro).
* **Gestão de Sessão:** Cookie seguro e isolado (`HttpOnly`, `SameSite`, `Secure` em produção).
* **Gestão de Membros:** Criação e desativação manual de membros (`member`) por um administrador (`admin`) da família.

### 1.2 Estrutura Financeira Básica
* **Contas Financeiras:** Cadastro e inativação de locais físicos ou virtuais onde o dinheiro é custodiado (Nubank, poupança, carteira, etc.).
* **Contatos Financeiros:** Cadastro de terceiros associados aos fluxos financeiros (concessionárias, amigos, fornecedores, etc.).
* **Categorias Opcionais:** Organização de movimentações e compromissos de forma livre. O preenchimento da categoria não deve ser obrigatório para nenhum registro do sistema.

### 1.3 Movimentações e Saldos
* **Entradas (Receitas):** Incrementam o saldo de uma conta de destino.
* **Saídas (Despesas):** Decrementam o saldo de uma conta de origem.
* **Transferências:** Movem saldos entre contas distintas da mesma família. Não representam alteração de patrimônio líquido (não são receitas ou despesas).
* **Cálculo de Saldos Integrado:** Distinção matemática automática entre **Saldo Total**, **Saldo Reservado** e **Saldo Livre** (tanto individual por conta quanto global por família).

### 1.4 Compromissos e Agendamentos
* **Compromissos a Pagar e a Receber:** Cadastro de obrigações com data de vencimento e status (`pendente`, `pago`, `recebido`, `cancelado`).
* **Cálculo de Atraso:** Identificação dinâmica de atrasos, indicando há quantos dias a fatura está vencida com base na data atual da timezone `America/Fortaleza`.
* **Quitação Assistida:** Fluxo transacional que converte um compromisso pendente em movimentação financeira real (entrada ou saída) ao ser marcado como pago/recebido.

### 1.5 Reservas e Projetos
* **Caixinhas Compartilhadas:** Criação de reservas/projetos com metas financeiras.
* **Operações de Reserva:** Depósitos, retiradas e transferências de reservas registradas obrigatoriamente através de histórico detalhado, afetando o saldo livre da respectiva conta sem duplicar o dinheiro.

---

## 2. O que está FORA do MVP

Para viabilizar a entrega rápida e a simplicidade, os seguintes tópicos estão **estritamente fora do escopo do MVP** e não devem ser implementados agora:

* 🚫 **Cartões de Crédito com Faturas Complexas:** O controle de compras parceladas, limites de cartões e fechamento de faturas não será implementado. Cartões de crédito deverão ser tratados provisoriamente como contas de pagamento comuns ou as saídas registradas diretamente no débito real.
* 🚫 **Parcelamentos de Longo Prazo Automáticos:** Sem geração recorrente de movimentações futuras ou parcelamento automático de despesas (ex: compras em 12x). Compromissos recorrentes devem ser criados manualmente ou duplicados caso necessário.
* 🚫 **Integração Bancária (Open Finance):** Sem conexão automática com bancos via APIs regulamentadas ou web scrapping.
* 🚫 **Importação de Extratos:** Sem leitura de arquivos OFX, CSV ou extratos PDF de bancos.
* 🚫 **Notificações Ativas:** Sem envio de e-mails, SMS, Web Push ou alertas no WhatsApp para contas vencendo. O acompanhamento se dá exclusivamente de forma visual dentro da aplicação.
* 🚫 **Mecanismos de IA Integrada:** Sem assistentes de recomendação financeira, categorização por IA ou previsões matemáticas de fluxo de caixa baseadas em aprendizado de máquina.
* 🚫 **Investimentos Avançados:** Sem acompanhamento de taxas de rentabilidade (CDI, IPCA, Ações) ou cálculo de rendimento automático de reservas.
* 🚫 **Múltiplas Moedas:** Suporte exclusivo ao Real Brasileiro (BRL).
* 🚫 **Anexos e Comprovantes:** Sem upload de arquivos de imagem ou PDF para comprovantes fiscais ou faturas.
* 🚫 **Relatórios Contábeis Complexos:** Sem balanços, DREs avançados ou relatórios de exportação para fins tributários.
* 🚫 **Orçamento Avançado (Budgeting):** Sem definição de limites estritos de gastos mensais por categoria com travas ou bloqueios de uso.
* 🚫 **Login Social e Autenticação Multifator Ativa:** Sem OAuth com Google, Apple, Facebook, etc. Sem MFA ativo (apenas especificado para o futuro).
* 🚫 **Convites de Membros por Link de Convite:** O administrador adiciona diretamente os membros inserindo seus nomes e senhas temporárias. Não haverá fluxo de e-mail de convite com links de expiração.
* 🚫 **Múltiplas Famílias por Usuário:** Cada usuário pertence a exatamente uma família. Sem botões de "Troca de Família" ou "Criar segunda família" para o mesmo usuário.

---

## 3. Justificativa das Limitações
A exclusão desses recursos foca os recursos de engenharia na consistência financeira pura (garantir que as contas e transferências fechem seus saldos de forma impecável) e na robustez do isolamento multi-tenant, estabelecendo alicerces estáveis sobre os quais as funcionalidades futuras poderão se apoiar sem carregar dívidas técnicas ou bugs de estado financeiro.
