# Diretrizes de Interface, Usabilidade e UX - FinFam

Este documento estabelece as diretrizes básicas de interface do usuário (UI), experiência do usuário (UX), usabilidade e acessibilidade que orientarão a futura implementação do frontend do **FinFam**, assegurando um sistema simples, responsivo, intuitivo e de uso diário extremamente ágil para toda a família.

---

## 1. Filosofia de Interface do Usuário (UI)

A interface do FinFam deve ser pautada pelo minimalismo utilitário e pela clareza de dados. O design deve afastar elementos puramente cosméticos e focar na redução da carga cognitiva, permitindo que qualquer membro da família — independente do nível de familiaridade com tecnologia — consiga usar o sistema com facilidade.

### Princípios Visuais Básicos
* **Simplicidade e Clareza:** Menos é mais. As telas devem ter caminhos de fluxo lineares. Dados numéricos importantes devem ter destaque visual hierárquico inequívoco.
* **Consistência Visual:** Cores, tipografia, bordas, sombras e padrões de layout devem ser consistentes em todos os módulos. Um formulário de criação de conta deve seguir a mesma lógica de comportamento de um formulário de transação.
* **Espaçamento Generoso:** Utilizar áreas de respiro adequadas (margens e paddings confortáveis) para agrupar logicamente informações e evitar a sensação de telas sobrecarregadas ("poluição visual").
* **Uso Moderado de Cores:** Cores devem servir para categorizar, dar feedback ou indicar alertas, nunca como adorno excessivo. O contraste deve ser prioritário.

---

## 2. Princípios de Usabilidade (UX)

A arquitetura de navegação e os fluxos de tarefas devem ser otimizados para eficiência. As ações principais devem ser imediatas.

### Práticas Recomendadas (O que priorizar)
* **Poucos Passos:** Registrar uma entrada, saída ou transferência deve exigir o mínimo de cliques e telas possível.
* **Formulários Curtos e sem Rolagem Horizontal:** Solicitar apenas os campos estritamente obrigatórios por padrão. Campos opcionais ou avançados devem ser recolhidos ou exibidos sob demanda (ex: "Adicionar detalhes opcionais"). Os formulários devem caber totalmente na tela do dispositivo, eliminando qualquer necessidade de rolagem horizontal.
* **Ações Identificáveis:** Botões de ação primária (como "Registrar Entrada", "Confirmar Pagamento") devem ter contraste visual destacado (botões cheios de cor sólida) em relação às ações secundárias (botões vazios ou links simples).
* **Navegação Previsível:** A navegação deve ser direta e constante. O usuário deve saber exatamente onde está por meio de títulos de página claros e indicadores de menu ativo.
* **Prevenção de Erros de Entrada:** Máscaras de digitação para campos monetários (ex: formatar automaticamente `12345` como `R$ 123,45` enquanto o usuário digita) e seletores de data amigáveis em celulares evitam falhas de digitação.
* **Prevenção de Duplicidades e Bloqueio de Envio:** Ao enviar um formulário, o botão de submissão deve ser desabilitado (bloqueado) imediatamente e apresentar um estado de carregamento, impedindo que cliques repetidos ou rápidos gerem envios duplicados no backend.
* **Ausência de Dependência de Hover:** Como o foco do design é mobile-first, toda interação crítica e transmissão de informação importante deve funcionar por toque direto, sem depender de interações de pairar (hover), que não existem ou são inconsistentes em dispositivos móveis.
* **Prevenção de Exclusões Acidentais:** Toda ação destrutiva (como desativar uma conta, desativar um usuário ou excluir uma movimentação) deve exigir uma confirmação adicional simples, explicando o impacto da ação de maneira compreensível.

### Práticas Proibidas (O que evitar)
* **Excesso de Telas e Menos Níveis:** Evitar a quebra de um fluxo simples em múltiplas telas desnecessárias. Navegações ou menus com mais de dois níveis são proibidos.
* **Janelas Modais Encadeadas:** Nunca abrir uma janela flutuante (modal) por cima de outra modal já aberta.
* **Ícones sem Descrição Semântica:** Ícones solitários não devem ser usados para ações críticas. Se houver um ícone (ex: um símbolo de engrenagem para configurações), ele deve estar acompanhado de texto legível ou, no mínimo, uma tag de acessibilidade (`aria-label`).
* **Termos Contábeis Complexos:** Utilizar linguagem cotidiana ("Entrada", "Saída", "Gasto", "A Pagar", "A Receber") em vez de termos técnicos da contabilidade ("Débito", "Crédito", "Ativo Circulante", "Passivo Exigível").
* **Exposição de Detalhes Técnicos:** Erros internos de sistema ou mensagens de exceção brutas do banco de dados (ex: `QueryError: Connect timeout on port 3306`) nunca devem ser exibidos ao usuário final. Substituí-los por mensagens amigáveis ("Não foi possível conectar ao servidor. Por favor, tente novamente em instantes.").

