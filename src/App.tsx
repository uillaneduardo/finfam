/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { LayoutDashboard, Receipt, CalendarClock, Wallet, Target, Settings as SettingsIcon, LogOut, Shield, Heart } from 'lucide-react';

import FirstUse from './client/views/FirstUse';
import Login from './client/views/Login';
import Dashboard from './client/views/Dashboard';
import Transactions from './client/views/Transactions';
import Commitments from './client/views/Commitments';
import Accounts from './client/views/Accounts';
import Projects from './client/views/Projects';
import Settings from './client/views/Settings';
import NotificationCenter from './client/components/NotificationCenter';
import PwaInstallPrompt from './client/components/PwaInstallPrompt';

export default function App() {
  const [firstUseRequired, setFirstUseRequired] = useState<boolean | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    try {
      // 1. Check if first use setup is required
      const firstUseRes = await fetch('/api/auth/first-use-check');
      const firstUseData = await firstUseRes.json();
      setFirstUseRequired(firstUseData.firstUseRequired);

      if (firstUseData.firstUseRequired) {
        setLoading(false);
        return;
      }

      // 2. Check active user session
      const authRes = await fetch('/api/auth/me');
      if (authRes.ok) {
        const authData = await authRes.json();
        setUser(authData.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error verifying system configuration and session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogout = async () => {
    if (!confirm('Deseja realmente sair do painel da família?')) return;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (loading) {
    return (
      <div id="root-loading" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <svg className="animate-spin h-10 w-10 text-slate-950 mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider font-mono">Carregando FinFam...</span>
      </div>
    );
  }

  // 1. Initial setup required (First Use)
  if (firstUseRequired) {
    return <FirstUse onSetupSuccess={checkAuth} />;
  }

  // 2. Unauthenticated state (Login)
  if (!user) {
    return <Login onLoginSuccess={checkAuth} />;
  }

  // Helper to render active tab view
  const renderTabView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user} onNavigate={setActiveTab} />;
      case 'transactions':
        return <Transactions />;
      case 'commitments':
        return <Commitments />;
      case 'accounts':
        return <Accounts />;
      case 'projects':
        return <Projects />;
      case 'settings':
        return <Settings currentUser={user} />;
      default:
        return <Dashboard user={user} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div id="finfam-app-shell" className="min-h-screen bg-slate-50 flex flex-col">
      {/* Premium Navigation Topbar Header */}
      <header id="main-header" className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-amber-400 rounded-xl flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight font-sans leading-tight">FinFam</h1>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Família Conectada</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <PwaInstallPrompt />
            <NotificationCenter />

            <div className="text-right hidden sm:block border-l border-slate-800 pl-3">
              <span className="text-xs font-bold block">{user.name}</span>
              <span className="text-[10px] text-amber-400 font-mono capitalize">{user.role}</span>
            </div>
            
            <button
              id="logout-header-btn"
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              title="Encerrar Sessão"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        {/* Sidebar Responsive Menu */}
        <aside id="main-sidebar" className="w-full md:w-64 shrink-0 bg-white border border-slate-200/50 rounded-2xl p-4 h-fit space-y-2 shadow-sm">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'dashboard' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Painel Visão Geral</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'transactions' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-4 h-4 shrink-0" />
            <span>Lançamentos</span>
          </button>

          <button
            onClick={() => setActiveTab('commitments')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'commitments' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarClock className="w-4 h-4 shrink-0" />
            <span>Compromissos</span>
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'accounts' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Wallet className="w-4 h-4 shrink-0" />
            <span>Contas Financeiras</span>
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'projects' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Target className="w-4 h-4 shrink-0" />
            <span>Reservas / Caixinhas</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'settings' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <SettingsIcon className="w-4 h-4 shrink-0" />
            <span>Configurações</span>
          </button>
        </aside>

        {/* Content Dynamic Workspace Stage */}
        <main id="main-content-stage" className="flex-1 min-w-0">
          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm min-h-[500px]">
            {renderTabView()}
          </div>
        </main>
      </div>

      {/* Footer Signature */}
      <footer id="main-footer" className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-center text-xs font-mono">
        <p className="flex items-center justify-center space-x-1">
          <span>FinFam © {new Date().getFullYear()} — Criado com</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>para finanças familiares integradas.</span>
        </p>
      </footer>
    </div>
  );
}
