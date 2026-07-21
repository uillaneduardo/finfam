/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Sparkles, Building2, User, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency, normalizeDecimal } from '../utils/format';
import { Account } from '../../shared/types';
import ConfirmModal from '../components/ConfirmModal';

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit & Delete State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [type, setType] = useState('checking');
  const [holderName, setHolderName] = useState('');
  const [accountIdentifier, setAccountIdentifier] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [notes, setNotes] = useState('');

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      setAccounts(data || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setInstitution('');
    setType('checking');
    setHolderName('');
    setAccountIdentifier('');
    setPixKey('');
    setInitialBalance('');
    setNotes('');
    setError(null);
  };

  const handleStartEdit = (acc: Account) => {
    setEditingId(acc.id);
    setName(acc.name);
    setInstitution(acc.institution);
    setType(acc.type);
    setHolderName(acc.holder_name);
    setAccountIdentifier(acc.account_identifier || '');
    setPixKey(acc.pix_key || '');
    setInitialBalance(acc.initial_balance.toString());
    setNotes(acc.notes || '');
    setError(null);
    setShowForm(true);

    const formEl = document.getElementById('account-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !institution || !type || !holderName) {
      setError('Por favor, preencha todos os campos obrigatórios (Nome, instituição, tipo e titular).');
      return;
    }

    setSubmitLoading(true);

    try {
      const normalizedBalance = normalizeDecimal(initialBalance);
      const payload = {
        name,
        institution,
        type,
        holder_name: holderName,
        account_identifier: accountIdentifier || null,
        pix_key: pixKey || null,
        initial_balance: normalizedBalance || '0',
        notes: notes || null
      };

      if (editingId) {
        const res = await fetch(`/api/accounts/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Falha ao atualizar conta financeira.');
        }
      } else {
        const res = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Falha ao cadastrar conta financeira.');
        }
      }

      resetForm();
      setShowForm(false);

      setLoading(true);
      await loadAccounts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAccount) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/accounts/${deletingAccount.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Falha ao excluir conta.');
      }

      setDeletingAccount(null);
      if (editingId === deletingAccount.id) {
        resetForm();
        setShowForm(false);
      }

      setLoading(true);
      await loadAccounts();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir conta.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin h-8 w-8 text-slate-950" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  return (
    <div id="accounts-view" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Contas Financeiras</h1>
          <p className="text-slate-500 text-sm">Gerenciamento de contas correntes, poupanças, carteiras digitais e reservas livres.</p>
        </div>
        <button
          id="toggle-account-form-btn"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-all shadow-sm self-start"
        >
          <Plus className="w-4 h-4" />
          <span>{showForm ? 'Fechar Formulário' : 'Nova Conta'}</span>
        </button>
      </div>

      {/* New/Edit Account Form */}
      {showForm && (
        <form id="account-entry-form" onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {editingId ? 'Editar Conta Financeira' : 'Cadastrar Nova Conta'}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-500 hover:text-slate-700 underline font-medium"
              >
                Cancelar Edição
              </button>
            )}
          </div>

          {error && (
            <div id="account-form-error" className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-3.5 rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="acc-name" className="block text-xs font-medium text-slate-700 mb-1">
                Apelido da Conta
              </label>
              <input
                id="acc-name"
                type="text"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                placeholder="Ex: Itaú Conjunta"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="acc-institution" className="block text-xs font-medium text-slate-700 mb-1">
                Instituição Financeira / Banco
              </label>
              <input
                id="acc-institution"
                type="text"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                placeholder="Ex: Itaú Unibanco"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="acc-type" className="block text-xs font-medium text-slate-700 mb-1">
                Tipo da Conta
              </label>
              <select
                id="acc-type"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="checking">Conta Corrente</option>
                <option value="savings">Conta Poupança</option>
                <option value="digital_wallet">Carteira Digital</option>
                <option value="cash">Dinheiro em Espécie (Carteira)</option>
                <option value="other">Outros</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="acc-holder" className="block text-xs font-medium text-slate-700 mb-1">
                Nome do Titular
              </label>
              <input
                id="acc-holder"
                type="text"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                placeholder="Ex: Carlos Silva"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="acc-initial" className="block text-xs font-medium text-slate-700 mb-1">
                Saldo Inicial (R$)
              </label>
              <input
                id="acc-initial"
                type="text"
                inputMode="decimal"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                placeholder="0.00"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value.replace(/[^0-9.,-]/g, ''))}
              />
            </div>

            <div>
              <label htmlFor="acc-pix" className="block text-xs font-medium text-slate-700 mb-1">
                Chave Pix Associada (Opcional)
              </label>
              <input
                id="acc-pix"
                type="text"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                placeholder="Ex: pix@exemplo.com"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="acc-identifier" className="block text-xs font-medium text-slate-700 mb-1">
                Agência / Número da Conta (Opcional)
              </label>
              <input
                id="acc-identifier"
                type="text"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                placeholder="Ex: Ag: 0001 CC: 12345-6"
                value={accountIdentifier}
                onChange={(e) => setAccountIdentifier(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="acc-notes" className="block text-xs font-medium text-slate-700 mb-1">
                Notas / Observações
              </label>
              <input
                id="acc-notes"
                type="text"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                placeholder="Ex: Utilizada para débito automático de contas de consumo."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {editingId ? (
              <button
                type="button"
                onClick={() => {
                  const currentAcc = accounts.find(a => a.id === editingId);
                  if (currentAcc) setDeletingAccount(currentAcc);
                }}
                className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Conta</span>
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                id="account-form-submit-btn"
                type="submit"
                disabled={submitLoading}
                className="px-6 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center space-x-1.5 shadow-sm"
              >
                {submitLoading ? (
                  <span>Salvando...</span>
                ) : (
                  <span>{editingId ? 'Salvar Alterações' : 'Cadastrar Conta'}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Accounts List / Cards view */}
      {accounts.length === 0 ? (
        <div id="accounts-empty-state" className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
          <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Nenhuma conta cadastrada</h3>
          <p className="text-slate-500 text-xs mt-1.5 max-w-sm mx-auto">
            Por favor, cadastre uma conta de origem ou destino para poder registrar lançamentos financeiros.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Cadastrar Minha Primeira Conta
          </button>
        </div>
      ) : (
        <div id="accounts-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {accounts.map(account => {
            const nominal = Number((account as any).nominal_balance ?? account.initial_balance);
            const reserved = Number((account as any).reserved_balance ?? 0);
            const free = Number((account as any).free_balance ?? nominal);

            return (
              <div key={account.id} className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="bg-slate-100 p-2 rounded-xl text-slate-700 shrink-0">
                      <Building2 className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 truncate leading-snug">{account.name}</h3>
                      <span className="text-[10px] text-slate-500 font-mono block leading-none mt-0.5">{account.institution}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold font-mono uppercase ${
                      account.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {account.status === 'active' ? 'Ativa' : 'Inativa'}
                    </span>
                    <button
                      onClick={() => handleStartEdit(account)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Editar conta"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingAccount(account)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Excluir conta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub-balances layout */}
                <div className="grid grid-cols-3 gap-1 border-y border-slate-100 py-3 text-center">
                  <div>
                    <span className="text-[9px] text-slate-400 font-mono block">Saldo Nominal</span>
                    <strong className="text-xs text-slate-900 font-mono block mt-0.5">{formatCurrency(nominal)}</strong>
                  </div>
                  <div className="border-x border-slate-100">
                    <span className="text-[9px] text-slate-400 font-mono block">Reservado</span>
                    <strong className="text-xs text-amber-600 font-mono block mt-0.5">{formatCurrency(reserved)}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-mono block">Saldo Livre</span>
                    <strong className="text-xs text-emerald-600 font-mono block mt-0.5">{formatCurrency(free)}</strong>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Titular: <strong>{account.holder_name}</strong></span>
                  </div>
                  {account.account_identifier && (
                    <p className="text-[10px] text-slate-500 font-mono">Dados: {account.account_identifier}</p>
                  )}
                  {account.pix_key && (
                    <p className="text-[10px] text-slate-500 font-mono">Pix: <span className="bg-slate-50 px-1 py-0.5 rounded">{account.pix_key}</span></p>
                  )}
                  {account.notes && (
                    <p className="text-[9px] text-slate-400 italic mt-2">"{account.notes}"</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingAccount}
        title="Confirmar Exclusão de Conta"
        message={
          deletingAccount
            ? `Tem certeza que deseja excluir a conta "${deletingAccount.name}" (${deletingAccount.institution})? Esta ação não poderá ser desfeita.`
            : ''
        }
        isLoading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingAccount(null)}
      />
    </div>
  );
}
