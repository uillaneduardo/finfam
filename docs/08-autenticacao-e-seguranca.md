# Autenticação e Segurança - FinFam

Este documento detalha as políticas de segurança, diretrizes de autenticação e proteção de dados que devem ser aplicadas no desenvolvimento do **FinFam** para garantir um ambiente financeiro multi-tenant confiável e robusto.

---

## 1. Política de Senhas e Criptografia

* **Criptografia de Senhas (Hashing):**
  * Senhas **nunca** devem ser persistidas em texto claro ou utilizando algoritmos fracos (como MD5 ou SHA1).
  * O sistema deve utilizar **bcrypt** (com fator de custo mínimo de 12) ou **Argon2id** (configurações recomendadas pela OWASP) para computar o hash da senha no momento do cadastro ou alteração.
* **Validação de Força de Senha:**
  * No cadastro de novos usuários ou primeiro uso, o sistema deve exigir senhas fortes: mínimo de 8 caracteres, contendo pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial.

---

## 2. Gestão de Sessões via Cookie Seguro

* **Armazenamento de Token/Session:**
  * O identificador de sessão ou JSON Web Token (JWT) deve ser transmitido ao cliente e armazenado em um cookie de navegador do tipo **HttpOnly**. Isso impede o acesso ao token via scripts JavaScript executados no cliente, mitigando o risco de ataques do tipo Cross-Site Scripting (XSS).
* **Parâmetros Obrigatórios do Cookie:**
  * `HttpOnly = true`
  * `SameSite = Lax` ou `Strict` (essencial para prevenir ataques de Cross-Site Request Forgery - CSRF).
  * `Secure = true` (exigido e forçado quando o ambiente for de produção ou rodar sob HTTPS).
  * `Max-Age / Expires` correspondente ao tempo de expiração desejado (sugerido: 7 dias para uso familiar prático).

---

## 3. Isolamento Multi-inquilinato Estrito (Multi-tenant)

* **O Princípio do Contexto Seguro:**
  * O `family_id` do usuário autenticado é gravado permanentemente na sessão do backend.
  * O frontend **nunca** deve enviar o `family_id` em payloads de criação ou parâmetros de busca nas requisições. O backend deve, de forma mandatória, injetar o `family_id` obtido da sessão em toda e qualquer query SQL (leituras, escritas, updates, deletes).
* **Verificação de Pertencimento:**
  * Antes de atualizar ou ler qualquer registro individual (Ex: `GET /api/commitments/:id`), o backend deve validar se o registro em questão pertence ao `family_id` da sessão ativa do requisitante. Se não pertencer, a API deve retornar `404 Not Found` ou `403 Forbidden` imediatamente para evitar travessia de dados (IDor - Insecure Direct Object Reference).

---

## 4. Proteção contra Brute Force (Força Bruta)

* **Limitação de Tentativas (Rate Limiting):**
  * Aplicar um limitador de requisições no endpoint de login (`POST /api/auth/login`).
  * Máximo sugerido: 5 tentativas inválidas de login consecutivas por combinação de `username` ou IP de origem em um intervalo de 15 minutos.
* **Bloqueio Temporário:**
  * Se o limite for excedido, o usuário ou o IP de origem deve ser bloqueado de realizar novas tentativas pelo período de 15 minutos.
* **Respostas Genéricas:**
  * Mensagens de falha de login devem ser totalmente neutras: *"Usuário ou senha incorretos."* sem explicitar se o usuário existe ou não na base de dados, prevenindo técnicas de enumeração de contas.

---

## 5. Auditoria de Segurança e Logs

* **Privacidade de Logs:**
  * Os arquivos de log da aplicação (gerados pelo Express/Winston) nunca devem conter informações confidenciais como senhas originais, chaves de criptografia, payloads com hashes de sessão ou segredos do sistema.
* **Auditoria de Registros de Banco de Dados:**
  * As tabelas relevantes devem conter campos automáticos de auditoria básica (`created_by_id`, `created_at`, `updated_by_id`, `updated_at`).

---

## 6. Prevenção de Ataques Comuns

* **SQL Injection:**
  * Utilizar obrigatoriamente ORMs consolidados (como Drizzle ou Sequelize) ou queries parametrizadas (Prepared Statements). Nunca concatenar strings enviadas pelo usuário diretamente em comandos SQL.
* **XSS (Cross-Site Scripting):**
  * Toda entrada exibida no React é higienizada por padrão pelo motor do framework, porém em renderizações personalizadas (como campos de texto rico ou HTML livre, caso existam no futuro), deve-se usar sanitizadores de HTML como `dompurify`.
* **Segurança de Entrada (Validação de Dados):**
  * Utilizar bibliotecas de validação de esquema fortes (como **Zod**) tanto no frontend quanto no backend para validar tipos de dados, tamanhos máximos de string e valores monetários não nulos ou não negativos antes de qualquer processamento lógico.

---

## 7. Preparação Arquitetural para OTP TOTP Futuro

Embora o One-Time Password (OTP) não faça parte do MVP funcional, o módulo de autenticação backend deve ser estruturado de forma a permitir o acoplamento futuro de um segundo fator de autenticação baseado em TOTP (Google Authenticator / Authy):

```text
Fluxo de Login Futuro de Duas Etapas:
[Passo 1: Validar Usuário e Senha]
   |
   +--> Credenciais corretas?
           |
           +--> Sim: Verificar se "otp_enabled" é true no banco para o usuário.
                   |
                   +--> Não: Gera sessão diretamente (Comportamento MVP).
                   |
                   +--> Sim: Retorna token temporário parcial de autenticação ("mfa_pending")
                             e solicita o código OTP do usuário.
                             
[Passo 2: Validar Código OTP]
   |
   +--> Usuário envia código TOTP + token parcial.
   +--> Backend valida código usando segredo armazenado no banco.
   +--> Código correto?
           |
           +--> Sim: Gera cookie definitivo de sessão familiar.
           +--> Não: Retorna erro de validação.
```

No banco de dados atual, campos opcionais como `otp_secret` e `otp_enabled` podem ser deixados como nulos por padrão, permitindo essa extensão futura sem alterações drásticas de schema.
