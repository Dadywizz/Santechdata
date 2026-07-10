import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Users, History, Wifi, MessageSquare, PieChart,
  Bell, Settings, LogOut, AlertTriangle, ChevronRight, Crown, KeyRound, GraduationCap,
} from "lucide-react";

const ADMIN_NAV = [
  { href: "/admin",               label: "Overview",        icon: LayoutDashboard },
  { href: "/admin/users",         label: "Users",           icon: Users           },
  { href: "/admin/resellers",     label: "Resellers",       icon: Crown           },
  { href: "/admin/api-keys",      label: "API Keys",        icon: KeyRound        },
  { href: "/admin/transactions",  label: "Transactions",    icon: History         },
  { href: "/admin/failed-payments", label: "Failed Payments", icon: AlertTriangle },
  { href: "/admin/data-plans",    label: "Data Plans",      icon: Wifi            },
  { href: "/admin/exams",         label: "Exam Pricing",    icon: GraduationCap   },
  { href: "/admin/tickets",       label: "Support Tickets", icon: MessageSquare   },
  { href: "/admin/analytics",     label: "Analytics",       icon: PieChart        },
  { href: "/admin/notifications", label: "Notifications",   icon: Bell            },
  { href: "/admin/settings",      label: "Settings",        icon: Settings        },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!user) setLocation("/login");
    else if (user.role !== "admin") setLocation("/dashboard");
  }, [user, location, setLocation]);

  if (!user || user.role !== "admin") return null;

  const initials = (user.fullName || user.email || "A")
    .split(" ").slice(0, 2).map((s: string) => s[0]).join("").toUpperCase();

  return (
    <div className="min-h-screen flex w-full bg-[#f8fafc]">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-slate-100 fixed inset-y-0 left-0 z-40">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/60">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">SanTech Data</p>
            <p className="text-[10px] text-blue-400 font-medium tracking-wide uppercase">Admin Console</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-2">Management</p>
          {ADMIN_NAV.map((item) => {
            const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all group ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                }`}>
                  <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="h-3 w-3 text-blue-300" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer / user */}
        <div className="border-t border-slate-700/60 p-4">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">{user.fullName || "Admin"}</p>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm font-medium"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-slate-900 flex items-center px-4 gap-3 border-b border-slate-700">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
          <span className="text-white font-black text-xs">S</span>
        </div>
        <span className="text-white font-bold text-sm">SanTech Admin</span>
        <div className="ml-auto flex gap-2">
          {ADMIN_NAV.slice(0, 4).map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={`p-1.5 rounded-lg ${location === item.href ? "bg-blue-600 text-white" : "text-slate-400"}`}>
                <item.icon className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-64 flex flex-col min-w-0">
        <div className="pt-14 md:pt-0 p-4 md:p-8 overflow-auto flex-1 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
