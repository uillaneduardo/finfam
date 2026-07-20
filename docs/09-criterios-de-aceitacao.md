# Critérios de Aceitação (BDD) - FinFam

Este documento contém os **Critérios de Aceitação** para os fluxos principais e cenários críticos de exceção do **FinFam** escritos no formato de comportamento BDD (**Dado que... Quando... Então...**), auxiliando o time de engenharia e controle de qualidade (QA) no teste das funcionalidades.

---

## 1. Módulo de Autenticação e Usuários

### Cenário 1: Primeiro Uso (Sucesso)
* **Dado que** o sistema não possui nenhum usuário registrado
* **Quando** o usuário preenche o formulário informando o nome da família "Silva", seu nome "Carlos", o nome de usuário "carlos" e digita senhas correspondentes e seguras
* **Então** o sistema deve persistir em uma única transação a família "Silva" e o usuário "carlos" com o papel `admin`, sem criar registros órfãos ou parciais em caso de falha, gerando a sessão e redirecionando para o painel principal.

### Cenário 2: Login com Usuário Inativo (Erro de Validação)
* **Dado que** o usuário "carlos" pertence à família "Silva", mas foi desativado pelo administrador (`status = 'inactive'`)
* **Quando** "carlos" tenta realizar o login fornecendo suas credenciais corretas
* **Então** o sistema deve rejeitar o login apresentando a mensagem neutra: *"Usuário ou senha incorretos"* para segurança.

### Cenário 3: Isolamento de Dados entre Famílias (Autorização)
* **Dado que** o usuário "jose" está autenticado na sessão vinculado à Família A
* **Quando** "jose" tenta acessar o endpoint `GET /api/accounts/:id` informando o ID de uma conta pertencente à Família B
* **Então** o sistema deve retornar status `404 Not Found` ou `403 Forbidden` e impedir a visualização dos dados.

---

## 2. Módulo de Movimentações Financeiras

### Cenário 4: Registro de Transferência para a Mesma Conta (Bloqueio)
* **Dado que** o usuário está autenticado e possui a conta ativa "Nubank" cadastrada
* **Quando** ele tenta registrar uma transferência informando "Nubank" tanto como conta de origem quanto como conta de destino
* **Então** o sistema deve rejeitar a operação informando que as contas de origem e destino devem ser obrigatoriamente diferentes.

### Cenário 5: Registro com Valor Inválido (Regra de Valor Monetário)
* **Dado que** o usuário deseja registrar uma saída financeira de uma conta ativa
* **Quando** ele tenta salvar informando um valor negativo (`-150.00`) ou nulo (`0.00`)
* **Então** o sistema deve apresentar um erro de validação impedindo a gravação do registro.

### Cenário 6: Registro em Conta Inativa (Bloqueio)
* **Dado que** a conta "Poupança Antiga" está com status `'inactive'` no banco de dados
* **Quando** o usuário tenta cadastrar uma nova entrada financeira nela
* **Então** o sistema deve rejeitar o cadastro informando que lançamentos não são permitidos em contas inativas.

---

## 3. Módulo de Compromissos Financeiros

### Cenário 7: Identificação Automática de Atraso
* **Dado que** existe um compromisso com status persistido `'pending'`, data de vencimento em `15/07/2026` e hoje é `19/07/2026` (timezone `America/Fortaleza`)
* **Quando** o usuário visualiza o painel de compromissos
* **Então** o sistema deve rotular o compromisso como **Atrasado** e exibir de forma clara que o atraso é de exactamente **4 dias**.

### Cenário 8: Pagamento de Compromisso com Valor Diferente (Quitação)
* **Dado que** o usuário possui um compromisso a pagar no valor previsto de `R$ 100,00`
* **Quando** o usuário clica em pagar e informa que o valor efetivamente realizado foi de `R$ 105,00` devido a juros, selecionando a conta "Carteira"
* **Então** o sistema deve:
  1. Alterar o status do compromisso para `'paid'`.
  2. Preservar o valor previsto de `R$ 100,00` no compromisso.
  3. Registrar o valor realizado de `R$ 105,00` no compromisso.
  4. Gerar automaticamente uma movimentação de saída de `R$ 105,00` na conta "Carteira" vinculada ao compromisso.

---

## 4. Módulo de Reservas e Projetos

### Cenário 9: Depósito de Reserva com Saldo Livre Insuficiente
* **Dado que** a conta "Banco Inter" possui um Saldo Nominal de `R$ 1000,00` e já possui `R$ 800,00` alocados em outras metas (Saldo Livre = `R$ 200,00`)
* **Quando** o usuário tenta realizar um novo depósito na reserva "Viagem" no valor de `R$ 300,00` vinculando à conta "Banco Inter"
* **Então** o sistema deve bloquear o depósito informando que o saldo livre da conta de origem é insuficiente para esta operação.

