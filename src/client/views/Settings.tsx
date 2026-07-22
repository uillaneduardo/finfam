/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Users, Tag, Plus, Check, ShieldAlert, AlertCircle, Pencil, Trash2, Contact as ContactIcon, Phone, FileText, Bell, Smartphone, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Category, Contact, ContactType, User, UserRole, UserStatus } from '../../shared/types';
import ConfirmModal from '../components/ConfirmModal';
import { isWebPushSupported, getNotificationPermission, getPushStatus, getCurrentSubscription, enableWebPush, disableWebPush } from '../utils/webPush';

interface SettingsProps {
  currentUser: any;
}

export default function Settings({ currentUser }: SettingsProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // Web Push State
  const [pushSupported, setPushSupported] = useState<boolean>(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [pushIsSubscribed, setPushIsSubscribed] = useState<boolean>(false);
  const [pushDevicesCount, setPushDevicesCount] = useState<number>(0);
  const [pushServerConfigured, setPushServerConfigured] = useState<boolean>(true);
  const [pushActionLoading, setPushActionLoading] = useState<boolean>(false);
  const [pushFeedback, setPushFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const loadPushState = async () => {
    const supported = isWebPushSupported();
    setPushSupported(supported);
    if (!supported) {
      setPushPermission('unsupported');
      return;
    }

    const perm = getNotificationPermission();
    setPushPermission(perm);

    const [statusData, sub] = await Promise.all([
      getPushStatus(),
      getCurrentSubscription()
    ]);

    setPushServerConfigured(statusData.configured);
    setPushDevicesCount(statusData.subscribedDevices);
    setPushIsSubscribed(!!sub);
  };

  
  // Category Form & Edit State
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'income' | 'expense'>('expense');
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);
  const [deleteCatLoading, setDeleteCatLoading] = useState(false);

  // Contact Form & Edit State
  const [contactName, setContactName] = useState('');
  const [contactType, setContactType] = useState<ContactType>(ContactType.PERSON);
  const [contactPhone, setContactPhone] = useState('');
  const [contactDoc, setContactDoc] = useState('');
  const [contactPix, setContactPix] = useState('');
  const [contactNotes, setContactNotes] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [editingContactId, setEditingContactId] = useState<number | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [deleteContactLoading, setDeleteContactLoading] = useState(false);

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
      const [cats, usrs, cnts] = await Promise.all([
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/users').then(r => r.json()),
        fetch('/api/contacts').then(r => r.json())
      ]);

      setCategories(cats || []);
      setMembers(usrs || []);
      setContacts(cnts || []);
    } catch (err) {
      console.error('Error loading settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
    loadPushState();
  }, []);

  const handleToggleWebPush = async () => {
    setPushFeedback(null);
    setPushActionLoading(true);

    try {
      if (pushIsSubscribed) {
        await disableWebPush();
        setPushFeedback({ type: 'info', text: 'Notificações Web Push desativadas para este aparelho.' });
      } else {
        await enableWebPush();
        setPushFeedback({ type: 'success', text: 'Notificações Web Push ativadas com sucesso neste aparelho!' });
      }
      await loadPushState();
    } catch (err: any) {
      setPushFeedback({ type: 'error', text: err.message || 'Erro ao alterar estado das notificações Web Push.' });
      await loadPushState();
    } finally {
      setPushActionLoading(false);
    }
  };


  const resetCatForm = () => {
    setEditingCatId(null);
    setCatName('');
    setCatType('expense');
    setCatError(null);
  };

  const handleStartEditCat = (c: Category) => {
    setEditingCatId(c.id);
    setCatName(c.name);
    setCatType(c.type as 'income' | 'expense');
    setCatError(null);
  };

  const handleCategorySave = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError(null);

    if (!catName || !catType) {
      setCatError('O nome da categoria é obrigatório.');
      return;
    }

    setCatLoading(true);

    try {
      if (editingCatId) {
        const res = await fetch(`/api/categories/${editingCatId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: catName, type: catType })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Falha ao atualizar categoria.');
        }
      } else {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: catName, type: catType })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Falha ao salvar categoria.');
        }
      }

      resetCatForm();
      await loadSettingsData();
    } catch (err: any) {
      setCatError(err.message);
    } finally {
      setCatLoading(false);
    }
  };

  const handleConfirmDeleteCat = async () => {
    if (!deletingCat) return;
    setDeleteCatLoading(true);

    try {
      const res = await fetch(`/api/categories/${deletingCat.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Falha ao excluir categoria.');
      }

      setDeletingCat(null);
      if (editingCatId === deletingCat.id) {
        resetCatForm();
      }

      await loadSettingsData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir categoria.');
    } finally {
      setDeleteCatLoading(false);
    }
  };

  const resetContactForm = () => {
    setEditingContactId(null);
    setContactName('');
    setContactType(ContactType.PERSON);
    setContactPhone('');
    setContactDoc('');
    setContactPix('');
    setContactNotes('');
    setContactError(null);
  };

  const handleStartEditContact = (c: Contact) => {
    setEditingContactId(c.id);
    setContactName(c.name);
    setContactType(c.type || ContactType.PERSON);
    setContactPhone(c.phone || '');
    setContactDoc(c.document_number || '');
    setContactPix(c.pix_key || '');
    setContactNotes(c.notes || '');
    setContactError(null);
  };

  const handleContactSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);

    if (!contactName) {
      setContactError('O nome do contato é obrigatório.');
      return;
    }

    setContactLoading(true);

    try {
      const payload = {
        name: contactName,
        type: contactType,
        phone: contactPhone || null,
        document_number: contactDoc || null,
        pix_key: contactPix || null,
        notes: contactNotes || null
      };

      if (editingContactId) {
        const res = await fetch(`/api/contacts/${editingContactId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Falha ao atualizar contato.');
        }
      } else {
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Falha ao cadastrar contato.');
        }
      }

      resetContactForm();
      await loadSettingsData();
    } catch (err: any) {
      setContactError(err.message);
    } finally {
      setContactLoading(false);
    }
  };

  const handleConfirmDeleteContact = async () => {
    if (!deletingContact) return;
    setDeleteContactLoading(true);

    try {
      const res = await fetch(`/api/contacts/${deletingContact.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Falha ao excluir contato.');
      }

      setDeletingContact(null);
      if (editingContactId === deletingContact.id) {
        resetContactForm();
      }

      await loadSettingsData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir contato.');
    } finally {
      setDeleteContactLoading(false);
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

          <form onSubmit={handleCategorySave} className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {editingCatId ? 'Editar Categoria' : 'Nova Categoria'}
              </span>
              {editingCatId && (
                <button
                  type="button"
                  onClick={resetCatForm}
                  className="text-xs text-slate-500 hover:text-slate-700 underline font-medium"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

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

            <div className="flex items-center space-x-2">
              {editingCatId && (
                <button
                  type="button"
                  onClick={resetCatForm}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={catLoading}
                className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-850 disabled:opacity-50 flex items-center justify-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>{editingCatId ? 'Salvar Alterações' : 'Adicionar Categoria'}</span>
              </button>
            </div>
          </form>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {categories.map(c => (
              <div key={c.id} className="flex justify-between items-center p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors">
                <span className="text-xs font-bold text-slate-900">{c.name}</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold font-mono uppercase ${
                    c.type === 'income' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                  }`}>
                    {c.type === 'income' ? 'Entrada' : 'Saída'}
                  </span>
                  <button
                    onClick={() => handleStartEditCat(c)}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Editar categoria"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingCat(c)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Excluir categoria"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
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

      {/* Contatos e Fornecedores Configuration */}
      <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <ContactIcon className="w-5 h-5 text-slate-800" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Contatos e Fornecedores</h2>
        </div>

        <form onSubmit={handleContactSave} className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {editingContactId ? 'Editar Contato' : 'Novo Contato / Fornecedor'}
            </span>
            {editingContactId && (
              <button
                type="button"
                onClick={resetContactForm}
                className="text-xs text-slate-500 hover:text-slate-700 underline font-medium"
              >
                Cancelar Edição
              </button>
            )}
          </div>

          {contactError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-3 rounded-xl">
              {contactError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome / Razão Social</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                placeholder="Ex: Mercado Central"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Contato</label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                value={contactType}
                onChange={(e) => setContactType(e.target.value as ContactType)}
              >
                <option value={ContactType.PERSON}>Pessoa Física</option>
                <option value={ContactType.COMPANY}>Empresa / PJ</option>
                <option value={ContactType.SUPPLIER}>Fornecedor</option>
                <option value={ContactType.CLIENT}>Cliente</option>
                <option value={ContactType.BANK}>Instituição Financeira</option>
                <option value={ContactType.OTHER}>Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                placeholder="(11) 99999-9999"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">CPF / CNPJ</label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                placeholder="000.000.000-00"
                value={contactDoc}
                onChange={(e) => setContactDoc(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chave PIX</label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none"
                placeholder="E-mail, CPF, telefone ou chave aleatória"
                value={contactPix}
                onChange={(e) => setContactPix(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {editingContactId && (
              <button
                type="button"
                onClick={resetContactForm}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={contactLoading}
              className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-850 disabled:opacity-50 flex items-center justify-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>{editingContactId ? 'Salvar Alterações' : 'Adicionar Contato'}</span>
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
          {contacts.map(c => (
            <div key={c.id} className="flex justify-between items-center p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{c.name}</h4>
                  <span className="bg-slate-100 text-slate-700 text-[8px] px-1.5 py-0.5 rounded font-mono uppercase font-bold">
                    {c.type}
                  </span>
                </div>
                {c.phone && <p className="text-[10px] text-slate-500 font-mono">Tel: {c.phone}</p>}
                {c.pix_key && <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">PIX: {c.pix_key}</p>}
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                <button
                  onClick={() => handleStartEditContact(c)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Editar contato"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeletingContact(c)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Excluir contato"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seção de Notificações Web Push neste Aparelho */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
          <Bell className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900">Notificações neste Aparelho (Web Push)</h3>
        </div>

        {!pushSupported ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2 text-amber-900 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Este navegador ou sistema operacional não possui suporte a notificações Web Push.</span>
          </div>
        ) : !pushServerConfigured ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2 text-amber-900 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>O serviço de Web Push não está configurado no servidor (chaves VAPID ausentes). Defina as variáveis de ambiente no servidor.</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-white border border-slate-200 shrink-0">
                  <Smartphone className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">Status no Aparelho</span>
                    {pushIsSubscribed ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Ativo neste dispositivo</span>
                      </span>
                    ) : pushPermission === 'denied' ? (
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        <span>Bloqueado no navegador</span>
                      </span>
                    ) : (
                      <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Inativo neste dispositivo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {pushIsSubscribed
                      ? 'Você receberá alertas na barra do seu sistema mesmo se o navegador estiver fechado.'
                      : pushPermission === 'denied'
                      ? 'Para ativar, você precisará liberar as notificações nas permissões do site no seu navegador.'
                      : 'Ative para receber avisos sobre movimentações e contas da família diretamente na barra do seu celular/computador.'}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 mt-1">
                    Dispositivos da sua conta inscritos em Web Push: <strong className="text-slate-700">{pushDevicesCount}</strong>
                  </p>
                </div>
              </div>

              <div className="shrink-0 self-start sm:self-center">
                <button
                  type="button"
                  onClick={handleToggleWebPush}
                  disabled={pushActionLoading || pushPermission === 'denied'}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-xs ${
                    pushIsSubscribed
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50'
                  }`}
                >
                  {pushActionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : pushIsSubscribed ? (
                    <span>Desativar neste aparelho</span>
                  ) : (
                    <span>Ativar notificações neste aparelho</span>
                  )}
                </button>
              </div>
            </div>

            {pushFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                  pushFeedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : pushFeedback.type === 'error'
                    ? 'bg-rose-50 border border-rose-200 text-rose-900'
                    : 'bg-blue-50 border border-blue-200 text-blue-900'
                }`}
              >
                {pushFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{pushFeedback.text}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal

        isOpen={!!deletingCat}
        title="Confirmar Exclusão de Categoria"
        message={
          deletingCat
            ? `Tem certeza que deseja excluir a categoria "${deletingCat.name}"? Esta ação não poderá ser desfeita.`
            : ''
        }
        isLoading={deleteCatLoading}
        onConfirm={handleConfirmDeleteCat}
        onClose={() => setDeletingCat(null)}
      />

      <ConfirmModal
        isOpen={!!deletingContact}
        title="Confirmar Exclusão de Contato"
        message={
          deletingContact
            ? `Tem certeza que deseja excluir o contato "${deletingContact.name}"? Esta ação não poderá ser desfeita.`
            : ''
        }
        isLoading={deleteContactLoading}
        onConfirm={handleConfirmDeleteContact}
        onClose={() => setDeletingContact(null)}
      />
    </div>
  );
}
