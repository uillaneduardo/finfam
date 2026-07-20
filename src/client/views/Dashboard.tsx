/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Wallet, ShieldAlert, Sparkles, TrendingUp, AlertCircle, Bookmark } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/format';
import { Account, Transaction, Commitment, Project } from '../../shared/types';

interface DashboardProps {
  user: any;
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ user, onNavigate }: DashboardProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [accountsRes, transactionsRes, commitmentsRes, projectsRes] = await Promise.all([
          fetch('/api/accounts').then(r => r.json()),
          fetch('/api/transactions').then(r => r.json()),
          fetch('/api/commitments').then(r => r.json()),
          fetch('/api/projects').then(r => r.json())
        ]);

        setAccounts(accountsRes || []);
        setTransactions(transactionsRes || []);
        setCommitments(commitmentsRes || []);
        setProjects(projectsRes || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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

  // Calculate Consolidated Balances
  // Nominal balance = Sum of all accounts nominal_balance or initial_balance
  const totalNominal = accounts.reduce((acc, curr: any) => acc + (Number(curr.nominal_balance ?? curr.initial_balance)), 0);
  // Reserved balance = Sum of all account reserved balances
  const totalReserved = accounts.reduce((acc, curr: any) => acc + (Number(curr.reserved_balance ?? 0)), 0);
  // Free balance = totalNominal - totalReserved
  const totalFree = totalNominal - totalReserved;

  // Count Overdue Commitments
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueCount = commitments.filter(c => c.status === 'pending' && c.due_date < todayStr).length;

  return (
    <div id="dashboard-view" className="space-y-6">
      <div id="dashboard-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Olá, {user.name}!</h1>
          <p className="text-slate-500 text-sm">Resumo financeiro e atividades da sua família.</p>
        </div>
        <div className="bg-emerald-50 text-emerald-800 text-xs px-3 py-1.5 rounded-full border border-emerald-100 flex items-center space-x-1 self-start font-mono font-medium">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
          <span>Sincronizado</span>
        </div>
      </div>

      {/* Dynamic Consolidated Balance Cards */}
      <div id="dashboard-balance-cards" className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/5 rounded-full"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Saldo Livre Consolidado</p>
              <h3 className="text-2xl font-bold mt-2 font-sans">{formatCurrency(totalFree)}</h3>
            </div>
            <span className="bg-emerald-500/15 text-emerald-400 p-2 rounded-xl text-xs font-mono font-bold border border-emerald-500/20">
              Disponível
            </span>
          </div>
          <p className="text-slate-400 text-[11px] mt-4 font-mono">
            Valor livre para despesas ordinárias do lar.
          </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Saldo Reservado (Caixinhas)</p>
              <h3 className="text-2xl font-bold mt-2 text-slate-900 font-sans">{formatCurrency(totalReserved)}</h3>
            </div>
            <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl">
              <Bookmark className="w-5 h-5" />
            </div>
          </div>
          <p className="text-slate-500 text-[11px] mt-4 font-mono">
            Dinheiro alocado em metas e reserva de emergência.
          </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Saldo Nominal Bruto</p>
              <h3 className="text-2xl font-bold mt-2 text-slate-900 font-sans">{formatCurrency(totalNominal)}</h3>
            </div>
            <div className="bg-slate-50 text-slate-600 p-2.5 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-slate-500 text-[11px] mt-4 font-mono">
            Soma bruta total sob custódia da família.
          </p>
        </div>
      </div>

      {/* Attention / Alerts Center */}
      {overdueCount > 0 && (
        <div id="overdue-alerts-banner" className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start space-x-3 text-rose-800">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold">Atenção:</span> Existem <strong className="font-bold underline">{overdueCount} compromissos vencidos</strong> aguardando quitação.
            <button 
              onClick={() => onNavigate('commitments')}
              className="ml-2 font-bold underline hover:text-rose-950 transition-colors text-xs uppercase font-mono block sm:inline mt-1 sm:mt-0"
            >
              Ver e Quitar Agora &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Accounts & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Real-time Accounts Status */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            Contas Financeiras
          </h2>
          
          {accounts.length === 0 ? (
            <div className="text-center py-6">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Nenhuma conta ativa.</p>
              <button 
                onClick={() => onNavigate('accounts')}
                className="mt-2 text-xs font-semibold text-slate-950 underline"
              >
                Cadastrar Conta
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.slice(0, 4).map(account => (
                <div key={account.id} className="flex justify-between items-center p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 leading-tight">{account.name}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">{account.institution}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 block">{formatCurrency((account as any).free_balance ?? account.initial_balance)}</span>
                    <span className="text-[9px] text-slate-500 font-mono">Saldo Livre</span>
                  </div>
                </div>
              ))}
              {accounts.length > 4 && (
                <button 
                  onClick={() => onNavigate('accounts')}
                  className="w-full text-center text-xs font-semibold text-slate-600 pt-2 border-t border-slate-100 hover:text-slate-900 transition-colors"
                >
                  Ver todas as {accounts.length} contas &rarr;
                </button>
              )}
            </div>
          )}
        </div>

        {/* Recent Transactions List */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Últimas Atividades
            </h2>
            <button 
              onClick={() => onNavigate('transactions')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Ver Todas
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-10">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Nenhum lançamento financeiro registrado ainda.</p>
              <button 
                onClick={() => onNavigate('transactions')}
                className="mt-3 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-medium hover:bg-slate-800 transition-colors"
              >
                Registrar Primeiro Lançamento
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.slice(0, 5).map(tx => (
                <div key={tx.id} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      tx.type === 'income' ? 'bg-emerald-500' : tx.type === 'expense' ? 'bg-rose-500' : 'bg-slate-400'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate leading-snug">{tx.description}</p>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        {formatDate(tx.transaction_date)} • {tx.type === 'income' ? 'Entrada' : tx.type === 'expense' ? 'Saída' : 'Transferência'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-bold font-mono ${
                      tx.type === 'income' ? 'text-emerald-600' : tx.type === 'expense' ? 'text-rose-600' : 'text-slate-600'
                    }`}>
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''} {formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