### Cenário 10: Retirada de Valor Superior ao Reservado na Conta
* **Dado que** a reserva "Troca de Moto" possui um total acumulado de `R$ 1500,00` (sendo `R$ 1000,00` alocados na conta "Nubank" e `R$ 500,00` na conta "Caixa")
* **Quando** o usuário tenta resgatar/retirar `R$ 1200,00` da reserva apontando a devolução para a conta "Nubank"
* **Então** o sistema deve bloquear a operação informando que o valor reservado especificamente na conta "Nubank" é de no máximo `R$ 1000,00`.

---

## 5. Interface, Usabilidade e Acessibilidade (Diretrizes de Homologação)

### Cenário 11: Responsividade e Toque Mobile-First
* **Dado que** o usuário acessa o sistema a partir de um dispositivo móvel com resolução de `360px` de largura
* **Quando** ele navega pelos fluxos principais de visualização de saldos e registro de transações
* **Então** o layout deve se adaptar verticalmente de forma que:
  1. Todos os formulários e tabelas caibam perfeitamente na largura de tela, sem exigir rolagem horizontal.
  2. Todos os elementos interativos possuam uma área mínima de clique/toque de **44px x 44px**.
  3. Todas as ações essenciais funcionem perfeitamente por toque, sem dependência de eventos de "passar o mouse" (`hover`).

### Cenário 12: Identificação de Campos Obrigatórios e Mensagens de Validação
* **Dado que** o usuário está na tela de cadastro de uma conta financeira
* **Quando** ele tenta salvar a conta mantendo campos obrigatórios vazios ou inválidos
* **Então** o sistema deve:
  1. Destacar visualmente quais campos são obrigatórios.
  2. Exibir as mensagens amigáveis de erro de validação diretamente abaixo ou ao lado de cada campo com inconsistência.
  3. Manter preservados os dados válidos que já haviam sido digitados nos demais campos.

### Cenário 13: Confirmação de Sucesso e Bloqueio de Cliques Repetidos (Anti-Duplicação)
* **Dado que** o usuário preencheu corretamente o formulário para registrar uma saída financeira de `R$ 50,00`
* **Quando** ele clica no botão "Salvar" uma ou mais vezes consecutivas em curto intervalo de tempo
* **Então** o sistema deve:
  1. Desabilitar o botão de submissão imediatamente após o primeiro clique, apresentando um estado visual de processamento (ex: spinner).
  2. Enviar apenas uma única requisição ao backend, garantindo que não ocorram registros duplicados no banco de dados.
  3. Exibir uma mensagem clara de sucesso (ex: Toast flutuante) confirmando que o lançamento foi salvo e redirecionando ou atualizando a listagem.

### Cenário 14: Independência de Cores na Apresentação de Informações Críticas
* **Dado que** um usuário com restrição de visão cromática (daltonismo) está visualizando a listagem de compromissos pendentes e atrasados
* **Quando** ele analisa os registros da tela
* **Então** as informações de status não devem depender puramente de cores (verde, amarelo, vermelho), devendo exibir rótulos textuais claros e explícitos por extenso (ex: "Atrasado há 9 dias", "Vence Hoje", "Pago") garantindo a perfeita compreensão do estado financeiro de cada compromisso.

### Cenário 15: Estados Vazios Orientativos (Empty States)
* **Dado que** o usuário acaba de realizar o primeiro uso do sistema e sua família não possui nenhuma conta cadastrada
* **Quando** ele acessa o painel de "Contas" ou a "Visão Geral"
* **Então** o sistema não deve exibir uma tela em branco ou tabelas vazias sem explicação, devendo apresentar uma mensagem orientativa simples explicando que ainda não há contas criadas e disponibilizar um botão de ação rápida em destaque (ex: "Cadastrar Minha Primeira Conta") para guiar o próximo passo.

### Cenário 16: Registro Rápido e Descomplicado
* **Dado que** o usuário precisa registrar rapidamente um gasto rotineiro no celular
* **Quando** ele aciona o formulário de "Novo Lançamento"
* **Então** o sistema deve exigir no formulário inicial apenas os campos essenciais: Tipo (Entrada/Saída), Descrição, Valor, Data, Conta de Origem/Destino e Responsável, ocultando campos avançados ou opcionais (como categoria, contato e observações) sob uma seção expansível ("Mais detalhes") para viabilizar um lançamento em poucos segundos.

### Cenário 17: Login em Celular e Desktop (Flexibilidade de Acesso)
* **Dado que** o usuário possui as credenciais de login corretas
* **Quando** o usuário insere os dados de login através de um celular ou de um computador desktop
* **Então** o sistema deve realizar o login com a mesma rapidez e segurança, garantindo que o formulário de login se adapte ao tamanho da tela e não exija rolagem horizontal em nenhum dos dispositivos.

### Cenário 18: Listagem de Compromissos por Período
* **Dado que** o usuário está na tela de "Compromissos" para visualizar o planejamento financeiro
* **Quando** o usuário seleciona um período de tempo (ex: dia, semana, mês ou período personalizado)
* **Então** o sistema deve filtrar e exibir os compromissos em uma lista linear organizada cronologicamente pelas datas de vencimento, mostrando com clareza o status e os dias em atraso caso estejam vencidos.

