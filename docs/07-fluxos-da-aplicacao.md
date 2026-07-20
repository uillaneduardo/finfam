# Fluxos da Aplicação - FinFam

Este documento descreve detalhadamente o passo a passo lógico para cada um dos 27 fluxos de negócio mapeados para o MVP do **FinFam**.

---

## 1. Fluxos de Início de Uso e Autenticação

### 1. Criação de Família
1. O visitante preenche o formulário de primeiro uso com os dados da família.
2. O frontend envia uma requisição `POST /api/auth/register-family`.
3. O backend abre uma **transação de banco de dados**.
4. É inserido um novo registro na tabela `families`, obtendo o `family_id`.
5. Se falhar, realiza rollback.

### 2. Criação do Primeiro Administrador
1. Na mesma transação (iniciada no Fluxo 1), o backend realiza o hash seguro da senha fornecida.
2. Insere um novo usuário na tabela `users` vinculado ao `family_id` recém-gerado, com o campo `role = 'admin'` e `status = 'active'`.
3. Se falhar (ex: nome de usuário duplicado globalmente), realiza rollback e retorna erro.

### 3. Criação da Sessão Inicial
1. Na mesma transação (Fluxo 1 e 2), após as inserções de sucesso, o banco de dados confirma o commit.
2. O backend gera uma assinatura de sessão segura em um cookie criptografado contendo o ID do usuário, ID da família e o papel (`admin`).
3. Retorna status `201 Created` para o frontend.
4. O frontend direciona o usuário diretamente para a página principal da aplicação.

### 4. Login
1. O usuário preenche o nome de usuário (`username`) e senha na tela de login.
2. O frontend envia `POST /api/auth/login`.
3. O backend busca na tabela `users` pelo `username` exato.
4. Se o usuário não existir, ou estiver inativo (`status = 'inactive'`), o backend retorna erro genérico de credenciais inválidas (sem revelar o motivo exato por segurança).
5. Se ativo, valida o hash da senha enviada contra o hash armazenado.
6. Se inválido, incrementa contador de tentativas malsucedidas e retorna erro genérico.
7. Se válido, gera o cookie de sessão seguro (`HttpOnly`, `SameSite`, `Secure`) e zera o contador de falhas.

### 5. Logout
1. O usuário clica no botão "Sair" do menu de navegação.
2. O frontend envia `POST /api/auth/logout`.
3. O backend limpa o cookie de sessão no navegador do usuário e invalida o token no servidor, se aplicável.
4. O frontend apaga estados locais e redireciona para a página `/login`.

---

## 2. Fluxos de Gestão de Membros

### 6. Criação de Membro
1. O administrador acessa a tela de gerenciamento familiar e clica em "Adicionar Membro".
2. Preenche o Nome Completo, `username` único e a Senha Inicial.
3. O frontend envia `POST /api/users` contendo o payload e a sessão ativa do administrador.
4. O backend valida se o usuário autenticado na sessão possui a regra `admin`.
5. Valida se o `username` sugerido já existe globalmente.
6. Cria o novo usuário vinculando-o obrigatoriamente ao mesmo `family_id` do administrador da sessão, com `role = 'member'`.
7. O membro novo é listado na tabela da família.

### 7. Desativação de Membro
1. O administrador localiza o membro ativo na lista familiar e clica em "Desativar".
2. O frontend envia `PATCH /api/users/:id/deactivate`.
3. O backend valida se o requisitante é `admin` e se o membro alvo pertence ao mesmo `family_id` da sessão (prevenindo travessia de dados).
4. O backend impede que um administrador desative a si próprio.
5. Altera o status do usuário alvo para `'inactive'` na tabela `users`.
6. Se o usuário desativado tentar acessar a API, sua sessão ativa é rejeitada.

---

## 3. Fluxos de Cadastros e Contas

