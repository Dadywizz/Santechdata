import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Wifi, Zap, Tv, BookOpen, CreditCard, History,
  Users, Bell, MessageSquare, User, LogOut, ArrowRightLeft, Phone, ChevronRight,
} from "lucide-react";
import { useGetNotifications } from "@workspace/api-client-react";

const NAV_ITEMS = [
  { href: "/dashboard",      label: "Dashboard",      icon: LayoutDashboard },
  { href: "/buy-data",       label: "Buy Data",       icon: Wifi            },
  { href: "/buy-airtime",    label: "Buy Airtime",    icon: Phone           },
  { href: "/buy-electricity",label: "Electricity",    icon: Zap             },
  { href: "/buy-cable",      label: "Cable TV",       icon: Tv              },
  { href: "/buy-exam",       label: "Exam Pins",      icon: BookOpen        },
  { href: "/airtime-to-cash",label: "Airtime → Cash", icon: ArrowRightLeft  },
  { href: "/fund-wallet",    label: "Fund Wallet",    icon: CreditCard      },
  { href: "/transactions",   label: "Transactions",   icon: History         },
  { href: "/referrals",      label: "Referrals",      icon: Users           },
  { href: "/notifications",  label: "Notifications",  icon: Bell            },
  { href: "/support",        label: "Support",        icon: MessageSquare   },
  { href: "/profile",        label: "Profile",        icon: User            },
];

const BOTTOM_NAV = [
  { href: "/dashboard",   label: "Home",    icon: LayoutDashboard },
  { href: "/buy-data",    label: "Data",    icon: Wifi            },
  { href: "/buy-airtime", label: "Airtime", icon: Phone           },
  { href: "/fund-wallet", label: "Wallet",  icon: CreditCard      },
  { href: "/profile",     label: "Profile", icon: User            },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { data: notifications = [] } = useGetNotifications({ isRead: false } as any);
  const [announcement, setAnnouncement] = useState<{ message: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((d: { announcementActive: boolean; announcement: string }) => {
        if (d.announcementActive && d.announcement) setAnnouncement({ message: d.announcement });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) setLocation("/login");
    else if (user.role === "admin" && !location.startsWith("/admin")) setLocation("/admin");
  }, [user, location, setLocation]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  if (!user || user.role === "admin") return null;

  const unreadCount = (notifications as any[]).length;
  const initials = (user.fullName || user.email || "U")
    .split(" ").slice(0, 2).map((s: string) => s[0]).join("").toUpperCase();

  return (
    <div className="min-h-screen flex w-full bg-[#f8fafc]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-40">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <div>
            <p className="font-black text-slate-900 text-sm leading-tight">SanTech Data</p>
            <p className="text-[10px] text-blue-600 font-medium">Fast VTU Services</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            const badge = item.href === "/notifications" ? unreadCount : 0;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}>
                  <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`} />
                  <span className={`text-sm flex-1 ${isActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
                  {badge > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">{badge > 99 ? "99+" : badge}</span>
                  )}
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.fullName || user.email}</p>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                  <span className="text-white font-black text-sm">S</span>
                </div>
                <div>
                  <p className="font-black text-slate-900 text-sm">SanTech Data</p>
                  <p className="text-[10px] text-blue-600 font-medium">Fast VTU Services</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 text-lg font-bold">✕</button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const isActive = location === item.href;
                const badge = item.href === "/notifications" ? unreadCount : 0;
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${
                      isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
                    }`}>
                      <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                      <span className={`text-sm flex-1 ${isActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
                      {badge > 0 && <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{badge}</span>}
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-slate-100 p-4">
              <div className="flex items-center gap-2.5 mb-3 px-1">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">{initials}</div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user.fullName || user.email}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <button onClick={logout} className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shadow-sm">
        <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
            <span className="text-white font-black text-[10px]">S</span>
          </div>
          <span className="font-bold text-slate-900 text-sm">SanTech Data</span>
        </div>
        <Link href="/notifications">
          <div className="relative p-1.5 rounded-lg hover:bg-slate-100">
            <Bell className="h-5 w-5 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
          </div>
        </Link>
      </header>

      {/* Announcement */}
      {announcement && (
        <div className="fixed top-14 md:top-0 left-0 md:left-64 right-0 z-20 bg-blue-600 text-white px-4 py-2 text-sm text-center font-medium flex items-center justify-center gap-2">
          <span>📢</span>
          <span>{announcement.message}</span>
          <button onClick={() => setAnnouncement(null)} className="ml-2 opacity-70 hover:opacity-100 text-xs">✕</button>
        </div>
      )}

      {/* Main content */}
      <main className={`flex-1 md:ml-64 min-w-0 ${announcement ? "pt-24 md:pt-10" : "pt-14 md:pt-0"} pb-20 md:pb-0`}>
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 safe-area-inset-bottom">
        <div className="flex items-stretch">
          {BOTTOM_NAV.map((item) => {
            const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
            const badge = item.href === "/notifications" ? unreadCount : 0;
            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <div className={`flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${isActive ? "text-blue-600" : "text-slate-500"}`}>
                  <div className="relative">
                    <item.icon className={`h-5 w-5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center">{badge > 9 ? "9+" : badge}</span>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium leading-none ${isActive ? "text-blue-600" : "text-slate-400"}`}>{item.label}</span>
                  {isActive && <div className="w-1 h-1 rounded-full bg-blue-600" />}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
