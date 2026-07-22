/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Shield, Receipt, Wallet, CalendarClock, Target, Users, Tag, CheckCheck } from 'lucide-react';

interface NotificationItem {
  id: number;
  family_id: number;
  actor_user_id: number;
  actor_name?: string;
  module: 'account' | 'transaction' | 'commitment' | 'project' | 'contact' | 'category';
  action: 'create' | 'update' | 'delete';
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const prevUnreadCountRef = useRef<number>(0);

  const sendDeviceNotification = async (title: string, message: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const options = {
      body: message,
      icon: '/icons/favicon.svg',
      badge: '/icons/favicon.svg',
      vibrate: [200, 100, 200],
      tag: `finfam-notif-${Date.now()}`,
      renotify: true,
      data: { url: '/' }
    };

    // On Android/Mobile browsers & PWAs, direct 'new Notification()' is blocked or ignored.
    // Using ServiceWorkerRegistration.showNotification puts the notification directly into the device notification bar.
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, options);
          return;
        }
      } catch (e) {
        console.warn('Erro ao disparar notificação via ServiceWorker, tentando fallback:', e);
      }
    }

    // Fallback for desktop browsers when SW is not active
    try {
      new Notification(title, options);
    } catch (e) {
      console.warn('Erro na notificação de fallback:', e);
    }
  };

  const fetchNotifications = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        const newNotifications: NotificationItem[] = data.notifications || [];
        const newUnread: number = data.unreadCount || 0;

        // Trigger native notification on device status bar if new unread notification arrives
        if (!isInitial && newUnread > prevUnreadCountRef.current && Notification.permission === 'granted') {
          const newest = newNotifications[0];
          if (newest && newest.is_read === 0) {
            sendDeviceNotification(newest.title, newest.message);
          }
        }

        setNotifications(newNotifications);
        setUnreadCount(newUnread);
        prevUnreadCountRef.current = newUnread;
      }
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(true);
    // Poll every 12 seconds for real-time family updates
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
        setUnreadCount(0);
        prevUnreadCountRef.current = 0;
      }
    } catch (err) {
      console.error('Erro ao marcar como lidas:', err);
    }
  };

  const handleMarkSingleRead = async (id: number) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        prevUnreadCountRef.current = Math.max(0, prevUnreadCountRef.current - 1);
      }
    } catch (err) {
      console.error('Erro ao marcar notificação:', err);
    }
  };

  const handleClearRead = async () => {
    try {
      const res = await fetch('/api/notifications', { method: 'DELETE' });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.is_read === 0));
      }
    } catch (err) {
      console.error('Erro ao limpar notificações:', err);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Seu navegador não suporta notificações de área de trabalho.');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        sendDeviceNotification('FinFam Conectado', 'Notificações de alterações da família ativadas no seu aparelho!');
      }
    } catch (err) {
      console.error('Erro ao solicitar permissão de notificação:', err);
    }
  };

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'account': return <Wallet className="w-4 h-4 text-emerald-500" />;
      case 'transaction': return <Receipt className="w-4 h-4 text-blue-500" />;
      case 'commitment': return <CalendarClock className="w-4 h-4 text-amber-500" />;
      case 'project': return <Target className="w-4 h-4 text-purple-500" />;
      case 'contact': return <Users className="w-4 h-4 text-indigo-500" />;
      case 'category': return <Tag className="w-4 h-4 text-rose-500" />;
      default: return <Shield className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Há ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Há ${diffDays} d`;
  };

  return (
    <div className="relative inline-block text-left">
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all focus:outline-none"
        title="Notificações da Família"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse border-2 border-slate-900 shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold font-sans">Notificações da Família</h3>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center space-x-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Marcar lidas</span>
                </button>
              )}
            </div>

            {/* Browser Permission Banner */}
            {permission !== 'granted' ? (
              <div className="p-3 bg-amber-50 border-b border-amber-200/60 flex items-center justify-between">
                <p className="text-[11px] text-amber-900 font-medium leading-tight">
                  Receba alertas na barra do seu celular/aparelho quando a família fizer lançamentos.
                </p>
                <button
                  onClick={requestNotificationPermission}
                  className="ml-2 px-2.5 py-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-[10px] rounded-lg shadow-xs shrink-0 transition-all"
                >
                  Ativar
                </button>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50 border-b border-emerald-200/60 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-900">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                  <p className="text-[11px] font-medium leading-tight">
                    Alertas no aparelho <strong>Ativados</strong>.
                  </p>
                </div>
                <button
                  onClick={() => sendDeviceNotification('FinFam Teste', 'Notificação de teste enviada para a barra de notificações do seu aparelho!')}
                  className="ml-2 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shrink-0 transition-all shadow-xs"
                >
                  Testar Alerta
                </button>
              </div>
            )}

            {/* Notification List */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-mono">
                  Carregando avisos...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="text-xs font-medium">Nenhuma atividade recente registrada.</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    Novos registros de contas, lançamentos, caixinhas e compromissos aparecerão aqui.
                  </p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => item.is_read === 0 && handleMarkSingleRead(item.id)}
                    className={`p-3.5 transition-all flex items-start space-x-3 cursor-pointer ${
                      item.is_read === 0 ? 'bg-amber-50/40 hover:bg-amber-50/70 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                      {getModuleIcon(item.module)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-slate-900 truncate">{item.title}</span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                          {formatTimeAgo(item.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-snug">{item.message}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">
                          Por: <strong className="text-slate-700">{item.actor_name || 'Membro'}</strong>
                        </span>
                        {item.is_read === 0 && (
                          <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                            Novo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center flex items-center justify-between px-4">
                <span className="text-[10px] text-slate-400 font-mono">
                  Mostrando últimas {notifications.length} atividades
                </span>
                <button
                  onClick={handleClearRead}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center space-x-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Limpar lidas</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
