/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

// Base helper for non-empty string
const trimmedString = (fieldName: string, min = 1, max = 255) => 
  z.string({ message: `${fieldName} é obrigatório(a).` })
    .trim()
    .min(min, { message: `${fieldName} não pode ser vazio(a) e deve ter pelo menos ${min} caracteres.` })
    .max(max, { message: `${fieldName} deve ter no máximo ${max} caracteres.` });

// Strong Password check
export const strongPasswordSchema = z.string()
  .min(8, 'A senha deve conter no mínimo 8 caracteres.')
  .refine(val => /[A-Z].*/.test(val), 'A senha deve conter pelo menos uma letra maiúscula.')
  .refine(val => /[a-z].*/.test(val), 'A senha deve conter pelo menos uma letra minúscula.')
  .refine(val => /\d.*/.test(val), 'A senha deve conter pelo menos um número.')
  .refine(val => /[^A-Za-z0-9].*/.test(val), 'A senha deve conter pelo menos um caractere especial (símbolo).');

// Positive finite number up to 2 decimal places for financial amounts
export const financialAmountSchema = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? undefined : Number(val)),
  z.number({
    message: 'O valor deve ser um número válido.'
  })
  .finite('O valor deve ser um número finito.')
  .positive('O valor deve ser estritamente maior que zero.')
  .refine(val => {
    const str = val.toString();
    if (str.includes('.')) {
      const decimals = str.split('.')[1].length;
      return decimals <= 2;
    }
    return true;
  }, {
    message: 'O valor deve conter no máximo duas casas decimais.'
  })
);

// Positive ID type
export const idSchema = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
  z.number({
    message: 'ID deve ser um número.'
  })
  .int('ID deve ser um número inteiro.')
  .positive('ID deve ser um inteiro positivo.')
);

// Optional ID type
export const optionalIdSchema = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
  z.number().int().positive().optional().nullable()
);

// ISO Date string validator
export const dateStringSchema = z.string({ message: 'Data é obrigatória.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'A data deve estar no formato esperado AAAA-MM-DD.');

// 1. Schema: Primeiro Uso
export const firstUseSetupSchema = z.object({
  familyName: trimmedString('Nome da família', 2, 100),
  adminName: trimmedString('Nome do administrador', 2, 150),
  adminUsername: trimmedString('Nome de usuário', 3, 50)
    .toLowerCase()
    .regex(/^[a-z0-9_.-]+$/, 'O nome de usuário só pode conter letras minúsculas, números, sublinhados, traços ou pontos.'),
  adminPassword: strongPasswordSchema,
});

// 2. Schema: Login
export const loginSchema = z.object({
  username: z.string({ message: 'Nome de usuário é obrigatório.' }).trim().min(1, 'Informe seu nome de usuário.'),
  password: z.string({ message: 'Senha é obrigatória.' }).min(1, 'Informe sua senha.'),
});

// 3. Schema: Criação de Usuário
export const createUserSchema = z.object({
  name: trimmedString('Nome do usuário', 2, 150),
  username: trimmedString('Nome de usuário', 3, 50)
    .toLowerCase()
    .regex(/^[a-z0-9_.-]+$/, 'O nome de usuário só pode conter letras minúsculas, números, sublinhados, traços ou pontos.'),
  password: strongPasswordSchema,
  role: z.enum(['admin', 'member'], { message: 'Papel do usuário inválido. Escolha admin ou member.' }),
});

// 4. Schema: Contas
export const accountSchema = z.object({
  name: trimmedString('Nome da conta', 2, 100),
  institution: trimmedString('Instituição financeira', 2, 100),
  type: z.enum(['checking', 'savings', 'digital_wallet', 'cash', 'other'], {
    message: 'Tipo de conta inválido.'
  }),
  holder_name: trimmedString('Nome do titular', 2, 150),
  account_identifier: z.string().trim().max(50).optional().nullable(),
  pix_key: z.string().trim().max(100).optional().nullable(),
  initial_balance: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 0 : Number(val)),
    z.number().finite().refine(val => {
      const str = val.toString();
      if (str.includes('.')) {
        return str.split('.')[1].length <= 2;
      }
      return true;
    }, { message: 'O saldo inicial deve ter no máximo duas casas decimais.' })
  ).default(0),
  notes: z.string().trim().optional().nullable()
});

