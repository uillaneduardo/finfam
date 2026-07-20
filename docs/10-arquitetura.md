# Arquitetura Planejada - FinFam

Este documento especifica a visão de engenharia e a estrutura arquitetural adotada para o **FinFam**, focando na facilidade de implantação, baixo acoplamento e consistência estrita dos dados familiares.

---

## 1. Padrão Arquitetural: Monólito Modular

O FinFam é estruturado como um **Monólito Modular**. Essa escolha de padrão arquitetural visa:
* **Facilidade de Deploy:** Frontend e Backend residem no mesmo repositório e rodam no mesmo contêiner físico.
* **Compartilhamento de Tipos:** A tipagem em TypeScript das entidades do banco e do payload da API pode ser importada tanto no servidor quanto no cliente, diminuindo erros de integração.
* **Módulos Claros no Backend:** O código do servidor é organizado por domínios de negócio bem definidos (autenticação, transações, compromissos), permitindo isolamento lógico que pode ser escalado ou facilmente migrado para serviços separados no futuro caso necessário.

---

## 2. Tecnologias Adotadas

* **Frontend (SPA):**
  * **React 19 & TypeScript:** Interfaces baseadas em componentes funcionais e hooks nativos.
  * **Vite:** Empacotador rápido para desenvolvimento e build estático eficiente (`/dist`).
  * **Tailwind CSS:** Para estilização responsiva por meio de classes utilitárias, garantindo consistência visual de alta qualidade.
  * **Lucide-react:** Pacote oficial unificado para representação vetorial de ícones.
* **Backend (REST API):**
  * **Node.js & Express:** Servidor leve e performático para o fornecimento dos endpoints REST.
  * **Zod:** Para validação de contratos de entrada no backend (schemas de requisição).
  * **bcrypt / Argon2id:** Para processamento criptográfico seguro de senhas.
* **Banco de Dados (Relacional):**
  * **MySQL (v8.0+):** Banco de dados relacional principal que garante propriedades ACID (Atomicidade, Consistência, Isolamento e Durabilidade) nativas para transações financeiras.

---

## 3. Estrutura de Diretórios Recomendada

A estrutura de arquivos sugerida para acomodar o monólito modular de forma organizada e limpa é apresentada a seguir:

```text
/
├── index.html                  # Ponto de entrada HTML do app (Vite)
├── package.json                # Gerenciamento de scripts e dependências
├── tsconfig.json               # Configurações de compilação TS
├── vite.config.ts              # Configuração do Vite e aliases
├── .env.example                # Documentação de variáveis de ambiente obrigatórias
├── .gitignore                  # Arquivos ignorados pelo controle de versão
│
├── src/
│   ├── main.tsx                # Ponto de entrada do React
│   ├── index.css               # Imports globais do Tailwind CSS
│   ├── App.tsx                 # Roteamento e layout base do frontend
│   │
│   ├── client/                 # CÓDIGO DO FRONTEND
│   │   ├── components/         # Componentes React reutilizáveis (botões, modais)
│   │   ├── hooks/              # Custom hooks para requisições e estado local
│   │   ├── views/              # Telas completas (Dashboard, Login, Reservas, etc.)
│   │   └── utils/              # Formatadores de moeda, datas e strings
│   │
│   ├── server/                 # CÓDIGO DO BACKEND
│   │   ├── server.ts           # Ponto de entrada do servidor Express (Porta 3000)
│   │   ├── database/           # Conexão com MySQL e pool de conexões
│   │   ├── middleware/         # Autenticação, tratamento de erros e rate-limiter
│   │   └── modules/            # Módulos de domínio de negócio isolados
│   │       ├── auth/           # Login, logout, criação de família e sessão
│   │       ├── users/          # Gestão de usuários membros e privilégios
│   │       ├── accounts/       # Gerenciamento de contas bancárias e saldos
│   │       ├── transactions/   # Lançamento de movimentações e transferências
│   │       ├── commitments/    # Fluxo de compromissos e agendamento de faturas
│   │       └── projects/       # Gestão de caixinhas, reservas e depósitos
│   │
│   └── shared/                 # Tipos e interfaces TS compartilhados entre client/server
│       └── types.ts            # Definição das estruturas de entidades e enums
│
├── migrations/                 # Scripts DDL para inicialização do banco MySQL
└── seeds/                      # Dados iniciais para facilitação do ambiente de testes
```

---

## 4. Integração e Fluxo de Comunicação

O fluxo de dados segue o padrão tradicional cliente-servidor através de uma API JSON:

```text
[ React Client (SPA) ]
        |
        |  (1) Envia requisição com JSON no payload
        |      Cookie de Sessão (HttpOnly) é anexado automaticamente pelo browser
        v
[ Express Server (Porta 3000) ]
        |
        |  (2) Middleware valida se cookie de sessão é ativo
        |      Extrai `family_id` e `user_id` de forma segura
        |
        |  (3) Middleware de Schema (Zod) limpa e valida dados de entrada
        |
        |  (4) Controller injeta o `family_id` da sessão nos parâmetros da query
        |
        v
[ MySQL Database ]
        |  (5) Executa prepared statement com isolamento
        v
[ Retorno de Dados ]
        |
        +---> Controller formata resposta JSON e devolve status HTTP apropriado (200, 201, 400, 404, etc.)
```

---

## 5. Diretrizes do Servidor para Cloud Ingress

Para garantir o correto funcionamento da aplicação no ambiente de contêineres e proxy reverso:
1. **Host e Porta:** O servidor Express deve escutar obrigatoriamente no host `0.0.0.0` e na porta `3000`.
2. **Tratamento do SPA:** No ambiente de produção, após verificar as rotas da API (`/api/*`), o servidor Express deve servir os arquivos estáticos compilados na pasta `/dist` e redirecionar qualquer outra requisição não reconhecida para `/dist/index.html` (comportamento de fallback do React Router).
