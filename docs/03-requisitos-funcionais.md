# Requisitos Funcionais (RF) - FinFam

Este documento lista e detalha os Requisitos Funcionais planejados para o MVP do **FinFam**. Cada requisito possui um identificador único para fins de rastreabilidade e critérios de aceitação.

---

## 1. Módulo de Família e Usuários

### RF-001 — Criação de Família (Primeiro Uso)
* **Descrição:** O sistema deve permitir que um visitante não cadastrado crie uma nova família e o primeiro usuário administrador em um único fluxo unificado.
* **Critérios de Entrada:** Nome da Família, Nome Completo do Administrador, Nome de Usuário (globalmente único), Senha e Confirmação de Senha.
* **Comportamento:** O sistema deve persistir em uma única transação atômica a criação da família, do usuário administrador, a associação com o papel `admin` e gerar a sessão ativa. Se qualquer validação falhar, nenhuma informação deve ser gravada no banco de dados.

### RF-002 — Autenticação de Usuários
* **Descrição:** O sistema deve permitir que usuários cadastrados façam login fornecendo apenas nome de usuário e senha.
* **Comportamento:** O sistema valida as credenciais contra a senha encriptada em hash e estabelece a sessão segura em cookie HTTP-Only. Mensagens de erro de login devem ser genéricas para evitar varredura de usuários válidos.

### RF-003 — Encerramento de Sessão (Logout)
* **Descrição:** O sistema deve permitir que o usuário autenticado encerre sua sessão a qualquer momento.
* **Comportamento:** Ao solicitar o logout, o backend deve invalidar a sessão atual e o frontend deve redirecionar o usuário para a tela de login.

### RF-004 — Criação Manual de Membros
* **Descrição:** O usuário administrador (`admin`) deve ser capaz de cadastrar novos membros para a sua própria família.
* **Critérios de Entrada:** Nome Completo, Nome de Usuário (globalmente único), Senha Inicial. O papel deve ser automaticamente definido como `member`.
* **Restrição:** O membro criado pertence exclusivamente à mesma família do administrador que o cadastrou.

### RF-005 — Desativação de Membros
* **Descrição:** O usuário administrador (`admin`) deve ser capaz de desativar membros da sua família.
* **Comportamento:** O usuário desativado não deve mais conseguir realizar login na aplicação. Seu histórico de registros e autoria deve ser preservado.

### RF-006 — Exibição de Perfil e Contexto
* **Descrição:** O sistema deve exibir na barra superior, perfil ou configurações, o nome da família à qual o usuário pertence, o nome do próprio usuário e o seu respectivo papel (`admin` ou `member`).

---

## 2. Módulo de Contas Financeiras

### RF-007 — Cadastro de Contas
* **Descrição:** O usuário (membro ou administrador) deve poder cadastrar contas financeiras que representem locais físicos ou virtuais de guarda de valores.
* **Critérios de Entrada:** Nome da conta, instituição/banco, tipo da conta, titular, identificação opcional, chave Pix opcional, saldo inicial e observações.
* **Associação:** O sistema deve associar automaticamente a conta à família do usuário autenticado e registrar o usuário criador.

### RF-008 — Inativação de Contas
* **Descrição:** O sistema deve permitir a inativação de uma conta para evitar novos lançamentos nela.
* **Restrição:** Contas com saldo diferente de zero ou com reservas associadas ativas podem ser inativadas, mas o sistema deve emitir um aviso informativo. Não deve ocorrer exclusão física da conta para preservar o histórico de movimentações.

---

## 3. Módulo de Movimentações Financeiras

### RF-009 — Registro de Entradas (Receitas)
* **Descrição:** O sistema deve permitir o registro de entradas financeiras para uma conta ativa da família.
* **Comportamento:** Aumenta o saldo da conta de destino selecionada. O valor deve ser estritamente positivo e maior que zero.

### RF-010 — Registro de Saídas (Despesas)
* **Descrição:** O sistema deve permitir o registro de saídas financeiras de uma conta ativa da família.
* **Comportamento:** Reduz o saldo da conta de origem selecionada. O valor deve ser estritamente positivo e maior que zero.