---

## 3. Compatibilidade Multidispositivo e Abordagem Mobile-First

O FinFam é uma aplicação de uso diário e dinâmico, frequentemente acessada via smartphone no momento em que a despesa ocorre (ex: na fila do supermercado). Por isso, o design deve adotar uma abordagem **Mobile-First**.

### Diretrizes Mobile-First
1. **Estrutura de Layout Base:** A tela do celular é a base de desenvolvimento. O fluxo de registro financeiro deve caber perfeitamente na visualização de tela sem a necessidade de rolagem horizontal.
2. **Área de Toque Confortável:** Todos os elementos interativos (botões, links, abas, inputs de checkbox) em dispositivos móveis devem possuir uma área mínima de clique/toque de **44px x 44px**, garantindo precisão ao toque de dedos.
3. **Legibilidade de Texto:** Tamanhos de fonte devem permanecer confortáveis para leitura (mínimo de `14px` para textos de apoio e `16px` para campos de entrada) sem exigir que o usuário realize gestos de zoom.
4. **Inputs Otimizados:** Utilizar tipos corretos de inputs HTML (ex: `type="number"` ou `inputmode="decimal"` para valores, e seletores nativos de data em celulares) para invocar o teclado virtual apropriado no smartphone.
5. **Adaptação Progressiva (Desktop/Notebooks):** Conforme o espaço de tela aumenta, o layout deve se expandir lateralmente, dividindo o espaço em colunas (layout de grid ou bento) para aproveitar a largura adicional, sem esticar elementos de formulário de ponta a ponta de forma desproporcional.

---

## 4. Navegação Conceitual do Sistema

A navegação do sistema será centralizada nas principais visões operacionais da família. A estrutura deve se manter limpa e com no máximo dois níveis hierárquicos.

### Módulos Principais
1. **Visão Geral (Dashboard):** Painel centralizador que exibe os saldos consolidados da família (nominal, reservado e livre) e alertas de compromissos urgentes ou atrasados.
2. **Movimentações:** Histórico detalhado de transações (entradas, saídas e transferências) com filtros por período, conta e responsável.
3. **Compromissos:** Agenda de contas futuras a pagar ou receber, organizadas como uma **lista cronológica de compromissos** (com filtros por dia, semana, mês, atrasados e período personalizado). Esta lista linear é o padrão e requisito prioritário para o MVP (enquanto o calendário visual interativo tradicional de formato mensal é tratado como melhoria futura pós-MVP).
4. **Contas:** Lista de contas financeiras ativas com visualização rápida de saldos nominais e saldos livres calculados.
5. **Reservas e Projetos (Caixinhas):** Visualizador de metas financeiras com barra de progresso (valor acumulado vs. meta total) e indicação de onde o dinheiro está guardado.
6. **Configurações:** Gerenciamento do perfil do usuário, alteração de senha e cadastro de membros da família ou categorias (disponível apenas para papel de `admin`).

*Nota: As informações do perfil ativo e o nome da família devem aparecer de forma discreta no cabeçalho ou menu lateral, liberando espaço central para os dados financeiros.*

---

## 5. Fluxo de Registro Rápido

Para incentivar o hábito de registro imediato de despesas, o sistema deve fornecer atalhos de "Ação Rápida" (como botões flutuantes de atalho no celular) para iniciar o fluxo de novos lançamentos.

### Campos Obrigatórios Mínimos
O formulário de registro rápido para uma **entrada** ou **saída** simples deve conter apenas:
* **Tipo:** Indicador visual claro de entrada (`income`) ou saída (`expense`).
* **Descrição:** Campo de texto livre curto (ex: "Supermercado do Mês").
* **Valor:** Campo numérico formatado.
* **Data:** Campo de data (pré-preenchido por padrão com a data atual).
* **Conta de Origem/Destino:** Menu de seleção de conta ativa.
* **Responsável:** Menu de seleção de membro da família (pré-selecionado com o usuário logado).

