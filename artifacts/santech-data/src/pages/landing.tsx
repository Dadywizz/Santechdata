import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

const isPWA =
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as any).standalone === true;

export default function Landing() {
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isPWA) {
      navigate("/dashboard");
    }
  }, [navigate]);

  if (isPWA) return null;

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-blue-700 text-lg">SanTech Data</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="/login">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600">
                Sign In
              </Button>
            </a>
            <a href="/register">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Get Started
              </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-wide uppercase">
            ⚡ Instant Delivery · All Networks
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            Buy Cheap Data, Airtime & More — Instantly
          </h1>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Nigeria's most affordable VTU platform. Recharge any network, pay electricity bills,
            subscribe to cable TV, and buy exam tokens — all in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/register">
              <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 w-full sm:w-auto">
                Create Free Account
              </Button>
            </a>
            <a href="/login">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8 w-full sm:w-auto">
                Sign In
              </Button>
            </a>
          </div>
          <p className="text-blue-200 text-sm mt-4">No hidden charges · Instant top-up · 24/7 service</p>
        </div>
      </section>

      {/* ── Services ── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-2">
            Everything You Need in One Place
          </h2>
          <p className="text-center text-gray-500 mb-10">All your utility top-ups, handled fast and cheap</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: "📶", title: "Data Bundles", desc: "MTN, Airtel, GLO & 9Mobile. Daily, weekly & monthly plans from ₦100", color: "blue" },
              { icon: "📞", title: "Airtime", desc: "Instant airtime top-up for all Nigerian networks at the best rates", color: "green" },
              { icon: "⚡", title: "Electricity", desc: "Buy prepaid tokens for EKEDC, IKEDC, AEDC and all DISCOs instantly", color: "yellow" },
              { icon: "📺", title: "Cable TV", desc: "DStv, GOtv and StarTimes subscriptions renewed in seconds", color: "purple" },
              { icon: "📝", title: "Exam Tokens", desc: "WAEC, NECO, JAMB and NABTEB result checker PINs at cheap rates", color: "orange" },
              { icon: "💰", title: "Reseller Plan", desc: "Become a reseller for just ₦500 and earn more on every purchase", color: "red" },
            ].map((s) => (
              <div key={s.title} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="font-bold text-gray-800 mb-1">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-2">How It Works</h2>
          <p className="text-center text-gray-500 mb-10">Get started in under 2 minutes</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "1", title: "Create Account", desc: "Register free in seconds. No ID required, no verification delays." },
              { step: "2", title: "Fund Your Wallet", desc: "Add money via Paystack or Flutterwave — bank transfer or card." },
              { step: "3", title: "Buy Instantly", desc: "Select your service, enter the details, and receive delivery in seconds." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-bold text-gray-800 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Us ── */}
      <section className="py-16 px-4 bg-blue-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-10">Why Choose SanTech Data?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: "⚡", title: "Instant Delivery", desc: "Every purchase completes in seconds" },
              { icon: "💸", title: "Cheapest Rates", desc: "Prices lower than buying directly from networks" },
              { icon: "🔒", title: "Secure Payments", desc: "Powered by Paystack & Flutterwave" },
              { icon: "🕐", title: "24/7 Service", desc: "Buy anytime, day or night" },
            ].map((w) => (
              <div key={w.title} className="text-center">
                <div className="text-3xl mb-2">{w.icon}</div>
                <h3 className="font-semibold text-gray-800 mb-1">{w.title}</h3>
                <p className="text-gray-500 text-xs">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Reseller ── */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Become a Reseller</h2>
          <p className="text-blue-100 mb-6 max-w-xl mx-auto">
            Pay just ₦500 once and unlock wholesale prices on all data and services. 
            Sell to your customers and earn profit on every transaction.
          </p>
          <a href="/register">
            <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-8">
              Start Selling Today
            </Button>
          </a>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Need Help?</h2>
          <p className="text-gray-500 mb-6">Our support team is always ready to assist you</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://wa.me/2349026329296"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="bg-green-500 hover:bg-green-600 text-white gap-2 w-full sm:w-auto">
                💬 WhatsApp: 09026329296
              </Button>
            </a>
            <a href="/support">
              <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50 w-full sm:w-auto">
                Open Support Ticket
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span className="text-white font-semibold">SanTech Data</span>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="/login" className="hover:text-white transition-colors">Sign In</a>
            <a href="/register" className="hover:text-white transition-colors">Register</a>
            <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="/support" className="hover:text-white transition-colors">Support</a>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} SanTech Data. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
