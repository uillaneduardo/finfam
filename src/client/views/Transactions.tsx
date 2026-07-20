/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, AlertCircle, Plus, Sparkles, Filter } from 'lucide-react';
import { formatCurrency, formatDate, normalizeDecimal } from '../utils/format';
import { Account, Transaction, Category, Contact, User } from '../../shared/types';

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');

  // Form state
  const [type, setType] = useState('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  
  // Optional fields state
  const [showDetails, setShowDetails] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [contactId, setContactId] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    try {
      const [txs, accs, cats, conts, usrs] = await Promise.all([
        fetch('/api/transactions').then(r => r.json()),
        fetch('/api/accounts').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/contacts').then(r => r.json()),
        fetch('/api/users').then(r => r.json())
      ]);

      setTransactions(txs || []);
      setAccounts(accs || []);
      setCategories(cats || []);
      setContacts(conts || []);
      setUsers(usrs || []);

      if (usrs && usrs.length > 0) {
        setResponsibleUserId(usrs[0].id.toString());
      }
    } catch (err) {
      console.error('Error fetching transactions data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!type || !description || !amount || !transactionDate || !responsibleUserId) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (type === 'expense' && !sourceAccountId) {
      setError('Uma despesa exige selecionar uma conta de origem.');
      return;
    }
    if (type === 'income' && !destinationAccountId) {
      setError('Uma receita exige selecionar uma conta de destino.');
      return;
    }
    if (type === 'transfer' && (!sourceAccountId || !destinationAccountId)) {
      setError('Uma transferência exige selecionar as contas de origem e destino.');
      return;
    }

    setSubmitLoading(true);

    try {
      const normalizedAmount = normalizeDecimal(amount);
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          description,
          amount: normalizedAmount,
          transaction_date: transactionDate,
          source_account_id: sourceAccountId || null,
          destination_account_id: destinationAccountId || null,
          responsible_user_id: responsibleUserId,
          category_id: categoryId || null,
          contact_id: contactId || null,
          notes: notes || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Falha ao salvar movimentação.');
      }

      // Reset form
      setDescription('');
      setAmount('');
      setSourceAccountId('');
      setDestinationAccountId('');
      setCategoryId('');
      setContactId('');
      setNotes('');
      setShowDetails(false);
      setShowForm(false);
      
      // Reload
      setLoading(true);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Filter logic
  const filteredTransactions = transactions.filter(tx => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (filterAccount !== 'all') {
      const accId = Number(filterAccount);
      if (tx.source_account_id !== accId && tx.destination_account_id !== accId) return false;
    }
    if (filterUser !== 'all' && tx.responsible_user_id !== Number(filterUser)) return false;
    return true;
  });

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
    <div id="transactions-view" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Movimentações</h1>
          <p className="text-slate-500 text-sm">Histórico completo e registro rápido de receitas, despesas e transferências.</p>
        </div>
        <button
          id="toggle-tx-form-btn"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-all shadow-sm self-start"
        >
          <Plus className="w-4 h-4" />
          <span>{showForm ? 'Fechar Formulário' : 'Novo Lançamento'}</span>
        </button>
      </div>

      {/* Quick Launch Form */}
      {showForm && (
        <form id="tx-entry-form" onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            Registrar Novo Fluxo
          </h3>

          {error && (
            <div id="tx-form-error" className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-3.5 rounded-xl">
              {error}
            </div>
          )}

          {/* Core Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="tx-type" className="block text-xs font-medium text-slate-700 mb-1">
                Tipo
              </label>
              <select
                id="tx-type"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setError(null);
                }}
              >
                <option value="expense">Saída (Despesa)</option>
                <option value="income">Entrada (Receita)</option>
                <option value="transfer">Transferência Interna</option>
              </select>
            </div>

            <div>
              <label htmlFor="tx-description" className="block text-xs font-medium text-slate-700 mb-1">
                Descrição
              </label>
              <input
                id="tx-description"
                type="text"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                placeholder="Ex: Supermercado Mensal"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="tx-amount" className="block text-xs font-medium text-slate-700 mb-1">
                Valor (R$)
              </label>
              <input
                id="tx-amount"
                type="text"
                inputMode="decimal"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,-]/g, ''))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="tx-date" className="block text-xs font-medium text-slate-700 mb-1">
                Data do Lançamento
              </label>
              <input
                id="tx-date"
                type="date"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </div>

            {/* Source Account (required for expense and transfer) */}
            {(type === 'expense' || type === 'transfer') && (
              <div>
                <label htmlFor="tx-source" className="block text-xs font-medium text-slate-700 mb-1">
                  Conta de Origem
                </label>
                <select
                  id="tx-source"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Destination Account (required for income and transfer) */}
            {(type === 'income' || type === 'transfer') && (
              <div>
                <label htmlFor="tx-dest" className="block text-xs font-medium text-slate-700 mb-1">
                  Conta de Destino
                </label>
                <select
                  id="tx-dest"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="tx-user" className="block text-xs font-medium text-slate-700 mb-1">
                Responsável
              </label>
              <select
                id="tx-user"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                value={responsibleUserId}
                onChange={(e) => setResponsibleUserId(e.target.value)}
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Expansion Field */}
          <div className="pt-2">
            <button
              id="expand-details-btn"
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-slate-600 font-semibold underline focus:outline-none flex items-center space-x-1"
            >
              <span>{showDetails ? 'Ocultar detalhes opcionais' : 'Adicionar detalhes opcionais'}</span>
            </button>

            {showDetails && (
              <div id="tx-optional-fields" className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 mt-4 animate-fade-in">
                <div>
                  <label htmlFor="tx-category" className="block text-xs font-medium text-slate-700 mb-1">
                    Categoria
                  </label>
                  <select
                    id="tx-category"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Nenhuma</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="tx-contact" className="block text-xs font-medium text-slate-700 mb-1">
                    Contato Financeiro
                  </label>
                  <select
                    id="tx-contact"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                  >
                    <option value="">Nenhum</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="tx-notes" className="block text-xs font-medium text-slate-700 mb-1">
                    Notas / Observações
                  </label>
                  <input
                    id="tx-notes"
                    type="text"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    placeholder="Ex: Comprovante guardado..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              id="tx-form-submit-btn"
              type="submit"
              disabled={submitLoading}
              className="px-6 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center space-x-1.5"
            >
              {submitLoading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Registrando Lançamento...</span>
                </>
              ) : (
                <span>Confirmar Registro</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Filters Panel */}
      <div id="tx-filters-bar" className="bg-slate-100/60 border border-slate-200/50 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-2 text-slate-700">
          <Filter className="w-4 h-4 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider font-mono">Filtros</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto">
          <select
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">Tipos (Todos)</option>
            <option value="income">Entradas (Receitas)</option>
            <option value="expense">Saídas (Despesas)</option>
            <option value="transfer">Transferências</option>
          </select>

          <select
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
          >
            <option value="all">Contas (Todas)</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>

          <select
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
          >
            <option value="all">Responsável (Todos)</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Transactions List / Empty State */}
      {filteredTransactions.length === 0 ? (
        <div id="tx-empty-state" className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Sem Lançamentos Encontrados</h3>
          <p className="text-slate-500 text-xs mt-1.5 max-w-sm mx-auto">
            Não existem movimentações financeiras para os filtros selecionados.
          </p>
          <button
            onClick={() => {
              setFilterType('all');
              setFilterAccount('all');
              setFilterUser('all');
              setShowForm(true);
            }}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Começar Lançamento Rápido
          </button>
        </div>
      ) : (
        <div id="tx-list-table-container" className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredTransactions.map(tx => {
              const sourceAccName = accounts.find(a => a.id === tx.source_account_id)?.name;
              const destAccName = accounts.find(a => a.id === tx.destination_account_id)?.name;
              const respUserName = users.find(u => u.id === tx.responsible_user_id)?.name;

              return (
                <div key={tx.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/50 transition-colors gap-3">
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 ${
                      tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : tx.type === 'expense' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-600'
                    }`}>
                      {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : tx.type === 'expense' ? <ArrowDownLeft className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                    </div>
                    
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate leading-snug">{tx.description}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 leading-relaxed">
                        {formatDate(tx.transaction_date)} • Responsável: <strong className="font-semibold">{respUserName}</strong>
                        {tx.type === 'expense' && sourceAccName && ` • Pago via ${sourceAccName}`}
                        {tx.type === 'income' && destAccName && ` • Depositado em ${destAccName}`}
                        {tx.type === 'transfer' && ` • Mapeado de ${sourceAccName} para ${destAccName}`}
                      </p>
                      {tx.notes && (
                        <p className="text-[9px] text-slate-400 italic font-mono mt-1">Obs: "{tx.notes}"</p>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className={`text-sm font-bold font-mono ${
                      tx.type === 'income' ? 'text-emerald-600' : tx.type === 'expense' ? 'text-rose-600' : 'text-slate-600'
                    }`}>
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''} {formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
