# Requisitos Não Funcionais (RNF) - FinFam

Este documento apresenta os Requisitos Não Funcionais do **FinFam**, estabelecendo os limites de qualidade, segurança, infraestrutura, escalabilidade e manutenibilidade do sistema para o MVP.

---

## 1. Segurança e Privacidade

### RNF-001 — Isolamento Estrito de Dados (Multi-inquilinato)
* **Descrição:** O sistema deve assegurar que todas as queries de leitura, escrita, atualização ou exclusão filtrem obrigatoriamente os dados pela chave `family_id` obtida da sessão ativa do usuário no backend.
* **Métrica:** Nenhum usuário de uma família A deve ser capaz de visualizar ou interagir com registros da família B sob nenhuma circunstância.

### RNF-002 — Proteção de Credenciais e Senhas
* **Descrição:** Senhas de usuários nunca devem ser armazenadas em texto simples. O sistema deve utilizar uma função de hash criptográfico segura e reconhecida pelo mercado (como Argon2id ou bcrypt) antes de persistir o valor no banco de dados.

### RNF-003 — Gestão Segura de Sessão
* **Descrição:** A autenticação de sessão deve ser mantida por meio de Cookies seguros.
* **Propriedades:** Os cookies de sessão devem conter as diretivas `HttpOnly` (prevenindo roubo via XSS), `SameSite=Lax` ou `Strict` (prevenindo ataques CSRF) e `Secure` (exigido em ambientes HTTPS/produção).

### RNF-004 — Proteção contra Ataques de Autenticação (Brute Force)
* **Descrição:** O sistema deve ter limites de tentativas de login inválidos consecutivos por IP ou nome de usuário (ex: máximo de 5 tentativas por minuto) aplicando um bloqueio temporário (ex: 15 minutos).

---

## 2. Consistência e Integridade Financeira

### RNF-005 — Valores Monetários de Alta Precisão (Anti-Ponto-Flutuante)
* **Descrição:** O sistema não deve utilizar tipos de ponto flutuante (como `FLOAT` ou `DOUBLE` no MySQL, ou `number` puro em JS para cálculos diretos) para manipular valores monetários.
* **Métrica:** No banco de dados, todos os valores financeiros devem utilizar o tipo `DECIMAL(15,2)` ou ser convertidos para centavos (`INT`). Na aplicação, as operações matemáticas devem usar tratamento estrito para evitar dízimas periódicas e perdas de centavos acumuladas.

### RNF-006 — Consistência Transacional (Atomicidade)
* **Descrição:** Operações compostas que envolvem alteração de múltiplos estados financeiros devem ser executadas dentro de uma transação ACID de banco de dados.
* **Exemplos:**
  * Criação de família + usuário administrador (RF-001).
  * Quitação de compromisso + criação de movimentação (RF-016).
  * Transferência de saldos (RF-011).
  * Transferência de valores de reserva entre contas (RF-018).

---

## 3. Desempenho e Escalabilidade

### RNF-007 — Baixo Tempo de Resposta da API
* **Descrição:** As requisições de API para rotas comuns de listagem e leitura de saldos devem responder em menos de 200 milissegundos sob condições normais de rede, utilizando índices de banco de dados apropriados em chaves combinadas (`family_id`, `created_at`, etc.).

### RNF-008 — Limitação de Tamanho de Payload
* **Descrição:** O backend deve rejeitar requisições com payloads maiores que 1MB para evitar ataques de negação de serviço (DoS) por sobrecarga de memória.

---

## 4. Disponibilidade, Manutenção e Localidade

### RNF-009 — Fuso Horário Unificado
* **Descrição:** O sistema deve padronizar todo o processamento de datas e cálculos de prazos ou atrasos no fuso horário `America/Fortaleza` (UTC-3). Datas salvas no banco devem registrar explicitamente o timezone ou ser armazenadas em UTC com conversão consistente na exibição.

### RNF-010 — Monólito Modular Simples
* **Descrição:** O sistema deve ser estruturado em uma arquitetura de monólito modular, onde o backend e o frontend residem no mesmo repositório de código, compartilhando tipagens TypeScript e facilitando o deploy unificado em contêineres de nuvem (como Cloud Run).

### RNF-011 — Responsividade Multidispositivo e Mobile-First
* **Descrição:** A interface do usuário (UI) desenvolvida no frontend deve ser totalmente responsiva, adaptando-se sem quebra de elementos de smartphones (mínimo de 320px de largura) a monitores desktop de alta resolução, priorizando a legibilidade em telas móveis e o fluxo vertical sem rolagem horizontal.

### RNF-012 — Área Mínima de Toque (Acessibilidade e Mobile)
* **Descrição:** Todos os elementos interativos na interface em dispositivos móveis (botões, inputs, abas, links e ícones clicáveis) devem possuir uma área mínima de toque de **44px x 44px** para garantir o uso por toque de forma confortável e precisa.

### RNF-013 — Prevenção de Ações e Registros Duplicados
* **Descrição:** O sistema deve prevenir o registro duplicado de movimentações ou compromissos bloqueando o botão de envio (submissão) de formulários imediatamente após o primeiro clique do usuário, mantendo-o desabilitado e em estado visual de carregamento até o término do processamento no servidor.

### RNF-014 — Feedback Visual e Estados de Carregamento
* **Descrição:** Operações que demandam processamento assíncrono ou requisições de rede devem fornecer feedback visual instantâneo (como spinners, barras de progresso ou esqueletos de tela) e nunca dar a impressão de conclusão antes de receber a resposta afirmativa do backend.

### RNF-015 — Legibilidade e Contraste de Acessibilidade
* **Descrição:** Todo o texto apresentado na aplicação deve utilizar tamanhos legíveis (mínimo de 14px para textos auxiliares e 16px para inputs e parágrafos normais) e possuir uma relação de contraste mínima de **4.5:1** em relação ao fundo, atendendo aos critérios de acessibilidade WCAG AA.

### RNF-016 — Independência Visual de Cores
* **Descrição:** Informações financeiras críticas (como situações de atraso ou valores negativos) não devem depender unicamente de diferenciações de cor (como o uso isolado de verde ou vermelho) para transmitir seu significado. Devem sempre ser acompanhadas de rótulos de texto explícitos ou símbolos textuais auxiliares.

### RNF-017 — Consistência de Navegação
* **Descrição:** A navegação do sistema deve ser linear e previsível, utilizando no máximo dois níveis hierárquicos e oferecendo o mesmo padrão de transição e comportamento em todos os módulos da aplicação.

### RNF-018 — Estados Vazios Orientativos (Empty States)
* **Descrição:** Qualquer tela ou listagem da aplicação que se encontre vazia (sem registros ou movimentações cadastrados) não deve ficar em branco. Ela deve obrigatoriamente apresentar uma mensagem orientativa simples explicando a ausência dos dados e fornecendo um botão de atalho direto para guiar a próxima ação do usuário.

