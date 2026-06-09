import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Wifi, Zap, Tv, BookOpen, CreditCard, History, Users, Bell, MessageSquare, User, LogOut, ArrowRightLeft, Phone } from "lucide-react";
import { useGetNotifications } from "@workspace/api-client-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/buy-data", label: "Buy Data", icon: Wifi },
  { href: "/buy-airtime", label: "Buy Airtime", icon: Phone },
  { href: "/buy-electricity", label: "Electricity", icon: Zap },
  { href: "/buy-cable", label: "Cable TV", icon: Tv },
  { href: "/buy-exam", label: "Exam Tokens", icon: BookOpen },
  { href: "/airtime-to-cash", label: "Airtime to Cash", icon: ArrowRightLeft },
  { href: "/fund-wallet", label: "Fund Wallet", icon: CreditCard },
  { href: "/transactions", label: "Transactions", icon: History },
  { href: "/referrals", label: "Referrals", icon: Users },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/support", label: "Support", icon: MessageSquare },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { data: notifications = [] } = useGetNotifications({ isRead: false } as any);
  const [announcement, setAnnouncement] = useState<{ message: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((d: { announcementActive: boolean; announcement: string }) => {
        if (d.announcementActive && d.announcement) {
          setAnnouncement({ message: d.announcement });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    } else if (user.role === "admin" && !location.startsWith("/admin")) {
      setLocation("/admin");
    }
  }, [user, location, setLocation]);

  if (!user || user.role === "admin") return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r border-border bg-card">
          <SidebarHeader className="p-4 flex flex-row items-center border-b border-border">
            <h2 className="text-xl font-bold text-primary mr-auto">SanTech Data</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Services</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV_ITEMS.map((item) => {
                    const unreadCount = item.href === "/notifications" ? (notifications as any[]).length : 0;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={location === item.href} tooltip={item.label}>
                          <Link href={item.href} className="flex items-center gap-3 w-full">
                            <div className="relative">
                              <item.icon className="h-4 w-4" />
                              {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center leading-none">
                                  {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                              )}
                            </div>
                            <span>{item.label}</span>
                            {unreadCount > 0 && (
                              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                                {unreadCount > 99 ? "99+" : unreadCount}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-border p-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/profile"}>
                  <Link href="/profile" className="flex items-center gap-3 w-full">
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={logout} className="flex items-center gap-3 w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center px-4 border-b border-border bg-card sticky top-0 z-10 md:hidden">
            <SidebarTrigger />
            <div className="ml-4 font-semibold">SanTech Data</div>
          </header>
          {announcement && (
            <div className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 text-sm text-center text-primary font-medium flex items-center justify-center gap-2">
              <span>📢</span>
              <span>{announcement.message}</span>
              <button onClick={() => setAnnouncement(null)} className="ml-2 text-primary/60 hover:text-primary text-xs">✕</button>
            </div>
          )}
          <div className="p-4 md:p-8 overflow-auto flex-1">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
