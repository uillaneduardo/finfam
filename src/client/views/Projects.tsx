/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Target, Plus, PiggyBank, Landmark, Sparkles, TrendingUp, X, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate, normalizeDecimal } from '../utils/format';
import { Account, Project, User } from '../../shared/types';
import ConfirmModal from '../components/ConfirmModal';

interface ProjectsProps {
  currentUser?: User;
}

export default function Projects({ currentUser }: ProjectsProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [opLoading, setOpLoading] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [activeOpProject, setActiveOpProject] = useState<{ project: Project; type: 'deposit' | 'withdraw' } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  // Edit & Delete state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // New/Edit project form state
  const [type, setType] = useState('project');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [notes, setNotes] = useState('');

  // Operations form state
  const [opAmount, setOpAmount] = useState('');
  const [opAccountId, setOpAccountId] = useState('');
  const [opDate, setOpDate] = useState(new Date().toISOString().split('T')[0]);
  const [opNotes, setOpNotes] = useState('');

  const getActiveUserId = (userList: User[] = users) => {
    if (currentUser?.id) return currentUser.id.toString();
    if (userList && userList.length > 0) return userList[0].id.toString();
    return '';
  };

  const loadData = async () => {
    try {
      const [projs, accs, usrs, meRes] = await Promise.all([
        fetch('/api/projects').then(r => r.json()),
        fetch('/api/accounts').then(r => r.json()),
        fetch('/api/users').then(r => r.json()),
        currentUser ? Promise.resolve(null) : fetch('/api/auth/me').then(r => r.ok ? r.json() : null)
      ]);

      setProjects(projs || []);
      setAccounts(accs || []);
      setUsers(usrs || []);

      const activeUser = currentUser || meRes?.user;
      if (activeUser && activeUser.id) {
        setResponsibleUserId(activeUser.id.toString());
      } else if (usrs && usrs.length > 0) {
        setResponsibleUserId(usrs[0].id.toString());
      }
    } catch (err) {
      console.error('Error fetching projects data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const resetForm = () => {
    setEditingId(null);
    setType('project');
    setName('');
    setDescription('');
    setTargetAmount('');
    setDeadline('');
    setNotes('');
    setError(null);
    setResponsibleUserId(getActiveUserId(users));
  };

  const handleStartEdit = (proj: Project) => {
    setEditingId(proj.id);
    setType(proj.type);
    setName(proj.name);
    setDescription(proj.description || '');
    setTargetAmount(proj.target_amount.toString());
    setDeadline(proj.deadline || '');
    setResponsibleUserId(proj.responsible_user_id.toString());
    setNotes(proj.notes || '');
    setError(null);
    setShowForm(true);

    const formEl = document.getElementById('project-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!type || !name || !targetAmount || !responsibleUserId) {
      setError('Por favor, preencha todos os campos obrigatórios (Tipo, nome, valor e responsável).');
      return;
    }

    setSubmitLoading(true);

    try {
      const normalizedTarget = normalizeDecimal(targetAmount);
      const payload = {
        type,
        name,
        description,
        target_amount: normalizedTarget,
        deadline: deadline || null,
        responsible_user_id: responsibleUserId,
        notes: notes || null
      };

      if (editingId) {
        const res = await fetch(`/api/projects/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Falha ao atualizar meta/caixinha.');
        }
      } else {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Falha ao cadastrar caixinha de reserva.');
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
    if (!deletingProject) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/projects/${deletingProject.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Falha ao excluir caixinha.');
      }

      setDeletingProject(null);
      if (editingId === deletingProject.id) {
        resetForm();
        setShowForm(false);
      }

      setLoading(true);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir caixinha.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleOperationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpError(null);

    if (!activeOpProject) return;
    if (!opAmount || !opAccountId || !opDate) {
      setOpError('Por favor, preencha todos os campos obrigatórios da operação.');
      return;
    }

    setOpLoading(true);

    try {
      const normalizedOpAmount = normalizeDecimal(opAmount);
      const endpoint = `/api/projects/${activeOpProject.project.id}/${activeOpProject.type === 'deposit' ? 'deposit' : 'withdraw'}`;
      const payload = {
        amount: normalizedOpAmount,
        operation_date: opDate,
        notes: opNotes || null,
        [activeOpProject.type === 'deposit' ? 'source_account_id' : 'destination_account_id']: opAccountId
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Falha ao realizar operação na caixinha.');
      }

      // Reset operation
      setOpAmount('');
      setOpAccountId('');
      setOpNotes('');
      setActiveOpProject(null);

      setLoading(true);
      await loadData();
    } catch (err: any) {
      setOpError(err.message);
    } finally {
      setOpLoading(false);
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
    <div id="projects-view" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reservas e Projetos</h1>
          <p className="text-slate-500 text-sm">Metas de poupança (caixinhas) integradas para organizar as economias do lar.</p>
        </div>
        <button
          id="toggle-project-form-btn"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-all shadow-sm self-start"
        >
          <Plus className="w-4 h-4" />
          <span>{showForm ? 'Fechar Formulário' : 'Nova Caixinha'}</span>
        </button>
      </div>

      {/* New/Edit Project Form */}
      {showForm && (
        <form id="project-entry-form" onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {editingId ? 'Editar Meta / Caixinha' : 'Configurar Nova Meta / Caixinha'}
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
            <div id="project-form-error" className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-3.5 rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="proj-type" className="block text-xs font-medium text-slate-700 mb-1">
                Tipo do Objetivo
              </label>
              <select
                id="proj-type"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="reserve">Reserva de Segurança / Emergência</option>
                <option value="project">Projeto / Aquisição de Bem</option>
              </select>
            </div>

            <div>
              <label htmlFor="proj-name" className="block text-xs font-medium text-slate-700 mb-1">
                Nome do Objetivo / Caixinha
              </label>
              <input
                id="proj-name"
                type="text"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                placeholder="Ex: Reforma da Cozinha"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="proj-amount" className="block text-xs font-medium text-slate-700 mb-1">
                Valor Alvo Final (R$)
              </label>
              <input
                id="proj-amount"
                type="text"
                inputMode="decimal"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                placeholder="0.00"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value.replace(/[^0-9.,-]/g, ''))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="proj-deadline" className="block text-xs font-medium text-slate-700 mb-1">
                Prazo Estimado (Opcional)
              </label>
              <input
                id="proj-deadline"
                type="date"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="proj-user" className="block text-xs font-medium text-slate-700 mb-1">
                Líder / Responsável
              </label>
              <select
                id="proj-user"
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
              <label htmlFor="proj-desc" className="block text-xs font-medium text-slate-700 mb-1">
                Breve Descrição / Descritivo
              </label>
              <input
                id="proj-desc"
                type="text"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                placeholder="Ex: Aquisição de móveis e utensílios..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="proj-notes" className="block text-xs font-medium text-slate-700 mb-1">
              Notas Adicionais
            </label>
            <input
              id="proj-notes"
              type="text"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
              placeholder="Ex: Guardar preferencialmente na poupança"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {editingId ? (
              <button
                type="button"
                onClick={() => {
                  const currentProj = projects.find(p => p.id === editingId);
                  if (currentProj) setDeletingProject(currentProj);
                }}
                className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Caixinha</span>
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
                id="project-form-submit-btn"
                type="submit"
                disabled={submitLoading}
                className="px-6 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center space-x-1.5 shadow-sm"
              >
                {submitLoading ? (
                  <span>Salvando...</span>
                ) : (
                  <span>{editingId ? 'Salvar Alterações' : 'Criar Objetivo'}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Projects Grid / Empty State */}
      {projects.length === 0 ? (
        <div id="projects-empty-state" className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
          <PiggyBank className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Nenhum projeto ou caixinha ativa</h3>
          <p className="text-slate-500 text-xs mt-1.5 max-w-sm mx-auto">
            Organize suas poupanças reservando saldos das suas contas correntes diretamente para os seus sonhos do lar.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Criar Minha Primeira Caixinha
          </button>
        </div>
      ) : (
        <div id="projects-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map(proj => {
            const current = Number((proj as any).current_amount ?? 0);
            const target = Number(proj.target_amount);
            const percent = (proj as any).progress_percentage ?? 0;
            const leaderName = users.find(u => u.id === proj.responsible_user_id)?.name;

            return (
              <div key={proj.id} className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="bg-slate-100 p-2.5 rounded-xl text-slate-700 shrink-0">
                        {proj.type === 'reserve' ? <Landmark className="w-4.5 h-4.5" /> : <Target className="w-4.5 h-4.5" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-slate-900 truncate leading-snug">{proj.name}</h3>
                        <span className="text-[9px] text-slate-400 font-mono uppercase font-bold tracking-wider leading-none mt-0.5">
                          {proj.type === 'reserve' ? 'Reserva Técnica' : 'Meta Específica'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="bg-slate-100 text-slate-800 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold">
                        {percent}%
                      </span>
                      <button
                        onClick={() => handleStartEdit(proj)}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Editar caixinha"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingProject(proj)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir caixinha"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {proj.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {proj.description}
                    </p>
                  )}

                  {/* Beautiful visual progress bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          proj.type === 'reserve' ? 'bg-slate-900' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-slate-500 font-semibold">{formatCurrency(current)} acumulados</span>
                      <span className="text-slate-400">Meta: {formatCurrency(target)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3.5 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                    <span>Líder: <strong>{leaderName}</strong></span>
                    {proj.deadline && (
                      <span>Prazo: <strong>{formatDate(proj.deadline)}</strong></span>
                    )}
                  </div>

                  {/* Operation Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      id={`apport-btn-${proj.id}`}
                      onClick={() => setActiveOpProject({ project: proj, type: 'deposit' })}
                      className="py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm text-center transition-colors flex items-center justify-center space-x-1"
                    >
                      <PiggyBank className="w-3.5 h-3.5" />
                      <span>Aportar Reserva</span>
                    </button>
                    <button
                      id={`withdraw-btn-${proj.id}`}
                      onClick={() => setActiveOpProject({ project: proj, type: 'withdraw' })}
                      className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold text-center transition-colors flex items-center justify-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5 rotate-45" />
                      <span>Resgatar Dinheiro</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deposit/Withdraw operation overlay modal (Centered, beautifully scaled, fully functional) */}
      {activeOpProject && (
        <div id="op-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div id="op-modal-card" className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
            <div className={`p-5 text-white flex justify-between items-center ${
              activeOpProject.type === 'deposit' ? 'bg-slate-900' : 'bg-slate-950'
            }`}>
              <div>
                <span className="text-[10px] text-amber-400 font-mono uppercase font-bold tracking-wider">
                  {activeOpProject.type === 'deposit' ? 'Aporte de Caixinha' : 'Resgate de Caixinha'}
                </span>
                <h3 className="text-sm font-bold truncate max-w-[280px]">{activeOpProject.project.name}</h3>
              </div>
              <button 
                onClick={() => setActiveOpProject(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOperationSubmit} className="p-5 space-y-4">
              {opError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-3 rounded-xl">
                  {opError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {activeOpProject.type === 'deposit' ? 'Conta de Origem (Debitar)' : 'Conta de Destino (Creditar)'}
                </label>
                <select
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                  value={opAccountId}
                  onChange={(e) => setOpAccountId(e.target.value)}
                >
                  <option value="">Selecione a conta real...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} (Livre: {formatCurrency((acc as any).free_balance ?? acc.initial_balance)})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor Operação (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                    placeholder="0.00"
                    value={opAmount}
                    onChange={(e) => setOpAmount(e.target.value.replace(/[^0-9.,-]/g, ''))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data Operação
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                    value={opDate}
                    onChange={(e) => setOpDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nota / Justificativa (Opcional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                  placeholder="Ex: Economias da semana..."
                  value={opNotes}
                  onChange={(e) => setOpNotes(e.target.value)}
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveOpProject(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={opLoading}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center space-x-1"
                >
                  {opLoading ? (
                    <span>Processando...</span>
                  ) : (
                    <span>Confirmar {activeOpProject.type === 'deposit' ? 'Aporte' : 'Resgate'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingProject}
        title="Confirmar Exclusão de Caixinha"
        message={
          deletingProject
            ? `Tem certeza que deseja excluir a caixinha "${deletingProject.name}"? Esta ação não poderá ser desfeita.`
            : ''
        }
        isLoading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingProject(null)}
      />
    </div>
  );
}
