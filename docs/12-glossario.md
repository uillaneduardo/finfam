# Glossário de Termos - FinFam

Este glossário define de forma precisa a terminologia financeira e técnica utilizada em todo o ecossistema do **FinFam**, alinhando o entendimento conceitual entre desenvolvedores, designers, redatores técnicos e usuários finais.

---

## 1. Conceitos de Usuários e Perfis

* **Família (Inquilino / Tenant):**
  * O contexto organizativo mais alto no sistema. Representa o núcleo familiar ou grupo compartilhado que possui isolamento estrito de dados em relação a outras famílias da mesma plataforma.
* **Usuário:**
  * Qualquer indivíduo cadastrado na plataforma que possui credenciais de acesso válidas e pertence a uma família.
* **Administrador (`admin`):**
  * Tipo de usuário que possui total autonomia operacional dentro do contexto familiar, incluindo a capacidade de cadastrar novos membros familiares, desativar usuários e alterar o nome de exibição da família.
* **Membro (`member`):**
  * Usuário padrão da família. Possui todas as permissões para ler, registrar e alterar as transações financeiras compartilhadas, compromissos, contatos e projetos, mas não pode gerenciar usuários ou configurações administrativas da família.
* **Usuário Autenticado:**
  * O usuário que efetuou login com sucesso e possui uma sessão ativa válida transmitida via cookies seguros em cada requisição.
* **Responsável:**
  * O membro da família nominalmente designado como o encarregado de efetuar o pagamento de uma conta, receber uma receita ou gerenciar as metas de um projeto financeiro.
* **Usuário Criador (ou Usuário de Alteração):**
  * Marcação automática de auditoria que identifica exatamente qual usuário cadastrou ou modificou determinado registro no sistema.

---

## 2. Conceitos Contábeis e de Movimentação

* **Conta Financeira:**
  * Um repositório (virtual, físico ou eletrônico) onde o dinheiro é custodiado. Exemplos: Conta Corrente bancária, Poupança, Carteira Física de Dinheiro em Espécie, Caixinha em Banco Digital.
* **Movimentação (ou Transação):**
  * Registro de um fato financeiro já consumado que altera o saldo nominal de uma ou mais contas. Pode ser uma Entrada, Saída ou Transferência.
* **Entrada (ou Receita):**
  * Operação financeira consolidada que representa o aporte de recursos em uma conta de destino (ex: salário, reembolso, vendas), aumentando o patrimônio total da família.
* **Saída (ou Despesa):**
  * Operação financeira consolidada que representa a retirada de recursos de uma conta de origem (ex: pagamento de luz, compra no supermercado, taxas), reduzindo o patrimônio total da família.
* **Transferência:**
  * Registro de migração de saldo entre duas contas da mesma família. Uma transferência diminui o saldo na conta de origem e aumenta na de destino de forma simultânea e em igual valor. Não altera o patrimônio líquido total da família.
* **Contato Financeiro:**
  * Entidade externa à família (pessoa, concessionária de serviços públicos, banco, comércio) que figura como a origem ou destino final de pagamentos e recebimentos.
* **Categoria:**
  * Classificação opcional (módulos como "Alimentação", "Transporte") para facilitar a organização visual e filtros rápidos do fluxo de caixa.

---

## 3. Conceitos de Compromissos e Agendamentos

* **Compromisso:**
  * Uma previsão de fluxo financeiro futuro (a pagar ou a receber) que possui data de vencimento fixa e valor estimado.
* **Compromisso a Pagar:**
  * Uma obrigação futura de saída de caixa (ex: fatura de energia, aluguel, condomínio).
* **Compromisso a Receber:**
  * Um direito futuro de entrada de caixa (ex: salário estimado, prestação de serviço técnico, aluguel de imóvel próprio).
* **Atrasado (Estado Calculado):**
  * O estado em que se encontra um compromisso quando sua data de vencimento é menor que a data atual e seu status ainda não foi alterado para concluído (`paid` ou `received`).
* **Valor Previsto:**
  * O valor originalmente estimado para um compromisso (ex: valor impresso no boleto antes do vencimento).
* **Valor Realizado:**
  * O valor monetário que foi efetivamente transacionado no momento da quitação real do compromisso (pode diferir do previsto devido a descontos ou incidência de juros).

---

## 4. Conceitos de Metas e Poupança

* **Reserva:**
  * Meta financeira mútua voltada à segurança (ex: reserva de emergência familiar, caixa de contingência) que não possui necessariamente um prazo rígido para expirar.
* **Projeto:**
  * Meta financeira voltada à aquisição de bens ou metas de desenvolvimento (ex: comprar uma geladeira, reformar a cozinha, férias em família) que geralmente possui valor objetivo e prazo definidos.
* **Operação de Reserva:**
  * Registro histórico mandatório para toda e qualquer movimentação de fundos atrelada a uma reserva ou projeto (depósitos, retiradas ou transferências).
* **Saldo da Conta (Saldo Nominal):**
  * O saldo contábil bruto total existente em uma conta específica.
* **Saldo Total (da Família):**
  * O valor nominal consolidado da soma de todas as contas ativas de uma família.
* **Saldo Reservado:**
  * O somatório total de dinheiro das contas que foi conceitualmente "trancado" em metas, caixinhas, reservas ou projetos da família.
* **Saldo Livre:**
  * O dinheiro disponível para gastos do dia a dia. É calculado subtraindo o Saldo Reservado do Saldo Nominal (pode ser visto tanto de forma individual por conta quanto agregada para toda a família).
$$\text{Saldo Livre} = \text{Saldo Total} - \text{Saldo Reservado}$$
