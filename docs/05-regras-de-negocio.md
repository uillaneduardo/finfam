# Regras de Negócio (RN) - FinFam

Este documento reúne e detalha de forma estrita as **Regras de Negócio** aplicáveis ao motor financeiro e operacional do **FinFam**, estabelecendo como os cálculos e comportamentos do sistema devem ocorrer sob qualquer circunstância.

---

## 1. Regras de Saldos e Fórmulas

Os saldos na aplicação são calculados de forma dinâmica para garantir a consistência matemática em tempo real. O dinheiro reservado para metas **não deve** ser duplicado nas contas financeiras físicas.

### RN-1.1 — Saldo da Conta
O saldo nominal atualizado de uma conta financeira é representado pela soma algébrica de seu histórico de movimentações a partir do seu saldo inicial:
$$\text{Saldo Nominal} = \text{Saldo Inicial} + \sum(\text{Entradas}) - \sum(\text{Saídas}) + \sum(\text{Transferências Destino}) - \sum(\text{Transferências Origem})$$

### RN-1.2 — Saldo Total da Família
O montante total que a família possui guardado, considerando todas as instituições financeiras. É obtido pela soma simples dos saldos nominais de todas as contas **ativas** vinculadas à família:
$$\text{Saldo Total Família} = \sum(\text{Saldo Nominal de Contas Ativas})$$

### RN-1.3 — Saldo Reservado
A soma de todos os valores atualmente alocados em projetos ou reservas financeiras ativas. Representa dinheiro que possui um propósito específico pré-definido:
$$\text{Saldo Reservado} = \sum(\text{Operações de Depósito em Reservas}) - \sum(\text{Operações de Retirada de Reservas})$$

### RN-1.4 — Saldo Livre da Conta
O valor efetivamente disponível para despesas correntes em uma conta específica, descontados os valores reservados naquela conta:
$$\text{Saldo Livre da Conta} = \text{Saldo Nominal da Conta} - \text{Total Atualmente Reservado naquela Conta}$$

### RN-1.5 — Saldo Livre da Família
O valor consolidado livre para despesas cotidianas da família, subtraídas todas as reservas financeiras:
$$\text{Saldo Livre da Família} = \text{Saldo Total Família} - \text{Saldo Reservado}$$

---

## 2. Regras de Atraso e Estados de Compromissos

Os compromissos agendados sofrem transições de status com base na data do vencimento e ações manuais de quitação.

### RN-2.1 — Estados Calculados Dinamicamente
Um compromisso financeiro possui os seguintes status visuais baseados na data de vencimento e no status persistido em banco:
* **Pago / Recebido:** O status persistido no banco é `pago` ou `recebido`.
* **Cancelado:** O status persistido no banco é `cancelado`.
* **Atrasado:** O status persistido no banco é `pendente` E a data de vencimento é anterior à data atual do sistema.
* **Vence Hoje:** O status persistido no banco é `pendente` E a data de vencimento é exatamente igual à data atual do sistema.
* **Pendente:** O status persistido no banco é `pendente` E a data de vencimento é futura em relação à data atual do sistema.

### RN-2.2 — Cálculo de Dias de Atraso
Se o compromisso estiver no estado **Atrasado**, o sistema calcula dinamicamente a diferença em dias corridos entre a data atual e a data de vencimento:
$$\text{Dias em Atraso} = \text{Data Atual} - \text{Data de Vencimento}$$
*Nota: A data atual do sistema deve obrigatoriamente respeitar o fuso horário `America/Fortaleza` para evitar inconsistências de fuso em requisições feitas no final do dia.*

---

## 3. Quitação de Compromissos

A transição de um compromisso pendente para concluído aciona um gancho de consistência financeira automática.

### RN-3.1 — Liquidação de Compromisso a Pagar
Quando o usuário marca um compromisso do tipo **a pagar** como pago, o sistema deve:
1. Gerar uma movimentação financeira do tipo **saída** (despesa) com a conta e data efetivas informadas.
2. Atribuir o ID desta nova movimentação ao campo `transaction_id` do compromisso.
3. Atualizar o status do compromisso para `pago`, salvando o valor efetivo realizado e a data de pagamento.
4. Todo o bloco de ações acima deve rodar sob uma transação atômica do banco.

### RN-3.2 — Liquidação de Compromisso a Receber
Quando o usuário marca um compromisso do tipo **a receber** como recebido, o sistema deve:
1. Gerar uma movimentação financeira do tipo **entrada** (receita) na conta e data efetivas informadas.
2. Atribuir o ID desta nova movimentação ao campo `transaction_id` do compromisso.
3. Atualizar o status do compromisso para `recebido`, salvando o valor efetivo realizado e a data do recebimento.
4. Todo o bloco de ações acima deve rodar sob uma transação atômica do banco.

---

## 4. Gestão e Movimentação de Reservas

Reservas e projetos não são contas bancárias reais separadas. O dinheiro nelas alocado continua custodiado em contas financeiras cadastradas.

### RN-4.1 — Registro Estrito de Alterações
O valor total acumulado de uma reserva não pode ser alterado por edição direta em banco. Qualquer aporte, saque ou ajuste deve gerar um registro de auditoria na tabela de **operações de reserva**, vinculando o valor à respectiva conta financeira de onde o saldo livre está sendo deduzido ou devolvido.

### RN-4.2 — Validação de Saldo Livre para Depósito
Ao tentar depositar um valor em uma reserva vinculando-o à conta X, o sistema deve garantir que o **Saldo Livre da Conta X** seja igual ou maior que o valor do depósito pretendido:
$$\text{Saldo Livre da Conta X} \geq \text{Valor do Depósito}$$
Se o saldo livre for insuficiente, o depósito deve ser rejeitado para evitar que o saldo livre da conta fique negativo.

---

## 5. Auditoria e Política de Exclusão

Para manter a consistência contábil histórica da família, a exclusão física (hard delete) de registros é evitada em favor de flags de status e desativação.

| Entidade | Ação ao Excluir / Desativar | Justificativa |
| :--- | :--- | :--- |
| **Usuários** | Inativação (`status = 'inactive'`) | Preservar a autoria de registros financeiros e históricos de auditoria. |
| **Contas** | Inativação (`status = 'inactive'`) | Preservar o histórico de movimentações passadas atreladas àquela conta. |
| **Contatos** | Inativação (`status = 'inactive'`) | Preservar histórico em compromissos antigos. |
| **Categorias** | Inativação (`status = 'inactive'`) | Evitar que movimentações antigas fiquem sem referência histórica. |
| **Compromissos** | Cancelamento (`status = 'cancelled'`) | Rastrear compromissos que deixaram de existir sem gerar lançamentos de caixa. |
| **Projetos / Reservas**| Cancelamento (`status = 'cancelled'`) | Evitar perda de histórico de poupança mútua. Valores reservados são liberados de volta para as contas como saldo livre automaticamente se houver saldo ativo na reserva ao cancelar. |
| **Movimentações** | Estorno ou Exclusão Controlada | Movimentações financeiras consolidadas não devem ser apagadas de forma invisível. Caso ocorra exclusão, um log de auditoria física deve ser gerado, restabelecendo o saldo nominal da conta imediatamente. |
| **Operações de Reserva**| Correção por Operação Inversa | Erros em depósitos ou saques de reservas devem ser corrigidos gerando uma operação de sinal oposto com a devida justificativa no campo de observações. |
