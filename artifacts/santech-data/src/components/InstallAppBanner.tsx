import { useEffect, useState } from "react";
import { Download, Share, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "santech_install_dismissed_at";
const MODAL_SEEN_KEY = "santech_install_modal_seen";
const DISMISS_DAYS = 7;

function isDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_DAYS * 86400000;
  } catch { return false; }
}

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isIos() {
  return typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isMobile() {
  return typeof navigator !== "undefined" && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

export function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissed()) { setDismissed(true); return; }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const modalAlreadySeen = !!localStorage.getItem(MODAL_SEEN_KEY);

    if (!modalAlreadySeen && isMobile()) {
      const timer = setTimeout(() => {
        if (!isStandalone() && !isDismissed()) setShowModal(true);
      }, 2000);
      return () => { window.removeEventListener("beforeinstallprompt", handler); clearTimeout(timer); };
    } else {
      setShowBanner(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (dismissed || isStandalone()) return null;

  const ios = isIos();

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* empty */ }
    setDismissed(true);
    setShowModal(false);
    setShowBanner(false);
  };

  const dismissModal = () => {
    try { localStorage.setItem(MODAL_SEEN_KEY, "1"); } catch { /* empty */ }
    setShowModal(false);
    setShowBanner(true);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") { setDismissed(true); setShowModal(false); setShowBanner(false); return; }
      setDeferredPrompt(null);
    }
    setShowHelp(true);
  };

  const helpText = ios
    ? 'Tap the Share button (□↑) at the bottom of Safari, then tap "Add to Home Screen".'
    : 'Tap the menu button (⋮) at the top of Chrome, then tap "Add to Home Screen".';

  return (
    <>
      {/* ── Bottom-sheet modal (auto-appears on mobile) ── */}
      {showModal && (
        <div className="fixed inset-0 z-[999] flex items-end justify-center md:items-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={dismissModal}
          />

          {/* Sheet */}
          <div className="relative w-full max-w-sm mx-auto bg-white rounded-t-3xl md:rounded-3xl shadow-2xl px-6 pt-5 pb-8 animate-in slide-in-from-bottom-8 duration-300">
            {/* Handle */}
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5 md:hidden" />

            {/* Close */}
            <button
              type="button"
              onClick={dismissModal}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            >
              <X size={16} />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-xl shadow-blue-500/30">
                <span className="text-white font-black text-3xl">S</span>
              </div>
            </div>

            <h2 className="text-xl font-black text-slate-900 text-center mb-1">
              Install SanTech Data
            </h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              Add to your home screen for instant access — buy data, airtime &amp; more in seconds.
            </p>

            {showHelp ? (
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-4 text-sm text-blue-800">
                <Smartphone size={18} className="shrink-0 mt-0.5 text-blue-500" />
                <p>{helpText}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInstall}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-base py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/30 mb-3"
              >
                {ios ? <Share size={20} /> : <Download size={20} />}
                {deferredPrompt ? "Install Now — it's free" : ios ? "Add to Home Screen" : "Install the App"}
              </button>
            )}

            <button
              type="button"
              onClick={dismiss}
              className="w-full text-center text-sm text-slate-400 hover:text-slate-600 py-2"
            >
              No thanks, I'll use the browser
            </button>
          </div>
        </div>
      )}

      {/* ── Persistent inline banner (shown after modal dismissed) ── */}
      {showBanner && !showModal && (
        <div className="mb-5">
          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl px-4 py-3 shadow-md shadow-blue-500/20">
            <button
              type="button"
              onClick={handleInstall}
              className="flex items-center gap-3 flex-1 min-w-0 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                {ios ? <Share size={18} /> : <Download size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-blue-200 leading-none font-medium uppercase tracking-wide">
                  {deferredPrompt ? "Install Now" : "Get the App"}
                </p>
                <p className="text-sm font-bold leading-tight">
                  {deferredPrompt ? "Add to home screen — 1 tap" : ios ? "Add to Home Screen — free" : "Install SanTech Data"}
                </p>
              </div>
              <div className="shrink-0 bg-white text-blue-600 text-xs font-bold px-3 py-1.5 rounded-lg">
                Install
              </div>
            </button>
            <button type="button" onClick={dismiss} aria-label="Dismiss" className="p-1 text-blue-200 hover:text-white shrink-0">
              <X size={15} />
            </button>
          </div>

          {showHelp && (
            <div className="mt-2 flex items-start gap-2.5 bg-blue-50 border border-blue-100 text-blue-800 rounded-2xl px-4 py-3 text-sm">
              <Smartphone size={16} className="mt-0.5 shrink-0 text-blue-500" />
              <p>{helpText}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
