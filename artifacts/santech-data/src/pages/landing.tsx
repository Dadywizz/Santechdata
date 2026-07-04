import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Landing() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const hasToken = !!sessionStorage.getItem("santech_token");
    if (hasToken) navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── NAV ── */}
      <nav className="bg-[#0f172a] text-white px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-white text-sm">S</div>
            <span className="font-bold text-lg tracking-tight">SanTech Data</span>
          </a>
          {/* Links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-300">
            <a href="#services" className="hover:text-white transition-colors">Services</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#reseller" className="hover:text-white transition-colors">Reseller</a>
            <a href="#api" className="hover:text-white transition-colors">API Docs</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </div>
          {/* CTA */}
          <a
            href="/login"
            className="flex items-center gap-2 bg-white text-[#0f172a] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Log In
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="bg-[#f1f5f9] min-h-[calc(100vh-64px)] flex items-center">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-center w-full">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
              Trusted by thousands of Nigerians
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-[#0f172a] leading-tight mb-4">
              The easiest way to buy and resell{" "}
              <span className="text-orange-500">cheap data &amp; airtime</span>{" "}
              in Nigeria.
            </h1>

            <p className="text-gray-500 text-base md:text-lg mb-8 max-w-md">
              Buy data, airtime, electricity tokens, cable TV and exam PINs instantly.
              Become a reseller, earn from every sale, or build your own VTU platform with our API.
            </p>

            {/* Stats */}
            <div className="flex items-center gap-8 mb-8">
              {[
                { value: "Fast", label: "Delivery" },
                { value: "4", label: "Networks" },
                { value: "99.9%", label: "Uptime" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-extrabold text-[#0f172a]">{s.value}</p>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-6">
              <a
                href="/register"
                className="flex items-center gap-2 bg-[#0f172a] text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-[#1e293b] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                Create free account
              </a>
              <a
                href="/login"
                className="flex items-center gap-2 border-2 border-[#0f172a] text-[#0f172a] text-sm font-semibold px-5 py-3 rounded-xl hover:bg-[#0f172a] hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                Log In
              </a>
            </div>

            {/* App badges */}
            <div className="flex flex-wrap gap-3">
              <span className="flex items-center gap-2 bg-[#34a853]/80 text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-default select-none opacity-75">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18.5v-13A1.5 1.5 0 0 1 4.914 4.1l10 6.5a1.5 1.5 0 0 1 0 2.8l-10 6.5A1.5 1.5 0 0 1 3 18.5z"/></svg>
                <span>
                  <span className="block text-[10px] font-normal opacity-80">COMING SOON ON</span>
                  Google Play
                </span>
              </span>
              <span className="flex items-center gap-2 bg-[#0f172a] border border-gray-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-default select-none opacity-75">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                <span>
                  <span className="block text-[10px] font-normal opacity-80">COMING SOON ON</span>
                  App Store
                </span>
              </span>
            </div>
          </div>

          {/* Right — Dashboard Mockup */}
          <div className="relative flex justify-center items-center">
            <div className="w-full max-w-md">
              {/* Floating card */}
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                {/* Card header */}
                <div className="bg-[#0f172a] px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-white text-xs font-medium opacity-60">Wallet Balance</p>
                    <p className="text-white text-2xl font-extrabold">₦12,450.00</p>
                  </div>
                  <div className="bg-blue-500 rounded-xl p-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  </div>
                </div>
                {/* Services grid */}
                <div className="grid grid-cols-4 gap-0 border-b border-gray-100">
                  {[
                    { label: "Data", emoji: "📶", color: "bg-blue-50" },
                    { label: "Airtime", emoji: "📞", color: "bg-green-50" },
                    { label: "Electric", emoji: "⚡", color: "bg-yellow-50" },
                    { label: "Cable TV", emoji: "📺", color: "bg-purple-50" },
                  ].map((s) => (
                    <div key={s.label} className={`${s.color} flex flex-col items-center justify-center py-4 gap-1`}>
                      <span className="text-xl">{s.emoji}</span>
                      <span className="text-[10px] text-gray-500 font-medium">{s.label}</span>
                    </div>
                  ))}
                </div>
                {/* Recent transactions */}
                <div className="px-5 py-4">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">Recent Transactions</p>
                  <div className="space-y-3">
                    {[
                      { icon: "📶", label: "MTN 1GB Data", sub: "08012345678", amount: "-₦235", color: "text-red-500" },
                      { icon: "📞", label: "Airtel Airtime", sub: "09087654321", amount: "-₦500", color: "text-red-500" },
                      { icon: "💰", label: "Wallet Funded", sub: "Paystack", amount: "+₦5,000", color: "text-green-500" },
                    ].map((tx) => (
                      <div key={tx.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">{tx.icon}</div>
                          <div>
                            <p className="text-xs font-semibold text-gray-800">{tx.label}</p>
                            <p className="text-[10px] text-gray-400">{tx.sub}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold ${tx.color}`}>{tx.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Fund wallet button */}
                <div className="px-5 pb-5">
                  <div className="bg-orange-500 text-white text-sm font-bold text-center py-3 rounded-xl cursor-pointer hover:bg-orange-600 transition-colors">
                    + Fund Wallet
                  </div>
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg">
                ✓ Delivered instantly
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white border border-gray-100 shadow-lg text-xs font-bold px-3 py-2 rounded-xl text-gray-700">
                🔒 Secured payments
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-orange-500 font-semibold text-sm uppercase tracking-wide mb-2">What We Offer</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-[#0f172a] mb-2">All VTU Services in One Place</h2>
          <p className="text-center text-gray-400 mb-10">Instant delivery, cheapest rates, all networks</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { emoji: "📶", title: "Data Bundles", desc: "MTN, Airtel, GLO & 9Mobile — daily, weekly, monthly from ₦100" },
              { emoji: "📞", title: "Airtime Top-up", desc: "Recharge any Nigerian network instantly at the best rates" },
              { emoji: "⚡", title: "Electricity", desc: "Prepaid tokens for all DISCOs — EKEDC, IKEDC, AEDC and more" },
              { emoji: "📺", title: "Cable TV", desc: "DStv, GOtv and StarTimes subscriptions renewed in seconds" },
              { emoji: "📝", title: "Exam Tokens", desc: "WAEC, NECO, JAMB and NABTEB result checker PINs" },
              { emoji: "💰", title: "Earn as Reseller", desc: "Pay ₦500 once, unlock wholesale prices and earn on every sale" },
            ].map((s) => (
              <div key={s.title} className="border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:border-blue-100 transition-all">
                <div className="text-3xl mb-3">{s.emoji}</div>
                <h3 className="font-bold text-[#0f172a] mb-1">{s.title}</h3>
                <p className="text-gray-400 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-16 px-4 bg-[#f8fafc]">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-orange-500 font-semibold text-sm uppercase tracking-wide mb-2">Pricing</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] mb-2">Simple, Transparent Pricing</h2>
          <p className="text-gray-400 mb-10">No hidden charges. What you see is what you pay.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Customer", price: "Free", desc: "Create an account and start buying instantly. Fund your wallet and top up any network.", cta: "Get Started", href: "/register", highlight: false },
              { title: "Reseller", price: "₦500", desc: "One-time fee. Get wholesale prices on all plans, earn commission from referrals every month.", cta: "Become Reseller", href: "/register", highlight: true },
              { title: "Own VTU Site", price: "₦200,000", desc: "We build you a fully branded VTU website powered by our API. Your domain, your business.", cta: "Contact Us", href: "https://wa.me/2348063136201?text=I+want+my+own+VTU+website", highlight: false },
            ].map((p) => (
              <div key={p.title} className={`rounded-2xl p-6 text-left ${p.highlight ? "bg-[#0f172a] text-white shadow-xl scale-105" : "bg-white border border-gray-100 text-[#0f172a]"}`}>
                <p className={`text-sm font-semibold uppercase tracking-wide mb-2 ${p.highlight ? "text-blue-400" : "text-orange-500"}`}>{p.title}</p>
                <p className={`text-3xl font-extrabold mb-4 ${p.highlight ? "text-white" : "text-[#0f172a]"}`}>{p.price}</p>
                <p className={`text-sm mb-6 ${p.highlight ? "text-gray-400" : "text-gray-400"}`}>{p.desc}</p>
                <a
                  href={p.href}
                  target={p.href.startsWith("http") ? "_blank" : undefined}
                  rel={p.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className={`block text-center text-sm font-bold py-3 rounded-xl transition-colors ${p.highlight ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-gray-100 text-[#0f172a] hover:bg-gray-200"}`}
                >
                  {p.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-orange-500 font-semibold text-sm uppercase tracking-wide mb-2">Easy Steps</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] mb-2">Start in Under 2 Minutes</h2>
          <p className="text-gray-400 mb-10">No technical skills needed. Just register and top up.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create Account", desc: "Register free — no ID or verification needed. Takes 30 seconds." },
              { step: "02", title: "Fund Your Wallet", desc: "Add money via Paystack or Flutterwave using your bank card or transfer." },
              { step: "03", title: "Buy Instantly", desc: "Choose your service, enter the number, and get instant delivery." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 rounded-full bg-orange-100 text-orange-500 font-extrabold text-lg flex items-center justify-center mx-auto mb-4">{s.step}</div>
                <h3 className="font-bold text-[#0f172a] mb-2">{s.title}</h3>
                <p className="text-gray-400 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESELLER ── */}
      <section id="reseller" className="py-16 px-4 bg-[#0f172a]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 text-white">
            <p className="text-orange-400 font-semibold text-sm uppercase tracking-wide mb-3">Reseller Programme</p>
            <h2 className="text-2xl md:text-3xl font-extrabold mb-4">Earn Money on Every Sale You Make</h2>
            <p className="text-gray-400 mb-6">Pay ₦500 once to become a reseller. You get wholesale prices on all data, airtime, electricity and more — then sell to your own customers at a profit.</p>
            <ul className="space-y-3 mb-8">
              {["Wholesale prices on all plans", "Earn commission from your referrals", "Dashboard to manage your business", "No monthly fees or subscription"].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <a href="/register" className="inline-block bg-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors">
              Start for ₦500 →
            </a>
          </div>
          <div className="flex-1 bg-[#1e293b] rounded-2xl p-6 border border-gray-700">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-4">Example Monthly Earning</p>
            <div className="space-y-4">
              {[
                { label: "50 customers × ₦500 data/day", amount: "₦1,500/day profit" },
                { label: "Commission from 10 referrals", amount: "₦600/month" },
                { label: "Electricity tokens", amount: "₦800/month" },
              ].map((r) => (
                <div key={r.label} className="flex justify-between items-center border-b border-gray-700 pb-3">
                  <span className="text-gray-300 text-sm">{r.label}</span>
                  <span className="text-orange-400 font-bold text-sm">{r.amount}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-1">
                <span className="text-white font-bold">Total potential</span>
                <span className="text-green-400 font-extrabold text-lg">₦45,000+/mo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── API ── */}
      <section id="api" className="py-16 px-4 bg-[#f8fafc]">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-10 items-center">
            <div className="flex-1">
              <p className="text-orange-500 font-semibold text-sm uppercase tracking-wide mb-3">For Developers</p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] mb-4">Build on the SanTech Data API</h2>
              <p className="text-gray-400 mb-6">Already have an app? Connect our REST API to offer data, airtime, electricity and more to your users — with instant delivery and wholesale rates.</p>
              <ul className="space-y-2 mb-6">
                {["Simple REST API with API key auth", "Wallet-based billing", "Data, Airtime, Electricity, Cable & Exam", "Real-time delivery status"].map(item => (
                  <li key={item} className="flex items-center gap-2 text-gray-600 text-sm">
                    <span className="text-blue-500 font-bold">✓</span>{item}
                  </li>
                ))}
              </ul>
              <a href="https://wa.me/2348063136201?text=I+am+interested+in+the+SanTech+Data+API" target="_blank" rel="noopener noreferrer" className="inline-block bg-[#0f172a] text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors">
                Request API Access
              </a>
            </div>
            <div className="flex-1 bg-[#0f172a] rounded-2xl p-5 font-mono text-sm overflow-x-auto">
              <p className="text-gray-500 text-xs mb-2">// Purchase 1GB MTN data via API</p>
              <p><span className="text-blue-400">POST</span> <span className="text-gray-200">/api/v1/data/purchase</span></p>
              <p className="text-gray-400 mt-1">Authorization: Bearer sk_live_...</p>
              <div className="mt-3 text-gray-300">{"{"}</div>
              <div className="pl-4"><span className="text-yellow-300">"planId"</span>: <span className="text-green-400">"mtn-1gb-id"</span>,</div>
              <div className="pl-4"><span className="text-yellow-300">"phone"</span>: <span className="text-green-400">"0801234567"</span></div>
              <div className="text-gray-300">{"}"}</div>
              <div className="mt-3 text-gray-500">// 200 Response</div>
              <div className="text-gray-300">{"{"}</div>
              <div className="pl-4"><span className="text-yellow-300">"status"</span>: <span className="text-green-400">"success"</span>,</div>
              <div className="pl-4"><span className="text-yellow-300">"message"</span>: <span className="text-green-400">"1GB delivered"</span>,</div>
              <div className="pl-4"><span className="text-yellow-300">"reference"</span>: <span className="text-green-400">"API-DATA-..."</span></div>
              <div className="text-gray-300">{"}"}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── OWN SITE ── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-orange-500 font-semibold text-sm uppercase tracking-wide mb-2">White-Label</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] mb-4">Want Your Own VTU Website?</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">We build you a fully branded VTU platform just like SanTech Data — your domain or a subdomain, your logo, your prices. Powered by our API.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
            {["Custom domain or subdomain", "Your own branding & logo", "Full admin panel", "Set your own prices", "Powered by our API", "Ready within days"].map(f => (
              <div key={f} className="border border-gray-100 rounded-xl p-4 text-sm text-gray-600 font-medium">✓ {f}</div>
            ))}
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8">
            <p className="text-orange-100 text-sm font-semibold mb-1 uppercase tracking-wide">One-time setup fee</p>
            <p className="text-white text-4xl font-extrabold mb-2">₦200,000</p>
            <p className="text-orange-100 mb-6">Full VTU site · Custom branding · Subdomain · Lifetime API access</p>
            <a
              href="https://wa.me/2348063136201?text=Hello%2C+I+want+my+own+VTU+website+for+%E2%82%A6200%2C000"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-white text-orange-600 font-bold px-8 py-3 rounded-xl hover:bg-orange-50 transition-colors"
            >
              💬 Contact Us on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="py-12 px-4 bg-[#f8fafc] border-t border-gray-100">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl font-bold text-[#0f172a] mb-2">Need Help or Have a Question?</h2>
          <p className="text-gray-400 mb-6">Reach us on WhatsApp or email — we respond fast</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="tel:09026329296"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl transition-colors">
              📞 Call: 09026329296
            </a>
            <a href="https://wa.me/2348063136201" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-3 rounded-xl transition-colors">
              💬 WhatsApp: 08063136201
            </a>
            <a href="mailto:santechdata@gmail.com"
              className="flex items-center justify-center gap-2 border-2 border-[#0f172a] text-[#0f172a] hover:bg-[#0f172a] hover:text-white font-semibold px-5 py-3 rounded-xl transition-colors">
              ✉️ santechdata@gmail.com
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0f172a] text-gray-400 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-white text-sm">S</div>
            <span className="text-white font-bold">SanTech Data</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <a href="/login" className="hover:text-white transition-colors">Sign In</a>
            <a href="/register" className="hover:text-white transition-colors">Register</a>
            <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="https://wa.me/2348063136201" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp</a>
            <a href="mailto:santechdata@gmail.com" className="hover:text-white transition-colors">Email</a>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} SanTech Data</p>
        </div>
      </footer>
    </div>
  );
}
