/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Plus, 
  Pencil, 
  Trash2,
  DollarSign,
  User as UserIcon
} from 'lucide-react';
import { Commitment, User, Account } from '../../shared/types';
import { formatCurrency, formatDate } from '../utils/format';

interface CommitmentCalendarProps {
  commitments: Commitment[];
  users: User[];
  accounts: Account[];
  onPay: (commitment: Commitment) => void;
  onEdit: (commitment: Commitment) => void;
  onDelete: (commitment: Commitment) => void;
  onNewForDate: (dateStr: string) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function CommitmentCalendar({
  commitments,
  users,
  accounts,
  onPay,
  onEdit,
  onDelete,
  onNewForDate,
}: CommitmentCalendarProps) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Current calendar view month and year
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth()); // 0-indexed

  // Selected day for detailed view (YYYY-MM-DD)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  // Filter state inside calendar
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'to_pay' | 'to_receive'>('all');

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDateStr(todayStr);
  };

  // Group commitments by YYYY-MM-DD
  const commitmentsByDate = useMemo(() => {
    const map = new Map<string, Commitment[]>();

    commitments.forEach(comm => {
      // Status filter
      const isOverdue = comm.status === 'pending' && comm.due_date < todayStr;
      if (statusFilter === 'pending' && (comm.status !== 'pending' || isOverdue)) return;
      if (statusFilter === 'paid' && comm.status !== 'paid') return;
      if (statusFilter === 'overdue' && !isOverdue) return;

      // Type filter
      if (typeFilter !== 'all' && comm.type !== typeFilter) return;

      const dateStr = String(comm.due_date).substring(0, 10);
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(comm);
    });

    return map;
  }, [commitments, todayStr, statusFilter, typeFilter]);

  // Calendar Days calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDayNumber = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, prevDayNumber);
      // Local ISO string date formatting YYYY-MM-DD
      const year = prevDate.getFullYear();
      const month = String(prevDate.getMonth() + 1).padStart(2, '0');
      const day = String(prevDayNumber).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      days.push({
        dateStr,
        dayNumber: prevDayNumber,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let dayNumber = 1; dayNumber <= totalDaysInMonth; dayNumber++) {
      const month = String(currentMonth + 1).padStart(2, '0');
      const day = String(dayNumber).padStart(2, '0');
      const dateStr = `${currentYear}-${month}-${day}`;

      days.push({
        dateStr,
        dayNumber,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month padding days to reach full grid of weeks (35 or 42 days)
    const remainingDays = (7 - (days.length % 7)) % 7;
    for (let dayNumber = 1; dayNumber <= remainingDays; dayNumber++) {
      const nextDate = new Date(currentYear, currentMonth + 1, dayNumber);
      const year = nextDate.getFullYear();
      const month = String(nextDate.getMonth() + 1).padStart(2, '0');
      const day = String(dayNumber).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      days.push({
        dateStr,
        dayNumber,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [currentYear, currentMonth, todayStr]);

  // Monthly Metrics for current month view
  const monthMetrics = useMemo(() => {
    let totalToPay = 0;
    let totalToReceive = 0;
    let totalPaid = 0;
    let totalOverdue = 0;
    let countInMonth = 0;

    commitments.forEach(comm => {
      const dateStr = String(comm.due_date).substring(0, 10);
      const [y, m] = dateStr.split('-').map(Number);

      if (y === currentYear && m === currentMonth + 1) {
        countInMonth++;
        const amount = Number(comm.estimated_amount) || 0;
        const isOverdue = comm.status === 'pending' && dateStr < todayStr;

        if (comm.status === 'paid') {
          totalPaid += Number(comm.actual_amount) || amount;
        } else if (isOverdue) {
          totalOverdue += amount;
        } else if (comm.type === 'to_pay') {
          totalToPay += amount;
        } else if (comm.type === 'to_receive') {
          totalToReceive += amount;
        }
      }
    });

    return { totalToPay, totalToReceive, totalPaid, totalOverdue, countInMonth };
  }, [commitments, currentYear, currentMonth, todayStr]);

  // Commitments for selected date
  const selectedDayCommitments = useMemo(() => {
    return commitmentsByDate.get(selectedDateStr) || [];
  }, [commitmentsByDate, selectedDateStr]);

  return (
    <div id="commitment-calendar-wrapper" className="space-y-6">
      {/* Month Navigation & Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-sm">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                <span>{MONTH_NAMES[currentMonth]} {currentYear}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {monthMetrics.countInMonth} {monthMetrics.countInMonth === 1 ? 'compromisso programado' : 'compromissos programados'} neste mês
              </p>
            </div>
          </div>

          {/* Month Stepper Controls */}
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              onClick={handlePrevMonth}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-slate-700"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoToToday}
              className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-slate-700"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Month Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100">
          <div className="bg-amber-50/70 border border-amber-100/80 rounded-xl p-3">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block font-mono">A Pagar Pendente</span>
            <span className="text-xs sm:text-sm font-extrabold text-amber-950 font-mono mt-0.5 block">
              {formatCurrency(monthMetrics.totalToPay)}
            </span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-xl p-3">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block font-mono">Total Liquidado</span>
            <span className="text-xs sm:text-sm font-extrabold text-emerald-950 font-mono mt-0.5 block">
              {formatCurrency(monthMetrics.totalPaid)}
            </span>
          </div>

          <div className="bg-rose-50/70 border border-rose-100/80 rounded-xl p-3">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block font-mono">Em Atraso</span>
            <span className="text-xs sm:text-sm font-extrabold text-rose-950 font-mono mt-0.5 block">
              {formatCurrency(monthMetrics.totalOverdue)}
            </span>
          </div>

          <div className="bg-sky-50/70 border border-sky-100/80 rounded-xl p-3">
            <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block font-mono">A Receber</span>
            <span className="text-xs sm:text-sm font-extrabold text-sky-950 font-mono mt-0.5 block">
              {formatCurrency(monthMetrics.totalToReceive)}
            </span>
          </div>
        </div>

        {/* Filters bar inside calendar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 font-medium mr-1">Status:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setStatusFilter('overdue')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'overdue' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              Atrasados
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'paid' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Liquidados
            </button>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 font-medium mr-1">Tipo:</span>
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                typeFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Geral
            </button>
            <button
              onClick={() => setTypeFilter('to_pay')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                typeFilter === 'to_pay' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              A Pagar
            </button>
            <button
              onClick={() => setTypeFilter('to_receive')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                typeFilter === 'to_receive' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              A Receber
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Weekday Labels Header */}
        <div className="grid grid-cols-7 border-b border-slate-200/80 bg-slate-50 text-center text-xs font-bold text-slate-600 uppercase tracking-wider py-2.5">
          {WEEKDAYS.map((wd, idx) => (
            <div key={wd} className={idx === 0 || idx === 6 ? 'text-slate-400' : 'text-slate-700'}>
              {wd}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-100/40">
          {calendarDays.map(day => {
            const dayComms = commitmentsByDate.get(day.dateStr) || [];
            const isSelected = selectedDateStr === day.dateStr;

            // Check if day has overdue or pending items for quick indicators
            const hasOverdue = dayComms.some(c => c.status === 'pending' && day.dateStr < todayStr);
            const hasPending = dayComms.some(c => c.status === 'pending' && day.dateStr >= todayStr);
            const allPaid = dayComms.length > 0 && dayComms.every(c => c.status === 'paid');

            return (
              <div
                key={day.dateStr}
                onClick={() => setSelectedDateStr(day.dateStr)}
                className={`min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 cursor-pointer transition-all flex flex-col justify-between ${
                  !day.isCurrentMonth ? 'bg-slate-50/60 opacity-50' : 'bg-white'
                } ${
                  isSelected ? 'ring-2 ring-slate-900 ring-inset bg-slate-50/80 z-10' : 'hover:bg-slate-50/90'
                }`}
              >
                {/* Cell Header: Day Number + Status Badge */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-extrabold w-6 h-6 flex items-center justify-center rounded-full font-mono ${
                      day.isToday
                        ? 'bg-slate-900 text-white shadow-sm'
                        : isSelected
                          ? 'bg-slate-200 text-slate-900'
                          : day.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  {dayComms.length > 0 && (
                    <span
                      className={`text-[9px] font-extrabold font-mono px-1.5 py-0.5 rounded-full ${
                        hasOverdue
                          ? 'bg-rose-100 text-rose-800 animate-pulse'
                          : hasPending
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {dayComms.length} {dayComms.length === 1 ? 'item' : 'itens'}
                    </span>
                  )}
                </div>

                {/* List of up to 2 commitments in cell */}
                <div className="space-y-1 flex-1 overflow-hidden">
                  {dayComms.slice(0, 2).map(comm => {
                    const isCommOverdue = comm.status === 'pending' && day.dateStr < todayStr;

                    return (
                      <div
                        key={comm.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDateStr(day.dateStr);
                        }}
                        className={`text-[10px] px-1.5 py-1 rounded-md font-medium truncate flex items-center justify-between gap-1 shadow-2xs ${
                          comm.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                            : isCommOverdue
                              ? 'bg-rose-50 text-rose-800 border border-rose-200/60'
                              : 'bg-amber-50 text-amber-900 border border-amber-200/60'
                        }`}
                        title={`${comm.description} - ${formatCurrency(comm.estimated_amount)}`}
                      >
                        <span className="truncate">{comm.description}</span>
                        <span className="font-mono font-bold shrink-0">
                          {formatCurrency(comm.estimated_amount)}
                        </span>
                      </div>
                    );
                  })}

                  {dayComms.length > 2 && (
                    <div className="text-[9px] font-bold text-slate-500 font-mono pl-1">
                      +{dayComms.length - 2} mais...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Panel */}
      <div id="selected-day-details" className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Detalhamento da Data
            </span>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <span>{formatDate(selectedDateStr)}</span>
              {selectedDateStr === todayStr && (
                <span className="bg-slate-900 text-white text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                  Hoje
                </span>
              )}
            </h3>
          </div>

          <button
            onClick={() => onNewForDate(selectedDateStr)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agendar para este dia</span>
          </button>
        </div>

        {selectedDayCommitments.length === 0 ? (
          <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">Nenhum compromisso agendado para {formatDate(selectedDateStr)}.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Clique em "Agendar para este dia" acima para adicionar uma conta ou recebimento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDayCommitments.map(comm => {
              const isOverdue = comm.status === 'pending' && comm.due_date < todayStr;
              const respUser = users.find(u => u.id === comm.responsible_user_id)?.name;
              const estAccName = accounts.find(a => a.id === comm.estimated_account_id)?.name;

              return (
                <div
                  key={comm.id}
                  className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        comm.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : isOverdue
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {comm.status === 'paid' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : isOverdue ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{comm.description}</h4>
                        {comm.status === 'paid' ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                            Liquidado
                          </span>
                        ) : isOverdue ? (
                          <span className="bg-rose-100 text-rose-800 text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                            Atrasado
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                            Pendente
                          </span>
                        )}
                        <span className="text-[9px] text-slate-500 font-mono uppercase font-bold bg-slate-200 px-1.5 py-0.5 rounded">
                          {comm.type === 'to_pay' ? 'A Pagar' : 'A Receber'}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        {respUser && `Responsável: ${respUser}`}
                        {estAccName && ` • Estimado em: ${estAccName}`}
                      </p>
                      {comm.notes && (
                        <p className="text-[9px] text-slate-400 italic font-mono mt-0.5">
                          Nota: "{comm.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60">
                    <div className="text-left sm:text-right">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider font-mono block">Valor</span>
                      <span className="text-xs font-bold text-slate-900 font-mono">
                        {formatCurrency(comm.estimated_amount)}
                      </span>
                    </div>

                    {comm.status === 'pending' && (
                      <button
                        onClick={() => onPay(comm)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                      >
                        Quitar
                      </button>
                    )}

                    <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                      <button
                        onClick={() => onEdit(comm)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(comm)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100/70 rounded-lg transition-colors"
                        title="Excluir"
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
      </div>
    </div>
  );
}