Campos como *Categoria*, *Contato* (Parceiro Comercial) e *Observações/Notas adicionais* devem ser ocultados em uma seção colapsável ("Mais informações") para manter o formulário principal curto e direto.

---

## 6. Apresentação Clara e Contextual das Informações

### Situações de Compromissos
Os compromissos devem ser destacados visualmente por cores sutis e rótulos explícitos de status:
* **Pendente:** Rótulo azul ou cinza. Prazo dentro da data limite.
* **Vence Hoje:** Rótulo amarelo ou laranja de atenção moderada.
* **Atrasado:** Rótulo vermelho de alta visibilidade. Deve obrigatoriamente exibir a quantidade de dias úteis/corridos vencidos (ex: *"Atrasado há 9 dias"*).
* **Pago / Recebido:** Rótulo verde indicando quitação. Exibe o link para a transação financeira real gerada no histórico.
* **Cancelado:** Rótulo cinza e texto tachado, indicando compromisso desconsiderado.

### Visualização de Reservas e Caixinhas
Cada projeto ou reserva deve apresentar:
* **Valor Reservado Atual:** Valor bruto guardado na caixinha.
* **Valor de Meta:** Valor total desejado.
* **Progresso Percentual:** Indicador em barra de progresso visual (ex: 45%).
* **Valor Restante:** Quanto falta economizar para atingir o objetivo.
* **Vínculo Físico:** Qual conta financeira detém aquele saldo reservado e quem é o titular nominal da conta.

---

## 7. Feedbacks das Operações e Estados Especiais

### Feedbacks de Processamento (Loading e Toasts)
* **Confirmação Assíncrona:** Nenhuma operação financeira (como salvar despesa) deve parecer concluída antes que o backend retorne o status `200 OK`. Durante o envio, os campos do formulário e o botão de salvar devem ficar em estado de carregamento visível (ex: spinner de carregamento).
* **Mensagens Flutuantes (Toasts):** Exibir alertas temporários no canto da tela (ou no topo no celular) confirmando o sucesso de operações comuns (ex: *"Transação cadastrada com sucesso!"* ou *"Compromisso quitado!"*).

### Estados Vazios (Empty States)
Telas sem registros nunca devem estar em branco. Devem conter ilustrações minimalistas, explicar a ausência de dados de forma simples e orientar o usuário sobre o próximo passo imediato:
* **Nenhuma Conta Cadastrada:** *"Para começar a controlar o dinheiro da sua família, cadastre sua primeira conta bancária ou carteira física!"* acompanhado de um botão de *"Cadastrar Conta"*.
* **Nenhuma Movimentação:** *"Nenhum lançamento registrado neste período. Que tal registrar uma entrada ou saída agora?"* acompanhado de um botão de *"Registrar Movimentação"*.
* **Nenhum Compromisso:** *"Tudo em dia! Nenhuma conta a pagar ou receber registrada para as próximas datas."*

### Estados de Erro e Conexão
* Se o sistema perder conexão temporariamente com a internet, o frontend deve exibir um banner discreto na tela avisando sobre a ausência de sinal ("Modo Offline - Reconectando...").
* Erros de validação (ex: campo valor vazio) devem ser exibidos **diretamente abaixo do campo correspondente** na cor vermelha, facilitando a identificação rápida e o ajuste pelo usuário.

---

## 8. Diretrizes de Acessibilidade Básica

A interface deve ser acessível e utilizável por todos, seguindo os padrões mínimos de acessibilidade na web:
* **Contraste de Cores:** Manter uma relação de contraste de contraste mínima de **4.5:1** para textos normais em relação ao plano de fundo (de acordo com as diretrizes WCAGAA).
* **Navegação por Teclado:** No desktop, todos os elementos interativos (botões, inputs, abas) devem receber foco visual nítido (outline destacado) ao navegar usando a tecla `Tab`, permitindo o preenchimento de formulários e navegação completa sem o uso do mouse.
* **Independência de Cores:** Situações críticas ou alertas (como atrasos ou despesas) não devem depender apenas de cores (verde/vermelho) para serem compreendidos. Devem estar sempre acompanhados de rótulos de texto explícitos (ex: "Atrasado") ou ícones com descrição semântica alternativa.
* **Leitores de Tela:** Utilizar elementos HTML semânticos nativos (`<button>`, `<main>`, `<nav>`, `<header>`, `<article>`) e fornecer tags `aria-label` apropriadas para leitores de tela em elementos de interação apenas visual.
