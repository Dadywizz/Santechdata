import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "santech_install_banner_dismissed_at";
const DISMISS_DAYS = 7;

function isDismissed() {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (Number.isNaN(dismissedAt)) return false;
  return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function isStandalone() {
  return (
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true)
  );
}

function isIos() {
  return typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    const iosDevice = isIos();
    setIos(iosDevice);

    if (iosDevice) {
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setShowIosHelp(false);
  };

  const handleInstall = async () => {
    if (ios) {
      setShowIosHelp(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="mb-5">
      <div className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-4 py-3 transition-colors">
        <button
          type="button"
          onClick={handleInstall}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Download size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 leading-none">INSTALL</p>
            <p className="text-base font-bold leading-tight">SanTech Data App</p>
          </div>
          <span className="text-xs text-slate-400 shrink-0">Add to Home Screen →</span>
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="p-1 text-slate-400 hover:text-white shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {showIosHelp && (
        <div className="mt-2 flex items-start gap-2 bg-slate-100 text-slate-700 rounded-2xl px-4 py-3 text-sm">
          <Share size={16} className="mt-0.5 shrink-0 text-slate-500" />
          <p>
            Tap the <strong>Share</strong> button in Safari, then choose{" "}
            <strong>&ldquo;Add to Home Screen&rdquo;</strong> to install the app.
          </p>
        </div>
      )}
    </div>
  );
}