### 8. Cadastro de Conta
1. O usuário acessa a aba "Contas" e clica em "Nova Conta".
2. Insere os dados como nome da conta, banco, tipo, titular, saldo inicial.
3. Envia `POST /api/accounts`.
4. O backend intercepta o payload, injeta o `family_id` obtido diretamente da sessão segura e define o `created_by_id`.
5. Grava os dados na tabela `accounts` e retorna sucesso.

### 9. Registro de Entrada (Receita)
1. O usuário preenche a tela de nova movimentação, selecionando o tipo "Entrada".
2. Informa descrição, valor positivo, conta de destino, data da entrada e responsável técnico.
3. Envia `POST /api/transactions`.
4. O backend valida que `source_account_id` está nulo e `destination_account_id` aponta para uma conta ativa pertencente à família da sessão.
5. Insere a movimentação e atualiza o saldo livre da conta de destino.

### 10. Registro de Saída (Despesa)
1. O usuário abre o formulário de "Saída", informa a descrição, valor positivo, conta de origem ativa, data e responsável.
2. Envia `POST /api/transactions`.
3. O backend valida que a conta de origem pertence à mesma família e está ativa.
4. Insere a transação de despesa e deduz o saldo correspondente.

### 11. Registro de Transferência
1. O usuário escolhe a opção "Transferência entre contas".
2. Seleciona a conta de origem, conta de destino (devem ser estritamente diferentes), valor positivo e data.
3. Envia `POST /api/transactions`.
4. O backend abre uma **transação de banco de dados**.
5. Valida se ambas as contas pertencem à mesma família e estão ativas.
6. Cria o registro de movimentação com o tipo `'transfer'`.
7. Atualiza os saldos das duas contas no banco (subtrai na origem e adiciona no destino).
8. Confirma o commit da transação.

### 12. Cadastro de Contato
1. O usuário preenche o formulário de contatos (nome, tipo, telefone, pix opcional).
2. O sistema envia `POST /api/contacts`.
3. O backend salva o registro atrelando-o ao `family_id` da sessão ativa.

### 13. Cadastro de Categoria
1. O usuário preenche o nome e tipo da categoria.
2. Envia `POST /api/categories`.
3. O backend valida a unicidade do nome dentro daquela mesma família, impedindo duplicatas visuais, e salva.

---

## 4. Fluxos de Compromissos Financeiros

### 14. Cadastro de Compromisso a Pagar
1. O usuário clica em "Agendar Compromisso" e escolhe o tipo "A Pagar".
2. Preenche os campos requeridos (descrição, valor previsto, vencimento, contato, responsável, conta prevista).
3. O backend valida se os IDs de contato, responsável e conta prevista pertencem à mesma família do usuário.
4. Grava o registro com status inicial `'pending'` na tabela `commitments`.

### 15. Cadastro de Compromisso a Receber
1. O usuário agenda um compromisso do tipo "A Receber".
2. Preenche os dados similares ao fluxo 14.
3. O backend valida as permissões familiares de todas as chaves estrangeiras.
4. Grava o registro com status inicial `'pending'`.

### 16. Identificação Automática de Atraso
1. Sempre que as listagens de compromissos são requisitadas, o backend (ou query de busca) compara o campo `due_date` com a data atual (fuso `America/Fortaleza`).
2. Se `due_date < DataAtual` E o status persistido for `'pending'`, o sistema exibe visualmente o rótulo "Atrasado" e calcula: `DiasAtraso = DataAtual - due_date`.

### 17. Pagamento de Compromisso
1. O usuário visualiza um compromisso "a pagar" pendente e clica em "Pagar".
2. O sistema abre um diálogo solicitando confirmação do valor efetivo pago, data real do pagamento e conta financeira de débito utilizada.
3. Envia `POST /api/commitments/:id/pay`.
4. O backend abre uma **transação de banco de dados**.
5. Valida o status pendente do compromisso e o isolamento de família.
6. Cria um registro na tabela `transactions` com tipo `'expense'` utilizando os dados reais preenchidos.
7. Atualiza o compromisso: altera status para `'paid'`, grava a data real, valor realizado e o link para a nova movimentação (`transaction_id`).
8. Realiza commit da transação.

