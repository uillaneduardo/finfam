/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Sparkles } from 'lucide-react';

interface FirstUseProps {
  onSetupSuccess: () => void;
}

export default function FirstUse({ onSetupSuccess }: FirstUseProps) {
  const [familyName, setFamilyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!familyName || !adminName || !adminUsername || !adminPassword || !confirmPassword) {
      setError('Por favor, preencha todos os campos do formulário.');
      return;
    }

    if (adminPassword !== confirmPassword) {
      setError('A senha informada e a confirmação não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/first-use-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyName,
          adminName,
          adminUsername,
          adminPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Falha ao realizar a configuração inicial.');
      }

      onSetupSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="first-use-container" className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div id="first-use-card" className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 text-white p-8 text-center relative">
          <div className="absolute top-4 right-4 flex items-center space-x-1 text-slate-400 text-xs font-mono">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Configuração Segura</span>
          </div>
          <Sparkles className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h1 className="text-2xl font-bold font-sans tracking-tight">Bem-vindo ao FinFam!</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-md mx-auto">
            Configuração inicial da sua plataforma de finanças familiares compartilhadas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div id="setup-error-alert" className="bg-rose-50 border border-rose-100 text-rose-700 text-sm p-4 rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              1. Identidade do Lar
            </h2>
            <div>
              <label htmlFor="familyName" className="block text-xs font-medium text-slate-700 mb-1">
                Nome da Família (Ex: Família Silva)
              </label>
              <input
                id="familyName"
                type="text"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                placeholder="Ex: Família Silva"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              2. Conta do Administrador
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="adminName" className="block text-xs font-medium text-slate-700 mb-1">
                  Seu Nome Completo
                </label>
                <input
                  id="adminName"
                  type="text"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  placeholder="Ex: Carlos Silva"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="adminUsername" className="block text-xs font-medium text-slate-700 mb-1">
                  Nome de Usuário (Login)
                </label>
                <input
                  id="adminUsername"
                  type="text"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  placeholder="Ex: carlos"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="adminPassword" className="block text-xs font-medium text-slate-700 mb-1">
                  Senha Forte (mínimo 8 caracteres)
                </label>
                <input
                  id="adminPassword"
                  type="password"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-medium text-slate-700 mb-1">
                  Confirmar Senha
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-mono">
              Requisitos de senha: mínimo 8 caracteres, contendo 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial (ex: @, #, $).
            </p>
          </div>

          <button
            id="setup-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Processando Configuração...</span>
              </>
            ) : (
              <span>Finalizar e Configurar Meu Lar</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
