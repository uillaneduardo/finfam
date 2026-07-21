/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check, Share, PlusSquare } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);

  useEffect(() => {
    // Check if app is running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIos(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowGuideModal(true);
    }
  };

  if (isInstalled) return null;

  return (
    <>
      {/* Install Button */}
      <button
        id="pwa-install-app-btn"
        onClick={handleInstallClick}
        className="flex items-center space-x-2 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 active:scale-95"
        title="Instalar FinFam no seu celular ou computador"
      >
        <Smartphone className="w-4 h-4" />
        <span className="hidden sm:inline">Instalar App</span>
        <Download className="w-3.5 h-3.5 sm:hidden" />
      </button>

      {/* Guide Modal for iOS / Browser Instructions */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-slate-950 shadow-sm">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-sans">Instalar o FinFam no seu aparelho</h3>
                <p className="text-xs text-slate-500 font-mono">Acesso rápido direto da tela inicial</p>
              </div>
            </div>

            {isIos ? (
              <div className="space-y-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Siga os passos no Safari do seu iPhone/iPad:</p>
                <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Share className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <span>1. Toque no botão de <strong>Compartilhar</strong> na barra do Safari.</span>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <PlusSquare className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <span>2. Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</span>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>3. Confirme para ter o ícone do FinFam na sua tela inicial!</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Para instalar no Android ou Computador:</p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span>No menu do seu navegador (três pontos no topo), clique em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowGuideModal(false)}
              className="mt-6 w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
