/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CalendarClock, Plus, CheckCircle, AlertTriangle, Sparkles, Filter, X, Pencil, Trash2, Calendar as CalendarIcon, List as ListIcon } from 'lucide-react';
import { formatCurrency, formatDate, normalizeDecimal } from '../utils/format';
import { Account, Commitment, Category, Contact, User } from '../../shared/types';
import ConfirmModal from '../components/ConfirmModal';
import CommitmentCalendar from '../components/CommitmentCalendar';

interface CommitmentsProps {
  currentUser?: User;
}

export default function Commitments({ currentUser }: CommitmentsProps) {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [payingCommitment, setPayingCommitment] = useState<Commitment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  // Edit & Delete State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingCommitment, setDeletingCommitment] = useState<Commitment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // View mode: 'calendar' (visual) or 'list' (tabular)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Filter state (all, today, week, month, overdue)
  const [filterPeriod, setFilterPeriod] = useState<string>('all');

  // New commitment form state
  const [type, setType] = useState('to_pay');
  const [description, setDescription] = useState('');
  const [estimatedAmount, setEstimatedAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [estimatedAccountId, setEstimatedAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [contactId, setContactId] = useState('');
  const [recurrenceType, setRecurrenceType] = useState('none');
  const [recurrenceCount, setRecurrenceCount] = useState<string>('3');
  const [notes, setNotes] = useState('');

  // Payment modal/inline form state
  const [payAccountId, setPayAccountId] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const handleNewForDate = (dateStr: string) => {
    setEditingId(null);
    setDescription('');
    setEstimatedAmount('');
    setDueDate(dateStr);
    setEstimatedAccountId('');
    setCategoryId('');
    setContactId('');
    setNotes('');
    setRecurrenceType('none');
    setShowForm(true);

    setTimeout(() => {
      const formEl = document.getElementById('commitment-entry-form');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  const getActiveUserId = (userList: User[] = users) => {
    if (currentUser?.id) return currentUser.id.toString();
    if (userList && userList.length > 0) return userList[0].id.toString();
    return '';
  };

  const resetForm = () => {
    setEditingId(null);
    setType('to_pay');
    setDescription('');
    setEstimatedAmount('');
    setDueDate('');
    setResponsibleUserId(getActiveUserId(users));
    setEstimatedAccountId('');
    setCategoryId('');
    setContactId('');
    setRecurrenceType('none');
    setRecurrenceCount('3');
    setNotes('');
    setError(null);
  };

  const handleStartEdit = (comm: Commitment) => {
    setEditingId(comm.id);
    setType(comm.type);
    setDescription(comm.description);
    setEstimatedAmount(comm.estimated_amount.toString());
    
    let dateStr = '';
    if (comm.due_date) {
      dateStr = String(comm.due_date).substring(0, 10);
    }
    setDueDate(dateStr);
    
    setResponsibleUserId(comm.responsible_user_id ? comm.responsible_user_id.toString() : '');
    setEstimatedAccountId(comm.estimated_account_id ? comm.estimated_account_id.toString() : '');
    setCategoryId(comm.category_id ? comm.category_id.toString() : '');
    setContactId(comm.contact_id ? comm.contact_id.toString() : '');
    setRecurrenceType(comm.recurrence_type || 'none');
    setNotes(comm.notes || '');
    setError(null);
    setShowForm(true);

    const formEl = document.getElementById('comm-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!type || !description || !estimatedAmount || !dueDate || !responsibleUserId) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSubmitLoading(true);

    try {
      const normalizedAmount = normalizeDecimal(estimatedAmount);
      const payload = {
        type,
        description,
        estimated_amount: normalizedAmount,
        due_date: dueDate,
        responsible_user_id: Number(responsibleUserId),
        estimated_account_id: estimatedAccountId ? Number(estimatedAccountId) : null,
        category_id: categoryId ? Number(categoryId) : null,
        contact_id: contactId ? Number(contactId) : null,
        recurrence_type: recurrenceType,
        recurrence_count: recurrenceType !== 'none' ? Math.max(1, Number(recurrenceCount) || 1) : 1,
        notes: notes || null
      };

      if (editingId) {
        const res = await fetch(`/api/commitments/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Falha ao atualizar compromisso.');
        }
      } else {
        const res = await fetch('/api/commitments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Falha ao agendar compromisso.');
        }
      }

      resetForm();
      setShowForm(false);

      setLoading(true);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCommitment) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/commitments/${deletingCommitment.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Falha ao excluir compromisso.');
      }

      setDeletingCommitment(null);
      if (editingId === deletingCommitment.id) {
        resetForm();
        setShowForm(false);
      }

      setLoading(true);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir compromisso.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [comms, accs, cats, conts, usrs, meRes] = await Promise.all([
        fetch('/api/commitments').then(r => r.json()),
        fetch('/api/accounts').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/contacts').then(r => r.json()),
        fetch('/api/users').then(r => r.json()),
        currentUser ? Promise.resolve(null) : fetch('/api/auth/me').then(r => r.ok ? r.json() : null)
      ]);

      setCommitments(comms || []);
      setAccounts(accs || []);
      setCategories(cats || []);
      setContacts(conts || []);
      setUsers(usrs || []);

      const activeUser = currentUser || meRes?.user;
      if (activeUser && activeUser.id) {
        setResponsibleUserId(activeUser.id.toString());
      } else if (usrs && usrs.length > 0) {
        setResponsibleUserId(usrs[0].id.toString());
      }
    } catch (err) {
      console.error('Error fetching commitments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!type || !description || !estimatedAmount || !dueDate || !responsibleUserId) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSubmitLoading(true);

    try {
      const normalizedAmount = normalizeDecimal(estimatedAmount);
      const res = await fetch('/api/commitments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          description,
          estimated_amount: normalizedAmount,
          due_date: dueDate,
          responsible_user_id: responsibleUserId,
          estimated_account_id: estimatedAccountId || null,
          category_id: categoryId || null,
          contact_id: contactId || null,
          recurrence_type: recurrenceType,
          notes: notes || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Falha ao agendar compromisso.');
      }

      // Reset
      setDescription('');
      setEstimatedAmount('');
      setDueDate('');
      setEstimatedAccountId('');
      setCategoryId('');
      setContactId('');
      setNotes('');
      setRecurrenceType('none');
      setShowForm(false);

      setLoading(true);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const startPayment = (comm: Commitment) => {
    setPayingCommitment(comm);
    setPayAmount(comm.estimated_amount.toString());
    setPayAccountId(comm.estimated_account_id ? comm.estimated_account_id.toString() : '');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayNotes('');
    setPayError(null);
  };

  const handlePayConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError(null);

    if (!payingCommitment) return;
    if (!payAmount || !payDate || !payAccountId) {
      setPayError('Por favor, preencha todos os campos para a liquidação.');
      return;
    }

    setPayLoading(true);

    try {
      const normalizedPayAmount = normalizeDecimal(payAmount);
      const res = await fetch(`/api/commitments/${payingCommitment.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actual_amount: normalizedPayAmount,
          actual_date: payDate,
          account_id: payAccountId,
          notes: payNotes || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Falha ao liquidar compromisso.');
      }

      setPayingCommitment(null);
      setLoading(true);
      await loadData();
    } catch (err: any) {
      setPayError(err.message);
    } finally {
      setPayLoading(false);
    }
  };

  // Chronological Filter processing
  const getFilteredCommitments = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Calculate week boundary (7 days from now)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const weekBoundaryStr = sevenDaysFromNow.toISOString().split('T')[0];

    // Calculate month boundary (30 days from now)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const monthBoundaryStr = thirtyDaysFromNow.toISOString().split('T')[0];

    return commitments.filter(comm => {
      if (filterPeriod === 'overdue') {
        return comm.status === 'pending' && comm.due_date < todayStr;
      }
      if (filterPeriod === 'today') {
        return comm.due_date === todayStr;
      }
      if (filterPeriod === 'week') {
        return comm.due_date >= todayStr && comm.due_date <= weekBoundaryStr;
      }
      if (filterPeriod === 'month') {
        return comm.due_date >= todayStr && comm.due_date <= monthBoundaryStr;
      }
      return true;
    });
  };

  const filteredCommitments = getFilteredCommitments();

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
    <div id="commitments-view" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Compromissos</h1>
          <p className="text-slate-500 text-sm">Controle de contas a pagar e receber recorrentes e futuras.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* View Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 border border-slate-200/60">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendário</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          <button
            id="toggle-commitment-form-btn"
            onClick={() => setShowForm(!showForm)}
            className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showForm ? 'Fechar' : 'Novo Agendamento'}</span>
          </button>
        </div>
      </div>

      {/* New Commitment Form */}
      {showForm && (
        <form id="commitment-entry-form" onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {editingId ? 'Editar Compromisso Financeiro' : 'Agendar Compromisso Financeiro'}
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
            <div id="comm-form-error" className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-3.5 rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="comm-type" className="block text-xs font-medium text-slate-700 mb-1">
                Direcionamento
              </label>
              <select
                id="comm-type"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="to_pay">A Pagar (Despesa Futura)</option>
                <option value="to_receive">A Receber (Receita Futura)</option>
              </select>
            </div>

            <div>
              <label htmlFor="comm-desc" className="block text-xs font-medium text-slate-700 mb-1">
                Descrição / Título
              </label>
              <input
                id="comm-desc"
                type="text"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                placeholder="Ex: Conta de Luz Junho"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="comm-amount" className="block text-xs font-medium text-slate-700 mb-1">
                Valor Previsto / Estimado (R$)
              </label>
              <input
                id="comm-amount"
                type="text"
                inputMode="decimal"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                placeholder="0.00"
                value={estimatedAmount}
                onChange={(e) => setEstimatedAmount(e.target.value.replace(/[^0-9.,-]/g, ''))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="comm-due" className="block text-xs font-medium text-slate-700 mb-1">
                Data do Vencimento
              </label>
              <input
                id="comm-due"
                type="date"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="comm-user" className="block text-xs font-medium text-slate-700 mb-1">
                Membro Responsável
              </label>
              <select
                id="comm-user"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                value={responsibleUserId}
                onChange={(e) => setResponsibleUserId(e.target.value)}
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="comm-recur" className="block text-xs font-medium text-slate-700 mb-1">
                Recorrência
              </label>
              <select
                id="comm-recur"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                value={recurrenceType}
                onChange={(e) => setRecurrenceType(e.target.value)}
              >
                <option value="none">Única (Não repete)</option>
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quinzenal</option>
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
              </select>
            </div>

            {recurrenceType !== 'none' && (
              <div>
                <label htmlFor="comm-recur-count" className="block text-xs font-medium text-slate-700 mb-1">
                  Quantidade de Vezes / Parcelas
                </label>
                <input
                  id="comm-recur-count"
                  type="number"
                  min="1"
                  max="120"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                  value={recurrenceCount}
                  onChange={(e) => setRecurrenceCount(e.target.value)}
                  placeholder="Ex: 3"
                />
              </div>
            )}
          </div>

          {recurrenceType !== 'none' && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-900 font-medium">
              <div className="flex items-center space-x-2">
                <span className="text-base">💡</span>
                <span>
                  <strong>Cálculo do Compromisso Recorrente:</strong>{' '}
                  {formatCurrency(normalizeDecimal(estimatedAmount) || 0)} ({recurrenceType === 'weekly' ? 'semanal' : recurrenceType === 'biweekly' ? 'quinzenal' : recurrenceType === 'monthly' ? 'mensal' : 'anual'}) × {Math.max(1, Number(recurrenceCount) || 1)} vezes
                </span>
              </div>
              <span className="text-sm font-extrabold text-amber-950 font-mono bg-amber-100 px-2.5 py-1 rounded-lg">
                Total: {formatCurrency((Number(normalizeDecimal(estimatedAmount)) || 0) * (Math.max(1, Number(recurrenceCount) || 1)))}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="comm-est-acc" className="block text-xs font-medium text-slate-700 mb-1">
                Conta Estimada
              </label>
              <select
                id="comm-est-acc"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                value={estimatedAccountId}
                onChange={(e) => setEstimatedAccountId(e.target.value)}
              >
                <option value="">Nenhuma</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="comm-cat" className="block text-xs font-medium text-slate-700 mb-1">
                Categoria
              </label>
              <select
                id="comm-cat"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
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
              <label htmlFor="comm-notes" className="block text-xs font-medium text-slate-700 mb-1">
                Notas Adicionais
              </label>
              <input
                id="comm-notes"
                type="text"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                placeholder="Ex: Debito automatico..."
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
                  const currentComm = commitments.find(c => c.id === editingId);
                  if (currentComm) setDeletingCommitment(currentComm);
                }}
                className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Compromisso</span>
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
                id="comm-form-submit-btn"
                type="submit"
                disabled={submitLoading}
                className="px-6 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center space-x-1.5 shadow-sm"
              >
                {submitLoading ? (
                  <span>Salvando...</span>
                ) : (
                  <span>{editingId ? 'Salvar Alterações' : 'Confirmar Agendamento'}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Calendar or List View */}
      {viewMode === 'calendar' ? (
        <CommitmentCalendar
          commitments={commitments}
          users={users}
          accounts={accounts}
          onPay={startPayment}
          onEdit={handleStartEdit}
          onDelete={(comm) => setDeletingCommitment(comm)}
          onNewForDate={handleNewForDate}
        />
      ) : (
        <>
          {/* Time Horizon Filter tabs */}
          <div id="comm-filters-panel" className="bg-slate-100/60 border border-slate-200/50 rounded-2xl p-2.5 flex flex-wrap gap-2">
            <button
              onClick={() => setFilterPeriod('all')}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                filterPeriod === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'
              }`}
            >
              Todos os Compromissos
            </button>
            <button
              onClick={() => setFilterPeriod('overdue')}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center space-x-1 ${
                filterPeriod === 'overdue' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Atrasados</span>
            </button>
            <button
              onClick={() => setFilterPeriod('today')}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                filterPeriod === 'today' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'
              }`}
            >
              Vence Hoje
            </button>
            <button
              onClick={() => setFilterPeriod('week')}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                filterPeriod === 'week' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'
              }`}
            >
              Próximos 7 Dias
            </button>
            <button
              onClick={() => setFilterPeriod('month')}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                filterPeriod === 'month' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'
              }`}
            >
              Próximos 30 Dias
            </button>
          </div>

          {/* Main Commitments List */}
          {filteredCommitments.length === 0 ? (
            <div id="comm-empty-state" className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
              <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Nenhum compromisso agendado</h3>
              <p className="text-slate-500 text-xs mt-1.5 max-w-sm mx-auto">
                Não existem faturas, boletos ou cobranças pendentes de liquidação para este período.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Agendar Novo Lançamento Futuro
              </button>
            </div>
          ) : (
            <div id="commitments-list-container" className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
              {filteredCommitments.map(comm => {
                const isOverdue = comm.status === 'pending' && comm.due_date < new Date().toISOString().split('T')[0];
                const respUser = users.find(u => u.id === comm.responsible_user_id)?.name;
                const estAccName = accounts.find(a => a.id === comm.estimated_account_id)?.name;

                return (
                  <div key={comm.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                    <div className="flex items-start space-x-3.5 min-w-0">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        comm.status === 'paid' 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : isOverdue 
                            ? 'bg-rose-50 text-rose-600' 
                            : 'bg-amber-50 text-amber-600'
                      }`}>
                        {comm.status === 'paid' ? <CheckCircle className="w-4.5 h-4.5" /> : <CalendarClock className="w-4.5 h-4.5" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-slate-900 truncate leading-snug">{comm.description}</h4>
                          {comm.status === 'paid' ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold">Liquidado</span>
                          ) : isOverdue ? (
                            <span className="bg-rose-100 text-rose-800 text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold">Atrasado</span>
                          ) : (
                            <span className="bg-slate-100 text-slate-800 text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold">Pendente</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-1 leading-relaxed">
                          Vencimento: <strong className={isOverdue ? "text-rose-600 font-bold" : "font-semibold text-slate-700"}>{formatDate(comm.due_date)}</strong>
                          {respUser && ` • Responsável: ${respUser}`}
                          {estAccName && ` • Estimado via: ${estAccName}`}
                        </p>
                        {comm.notes && (
                          <p className="text-[9px] text-slate-400 italic font-mono mt-1">Obs: "{comm.notes}"</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block">Valor Estimado</span>
                        <span className="text-xs font-bold text-slate-900 font-mono">{formatCurrency(comm.estimated_amount)}</span>
                      </div>

                      {comm.status === 'pending' && (
                        <button
                          id={`pay-commitment-${comm.id}`}
                          onClick={() => startPayment(comm)}
                          className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          Quitar
                        </button>
                      )}

                      <div className="flex items-center space-x-1 pl-2 border-l border-slate-100">
                        <button
                          onClick={() => handleStartEdit(comm)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Editar compromisso"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingCommitment(comm)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir compromisso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Assisted Payment Overlay Modal (No horizontal scroll, fully centered, desktop & mobile optimized) */}
      {payingCommitment && (
        <div id="pay-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div id="pay-modal-card" className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-950 text-white p-5 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-emerald-400 font-mono uppercase font-bold tracking-wider">Quitação Assistida</span>
                <h3 className="text-sm font-bold truncate max-w-[280px]">{payingCommitment.description}</h3>
              </div>
              <button 
                onClick={() => setPayingCommitment(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePayConfirm} className="p-5 space-y-4">
              {payError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-3 rounded-xl">
                  {payError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Conta Financeira de Liquidação
                </label>
                <select
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                >
                  <option value="">Selecione a conta...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor Pago Real (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9.,-]/g, ''))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data da Liquidação
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observação de Liquidação (Opcional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                  placeholder="Ex: Pago com juros/desconto..."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingCommitment(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={payLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center space-x-1"
                >
                  {payLoading ? (
                    <span>Registrando...</span>
                  ) : (
                    <span>Confirmar Liquidação</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingCommitment}
        title="Confirmar Exclusão de Compromisso"
        message={
          deletingCommitment
            ? `Tem certeza que deseja excluir o compromisso "${deletingCommitment.description}" no valor de ${formatCurrency(deletingCommitment.estimated_amount)}? Esta ação não poderá ser desfeita.`
            : ''
        }
        isLoading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingCommitment(null)}
      />
    </div>
  );
}