### RF-011 — Registro de Transferências
* **Descrição:** O sistema deve permitir o registro de transferências de saldo entre duas contas ativas da mesma família.
* **Comportamento:** Deduz o saldo da conta de origem e incrementa na conta de destino em uma única transação atômica.
* **Restrição:** A conta de origem e destino devem ser diferentes. A transferência não altera o saldo total da família nem conta como receita/despesa.

---

## 4. Módulo de Contatos e Categorias

### RF-012 — Cadastro de Contatos Financeiros
* **Descrição:** O sistema deve permitir o cadastro de contatos (pessoas ou empresas) para vínculo em movimentações e compromissos.
* **Comportamento:** O contato deve possuir nome, tipo (pessoa, empresa, banco, etc.), telefone opcional, documento opcional, chave Pix opcional e status.

### RF-013 — Cadastro Opcional de Categorias
* **Descrição:** O sistema deve permitir o cadastro de categorias flexíveis para a família.
* **Comportamento:** Categorias servem para organizar as saídas/entradas, mas o sistema não deve obrigar a vinculação de categorias ao criar movimentações ou compromissos.

---

## 5. Módulo de Compromissos Financeiros

### RF-014 — Cadastro de Compromissos (A Pagar/Receber)
* **Descrição:** O sistema deve permitir o cadastro de compromissos futuros.
* **Critérios de Entrada:** Tipo (a pagar ou a receber), descrição, valor previsto, data de vencimento, contato relacionado, responsável técnico, conta prevista, categoria opcional, observações.

### RF-015 — Cálculo Dinâmico de Atraso
* **Descrição:** O sistema deve calcular dinamicamente se um compromisso pendente está atrasado e há quantos dias, considerando a data atual oficial no fuso horário `America/Fortaleza`.

### RF-016 — Quitação de Compromisso (Pagamento/Recebimento)
* **Descrição:** O sistema deve permitir marcar um compromisso como concluído (pago ou recebido).
* **Comportamento:** Ao quitar, o sistema solicita o valor efetivo realizado, a data efetiva, a conta financeira real e, em uma única transação de banco:
  1. Cria a movimentação de entrada/saída correspondente;
  2. Altera o status do compromisso para pago/recebido;
  3. Salva o valor efetivo e a data efetiva no compromisso;
  4. Vincula o ID da movimentação criada ao compromisso.

---

## 6. Módulo de Reservas e Projetos

### RF-017 — Cadastro de Reservas e Projetos
* **Descrição:** O sistema deve permitir criar "caixinhas" de metas financeiras compartilhadas.
* **Critérios de Entrada:** Tipo (reserva ou projeto), nome, descrição opcional, valor da meta opcional, prazo opcional, responsável.

### RF-018 — Operações de Reserva (Depósito, Retirada, Transferência)
* **Descrição:** Qualquer alteração no valor acumulado em uma reserva deve ser obrigatoriamente registrada por meio de uma operação detalhada.
* **Depósito:** Associa um valor de uma conta ativa à reserva. Reduz o saldo livre da conta sem duplicar ou mexer no saldo total dela.
* **Retirada:** Desassocia um valor da reserva para a conta. Aumenta o saldo livre da conta.
* **Transferência de Reserva:** Move valores reservados em uma conta para outra conta, gerando paralelamente uma transferência de saldo real e mantendo o saldo da reserva intacto, executado em transação atômica.

---

## 7. Módulo de Consultas, Saldos e Filtros

### RF-019 — Painel de Saldos Integrados
* **Descrição:** O painel principal deve calcular e exibir dinamicamente:
  * O Saldo de cada conta financeira cadastrada.
  * O Saldo Total da Família (soma das contas ativas).
  * O Saldo Reservado (total em projetos/reservas).
  * O Saldo Livre global e por conta (Saldo da Conta - Valores Reservados nela).

### RF-020 — Consultas por Períodos e Filtros Dinâmicos
* **Descrição:** O sistema deve permitir filtrar e pesquisar movimentações e compromissos por período (hoje, semana, mês, personalizado) e por campos opcionais (responsável, contato, conta, categoria).

### RF-021 — Auditoria de Registros
* **Descrição:** O sistema deve guardar automaticamente o usuário criador, a data de criação, o usuário que alterou e a data de atualização de todos os registros significativos do banco de dados para consulta e rastreamento.
