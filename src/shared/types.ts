/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// =============================================================================
// FinFam - Shared Types & Interfaces
// =============================================================================

export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  DIGITAL_WALLET = 'digital_wallet',
  CASH = 'cash',
  OTHER = 'other'
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

export enum ContactType {
  PERSON = 'person',
  COMPANY = 'company',
  BANK = 'bank',
  CLIENT = 'client',
  SUPPLIER = 'supplier',
  GOVERNMENT = 'government',
  OTHER = 'other'
}

export enum ContactStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer'
}

export enum CommitmentType {
  TO_PAY = 'to_pay',
  TO_RECEIVE = 'to_receive'
}

export enum CommitmentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled'
}

export enum RecurrenceType {
  NONE = 'none',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export enum ProjectType {
  RESERVE = 'reserve',
  PROJECT = 'project'
}

export enum ProjectStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ProjectOperationType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal'
}

export interface Family {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  family_id: number;
  name: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: number;
  family_id: number;
  name: string;
  institution: string;
  type: AccountType;
  holder_name: string;
  account_identifier: string | null;
  pix_key: string | null;
  initial_balance: number;
  status: AccountStatus;
  notes: string | null;
  created_by_id: number;
  updated_by_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: number;
  family_id: number;
  name: string;
  type: ContactType;
  phone: string | null;
  document_number: string | null;
  pix_key: string | null;
  status: ContactStatus;
  notes: string | null;
  created_by_id: number;
  updated_by_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  family_id: number;
  name: string;
  type: 'income' | 'expense';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  family_id: number;
  type: TransactionType;
  description: string;
  amount: number;
  transaction_date: string;
  source_account_id: number | null;
  destination_account_id: number | null;
  responsible_user_id: number;
  category_id: number | null;
  contact_id: number | null;
  notes: string | null;
  created_by_id: number;
  updated_by_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Commitment {
  id: number;
  family_id: number;
  type: CommitmentType;
  description: string;
  estimated_amount: number;
  due_date: string;
  contact_id: number | null;
  responsible_user_id: number;
  estimated_account_id: number | null;
  category_id: number | null;
  status: CommitmentStatus;
  recurrence_type: RecurrenceType;
  actual_amount: number | null;
  actual_date: string | null;
  transaction_id: number | null;
  notes: string | null;
  created_by_id: number;
  updated_by_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  family_id: number;
  type: ProjectType;
  name: string;
  description: string | null;
  target_amount: number;
  deadline: string | null;
  responsible_user_id: number;
  status: ProjectStatus;
  notes: string | null;
  created_by_id: number;
  updated_by_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectOperation {
  id: number;
  family_id: number;
  project_id: number;
  operation_type: ProjectOperationType;
  amount: number;
  source_account_id: number | null;
  destination_account_id: number | null;
  operation_date: string;
  notes: string | null;
  created_by_id: number;
  created_at: string;
}

export interface SessionData {
  userId: number;
  username: string;
  name: string;
  familyId: number;
  role: UserRole;
}
