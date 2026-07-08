import { useEffect, useState } from "react";
import { Download, Share, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "santech_install_dismissed_at";
const DISMISS_DAYS = 7;

function isDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
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

export function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissed()) {
      setDismissed(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (dismissed || isStandalone()) return null;

  const ios = isIos();

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* empty */ }
    setDismissed(true);
    setShowHelp(false);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") { setDismissed(true); return; }
      setDeferredPrompt(null);
    }
    setShowHelp(true);
  };

  const helpText = ios
    ? 'Tap the Share button in Safari, then choose "Add to Home Screen" to install.'
    : 'Tap the browser menu (⋮) then "Add to Home Screen" or "Install App" to install.';

  return (
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
              {deferredPrompt
                ? "Add SanTech Data to your home screen"
                : ios
                ? "Add to Home Screen — it's free"
                : "Install SanTech Data on your phone"}
            </p>
          </div>
          <div className="shrink-0 bg-white text-blue-600 text-xs font-bold px-3 py-1.5 rounded-lg">
            Install
          </div>
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="p-1 text-blue-200 hover:text-white shrink-0"
        >
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
  );
}
