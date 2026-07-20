# Visão do Produto - FinFam

O **FinFam** é uma plataforma colaborativa de finanças familiares. Ela foi projetada para ir além do controle individual tradicional de planilhas ou de aplicativos focados em uma única pessoa, oferecendo um espaço compartilhado e seguro onde os membros de um lar organizam seu patrimônio, controlam suas obrigações e constroem suas reservas em conjunto.

---

## 1. O Problema
A gestão financeira na maioria das famílias sofre com os seguintes problemas:
* **Falta de visibilidade centralizada:** O dinheiro está espalhado por múltiplos bancos, contas correntes, investimentos e carteiras físicas de diferentes membros da família. Ninguém sabe ao certo o montante total disponível.
* **Complexidade e ruído na comunicação:** Planilhas compartilhadas tendem a quebrar, tornam-se difíceis de preencher no celular e geram desinteresse de parte dos familiares.
* **Falta de transparência e autoria:** É comum a família esquecer quem realizou determinada compra, quem é o responsável por pagar uma conta de luz ou onde foi parar o dinheiro de uma transferência.
* **Falsa sensação de saldo disponível:** O saldo aparente em uma conta corrente esconde que parte daquele dinheiro já deveria estar guardada para despesas recorrentes (como IPVA/IPTU) ou metas da família (como reforma ou férias), levando a compras por impulso e endividamento.
* **Inexistência de privacidade inter-familiar:** Soluções de mercado cobram taxas altas por membro ou não isolam os dados de modo robusto quando múltiplos grupos utilizam o mesmo servidor de teste ou homologação.

---

## 2. A Solução
O FinFam resolve essas dores através de uma interface web minimalista, intuitiva e estritamente colaborativa:
* **Centralização do Patrimônio:** Todas as contas da família são listadas em um único lugar, atualizadas por qualquer membro autorizado.
* **Autoria Transparente:** Cada entrada, saída, transferência, compromisso ou projeto possui autoria (quem criou e quem atualizou) e responsabilidade (quem deve pagar ou gerenciar) claramente identificadas.
* **Diferenciação Estrita de Saldos:** Introduz o conceito de **Saldo Livre**, subtraindo os valores reservados do saldo total das contas financeiras. O usuário sabe exatamente quanto pode gastar sem prejudicar os planos familiares.
* **Compromissos sob Controle:** Um painel de prazos consolida o que vence no dia, na semana, no mês, ou o que está em atraso, apontando com precisão há quantos dias o compromisso aguarda quitação.
* **Isolamento Absoluto:** Arquitetura multi-tenant robusta que garante que nenhuma informação de uma família vaze ou seja acessada por usuários de outra família, mesmo que compartilhem o mesmo banco de dados MySQL físico.

---

## 3. Público-Alvo
* **Casais e Famílias:** Que desejam manter as contas do lar unificadas, independentemente de possuírem contas bancárias conjuntas ou separadas.
* **Pessoas com Dependes ou Agregados:** Onde o administrador central do lar delega o registro de movimentações cotidianas para filhos ou outros membros, sem perder a governança sobre o cadastro de novos usuários.
* **Famílias que buscam Planejar Metas Concretas:** Que precisam organizar "caixinhas" financeiras para metas específicas sem precisar abrir novas contas bancárias reais para cada objetivo.

---

## 4. Diferenciais de Valor
1. **Foco na Colaboração, não no Controle de Gastos Automatizado:** Em vez de focar em conciliação automatizada complexa que assusta usuários não técnicos, o FinFam aposta no registro consciente e simplificado das informações financeiras.
2. **Humble & Clean UI (Livre de Poluição):** Sem telemetrias irrelevantes, propagandas de empréstimos, gráficos confusos ou falsas inteligências artificiais no MVP. Apenas dados organizados e de fácil consulta.
3. **Isolamento Baseado em Contexto:** A Família não é tratada como um módulo complexo e burocrático de permissões, mas sim como o filtro principal de segurança que envelopa todas as tabelas do sistema.