### 18. Recebimento de Compromisso
1. O usuário clica em "Receber" em um compromisso pendente do tipo "a receber".
2. Fornece o valor real recebido, data e conta de crédito.
3. Envia `POST /api/commitments/:id/receive`.
4. O backend abre uma **transação de banco de dados**.
5. Cria o registro em `transactions` com tipo `'income'`.
6. Atualiza o compromisso para `'received'`, guardando a data real, valor realizado e a movimentação associada.
7. Executa o commit.

---

## 5. Fluxos de Reservas e Projetos

### 19. Criação de Reserva
1. O usuário acessa "Reservas", clica em "Nova Reserva".
2. Preenche nome, meta financeira, responsável e prazo.
3. O backend valida os dados, associa o `family_id` da sessão e cria o registro em `projects` com tipo `'reserve'`.

### 20. Criação de Projeto
1. Fluxo idêntico ao 19, mas o campo `type` é persistido como `'project'`. Serve para guiar a separação visual no painel.

### 21. Depósito em Reserva
1. O usuário escolhe uma reserva ativa e clica em "Aportar/Depositar".
2. Seleciona a conta de onde o dinheiro está saindo e informa o valor.
3. O backend abre uma **transação de banco de dados**.
4. Valida se o saldo livre daquela conta suporta o aporte pretendido.
5. Cria um registro na tabela `project_operations` com o tipo `'deposit'`.
6. O saldo livre da conta é atualizado (diminuído na representação lógica de saldo disponível), mas o saldo total nominal da conta bancária permanece idêntico.
7. Conclui a transação.

### 22. Retirada de Reserva
1. O usuário clica em "Resgatar/Retirar" valor de uma reserva ativa.
2. Informa a conta que receberá o valor liberado de volta e o montante desejado.
3. O backend valida se a reserva possui aquele saldo total acumulado disponível para saque na referida conta.
4. Insere uma operação de `'withdrawal'` em `project_operations`.
5. O saldo livre daquela conta aumenta correspondentemente no painel.

### 23. Transferência de Valor Reservado
1. O usuário deseja mover o dinheiro reservado da conta X para a conta Y, sem desmanchar a reserva.
2. O sistema solicita a conta origem, conta destino e valor.
3. O backend abre uma **transação de banco de dados**.
4. Insere uma operação de `'transfer_out'` (vinculada à conta origem) e uma operação de `'transfer_in'` (vinculada à conta destino) na tabela `project_operations`.
5. Simultaneamente, insere um registro na tabela `transactions` do tipo `'transfer'` entre a conta origem e a conta destino para mover o saldo nominal real do banco.
6. Commit da transação é executado.

---

## 6. Fluxos de Consultas e Consolidação

### 24. Consulta de Compromissos por Período
1. O usuário seleciona um atalho (Ex: "Esta Semana") ou preenche um intervalo personalizado de datas.
2. O backend executa uma busca em `commitments` filtrando por `family_id` E onde `due_date` está entre o período solicitado, exibindo os registros ordenados por vencimento.

### 25. Consulta de Saldo Total
1. O painel soma dinamicamente os saldos nominais de todas as contas ativas do `family_id` obtido na sessão: `Total = Sum(initial_balance + movimentacoes)`.

### 26. Consulta de Saldo Reservado
1. O sistema busca todas as operações ativas em `project_operations` do `family_id` e soma: `Reservado = Sum(deposits) - Sum(withdrawals)`.

### 27. Consulta de Saldo Livre
1. O sistema aplica a fórmula matemática diretamente na view/componente consolidado ou via agregação na query SQL: `Saldo Livre = Saldo Total - Saldo Reservado`.
2. Adicionalmente, exibe para cada conta individual o seu saldo disponível real: `Saldo Livre da Conta X = Saldo Nominal da Conta X - Total Ativo Reservado na Conta X`.
3. Os valores são renderizados em tempo real no dashboard familiar.