// 5. Schema: Movimentações
export const transactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer'], {
    message: 'Tipo de movimentação inválido. Deve ser entrada, saída ou transferência.'
  }),
  description: trimmedString('Descrição', 2, 255),
  amount: financialAmountSchema,
  transaction_date: dateStringSchema,
  source_account_id: optionalIdSchema,
  destination_account_id: optionalIdSchema,
  responsible_user_id: idSchema,
  category_id: optionalIdSchema,
  contact_id: optionalIdSchema,
  notes: z.string().trim().optional().nullable()
}).refine(data => {
  if (data.type === 'expense') {
    return data.source_account_id !== undefined && data.source_account_id !== null;
  }
  return true;
}, {
  message: 'A conta de origem é obrigatória para movimentações de saída.',
  path: ['source_account_id']
}).refine(data => {
  if (data.type === 'income') {
    return data.destination_account_id !== undefined && data.destination_account_id !== null;
  }
  return true;
}, {
  message: 'A conta de destino é obrigatória para movimentações de entrada.',
  path: ['destination_account_id']
}).refine(data => {
  if (data.type === 'transfer') {
    return (
      data.source_account_id !== undefined && data.source_account_id !== null &&
      data.destination_account_id !== undefined && data.destination_account_id !== null
    );
  }
  return true;
}, {
  message: 'Contas de origem e destino são obrigatórias para transferências.',
  path: ['source_account_id']
}).refine(data => {
  if (data.type === 'transfer') {
    return data.source_account_id !== data.destination_account_id;
  }
  return true;
}, {
  message: 'A conta de origem deve ser diferente da conta de destino.',
  path: ['destination_account_id']
}).refine(data => {
  if (data.type === 'expense') {
    return data.destination_account_id === undefined || data.destination_account_id === null;
  }
  return true;
}, {
  message: 'Movimentações de saída não devem receber conta de destino.',
  path: ['destination_account_id']
}).refine(data => {
  if (data.type === 'income') {
    return data.source_account_id === undefined || data.source_account_id === null;
  }
  return true;
}, {
  message: 'Movimentações de entrada não devem receber conta de origem.',
  path: ['source_account_id']
});

// 6. Schema: Compromissos
export const commitmentSchema = z.object({
  type: z.enum(['to_pay', 'to_receive'], {
    message: 'Tipo de compromisso inválido. Deve ser a pagar ou a receber.'
  }),
  description: trimmedString('Descrição do compromisso', 2, 255),
  estimated_amount: financialAmountSchema,
  due_date: dateStringSchema,
  contact_id: optionalIdSchema,
  responsible_user_id: idSchema,
  estimated_account_id: optionalIdSchema,
  category_id: optionalIdSchema,
  recurrence_type: z.enum(['none', 'monthly', 'weekly']).default('none'),
  notes: z.string().trim().optional().nullable()
});

// 7. Schema: Quitação de compromissos
export const quitaçãoSchema = z.object({
  actual_amount: financialAmountSchema,
  actual_date: dateStringSchema,
  account_id: idSchema,
});

// 8. Schema: Projetos / Reservas
export const projectSchema = z.object({
  type: z.enum(['reserve', 'project'], {
    message: 'Tipo de projeto/reserva inválido.'
  }),
  name: trimmedString('Nome do projeto', 2, 100),
  description: trimmedString('Descrição do projeto', 2, 255),
  target_amount: financialAmountSchema,
  deadline: dateStringSchema.optional().nullable(),
  responsible_user_id: idSchema,
  status: z.enum(['active', 'paused', 'completed', 'cancelled']).default('active'),
  notes: z.string().trim().optional().nullable()
});

// 9. Schema: Aportes (Deposits)
export const aporteSchema = z.object({
  project_id: idSchema,
  source_account_id: idSchema,
  amount: financialAmountSchema,
  operation_date: dateStringSchema,
  notes: z.string().trim().optional().nullable()
});

// 10. Schema: Resgates (Withdrawals)
export const resgateSchema = z.object({
  project_id: idSchema,
  destination_account_id: idSchema,
  amount: financialAmountSchema,
  operation_date: dateStringSchema,
  notes: z.string().trim().optional().nullable()
});

// 11. Schema: Contatos
export const contactSchema = z.object({
  name: trimmedString('Nome do contato', 2, 150),
  type: z.enum(['person', 'company', 'bank', 'client', 'supplier', 'government', 'other'], {
    message: 'Tipo de contato inválido.'
  }),
  phone: z.string().trim().max(20).optional().nullable(),
  document_number: z.string().trim().max(30).optional().nullable(),
  pix_key: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().optional().nullable()
});

// 12. Schema: Categorias
export const categorySchema = z.object({
  name: trimmedString('Nome da categoria', 2, 100),
  type: z.enum(['income', 'expense', 'both'], {
    message: 'Tipo de categoria inválido. Deve ser entrada, saída ou mista.'
  })
});
