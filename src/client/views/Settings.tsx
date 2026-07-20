/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Users, Tag, Plus, Check, ShieldAlert, AlertCircle } from 'lucide-react';
import { Category, User, UserRole, UserStatus } from '../../shared/types';

interface SettingsProps {
  currentUser: any;
}

export default function Settings({ currentUser }: SettingsProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Category Form State
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'income' | 'expense'>('expense');
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  // Member Form State
  const [memberName, setMemberName] = useState('');
  const [memberUsername, setMemberUsername] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberRole, setMemberRole] = useState<UserRole>(UserRole.MEMBER);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  const isAdmin = currentUser.role === UserRole.ADMIN;

  const loadSettingsData = async () => {
    try {
      const [cats, usrs] = await Promise.all([
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/users').then(r => r.json())
      ]);

      setCategories(cats || []);
      setMembers(usrs || []);
    } catch (err) {
      console.error('Error loading settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const handleCategoryCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError(null);

    if (!catName || !catType) {
      setCatError('O nome da categoria é obrigatório.');
      return;
    }

    setCatLoading(true);

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName, type: catType })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Falha ao salvar categoria.');
      }

      setCatName('');
      await loadSettingsData();
    } catch (err: any) {
      setCatError(err.message);
    } finally {
      setCatLoading(false);
    }
  };

  const handleMemberCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError(null);

    if (!memberName || !memberUsername || !memberPassword || !memberRole) {
      setMemberError('Todos os campos são obrigatórios para cadastro.');
      return;
    }

    setMemberLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: memberName,
          username: memberUsername,
          password: memberPassword,
          role: memberRole
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Falha ao cadastrar membro.');
      }

      setMemberName('');
      setMemberUsername('');
      setMemberPassword('');
      setMemberRole(UserRole.MEMBER);
      await loadSettingsData();
    } catch (err: any) {
      setMemberError(err.message);
    } finally {
      setMemberLoading(false);
    }
  };

  const toggleMemberStatus = async (user: User) => {
    if (user.id === currentUser.userId) {
      alert('Você não pode desativar a si mesmo por segurança.');
      return;
    }

    const newStatus = user.status === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;
    
    try {
      const res = await fetch(`/api/users/${user.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Falha ao atualizar status.');
      }

      await loadSettingsData();
    } catch (err: any) {
      alert(err.message);
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
    <div id="settings-view" className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configurações Gerais</h1>
        <p className="text-slate-500 text-sm">Controle de categorias e gestão de membros da família.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Categorias Configuration */}
        <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Tag className="w-5 h-5 text-slate-800" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Categorias de Lançamentos</h2>
          </div>

          <form onSubmit={handleCategoryCreate} className="space-y-4">
            {catError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-3 rounded-xl">
                {catError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome da Categoria</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                  placeholder="Ex: Combustível"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Fluxo</label>
                <select
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                  value={catType}
                  onChange={(e) => setCatType(e.target.value as any)}
                >
                  <option value="expense">Despesa (Saída)</option>
                  <option value="income">Receita (Entrada)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={catLoading}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-850 disabled:opacity-50 flex items-center justify-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Categoria</span>
            </button>
          </form>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {categories.map(c => (
              <div key={c.id} className="flex justify-between items-center p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors">
                <span className="text-xs font-bold text-slate-900">{c.name}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold font-mono uppercase ${
                  c.type === 'income' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                }`}>
                  {c.type === 'income' ? 'Entrada' : 'Saída'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Gestão de Membros (Membros da Família) */}
        <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Users className="w-5 h-5 text-slate-800" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Membros do Lar (Família)</h2>
          </div>

          {isAdmin ? (
            <form onSubmit={handleMemberCreate} className="space-y-4">
              {memberError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-3 rounded-xl">
                  {memberError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                    placeholder="Ex: Mariana Silva"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Usuário (Login)</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                    placeholder="mariana"
                    value={memberUsername}
                    onChange={(e) => setMemberUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Senha Provisória</label>
                  <input
                    type="password"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                    placeholder="••••••••"
                    value={memberPassword}
                    onChange={(e) => setMemberPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Papel Administrativo</label>
                  <select
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value as UserRole)}
                  >
                    <option value={UserRole.MEMBER}>Membro Padrão (Mariana)</option>
                    <option value={UserRole.ADMIN}>Administrador (Carlos)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={memberLoading}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-850 disabled:opacity-50 flex items-center justify-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Membro</span>
              </button>
            </form>
          ) : (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start space-x-2.5 text-amber-850 text-xs">
              <ShieldAlert className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Painel Restrito:</strong> Apenas administradores do lar (como Carlos Silva) possuem permissão para cadastrar novos membros ou alterar estados de acesso.
              </p>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-3">
            {members.map(user => (
              <div key={user.id} className="flex justify-between items-center p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-bold text-slate-900 truncate leading-none">{user.name}</h4>
                    <span className="bg-slate-100 text-slate-800 text-[8px] px-1.5 py-0.5 rounded font-mono uppercase font-bold">
                      {user.role}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">Usuário: @{user.username}</span>
                </div>

                {isAdmin ? (
                  <button
                    onClick={() => toggleMemberStatus(user)}
                    disabled={user.id === currentUser.userId}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      user.id === currentUser.userId
                        ? 'opacity-40 bg-emerald-50 text-emerald-800 cursor-not-allowed border-transparent'
                        : user.status === UserStatus.ACTIVE
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    {user.status === UserStatus.ACTIVE ? 'Ativo' : 'Inativo'}
                  </button>
                ) : (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-xl font-mono ${
                    user.status === UserStatus.ACTIVE ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-50'
                  }`}>
                    {user.status === UserStatus.ACTIVE ? 'Ativo' : 'Inativo'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
