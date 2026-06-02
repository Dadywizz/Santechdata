import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarTrigger } from "@/components/ui/sidebar";
import { LayoutDashboard, Users, History, Wifi, MessageSquare, PieChart, Bell, LogOut } from "lucide-react";

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/transactions", label: "Transactions", icon: History },
  { href: "/admin/data-plans", label: "Data Plans", icon: Wifi },
  { href: "/admin/tickets", label: "Support Tickets", icon: MessageSquare },
  { href: "/admin/analytics", label: "Analytics", icon: PieChart },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    } else if (user.role !== "admin") {
      setLocation("/dashboard");
    }
  }, [user, location, setLocation]);

  if (!user || user.role !== "admin") return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r border-border bg-card">
          <SidebarHeader className="p-4 flex flex-row items-center border-b border-border">
            <h2 className="text-xl font-bold text-primary mr-auto">SanTech Admin</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {ADMIN_NAV_ITEMS.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={location === item.href || (location.startsWith(item.href) && item.href !== "/admin")} tooltip={item.label}>
                        <Link href={item.href} className="flex items-center gap-3 w-full">
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-border p-4">
            <SidebarMenu>
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
            <div className="ml-4 font-semibold">SanTech Admin</div>
          </header>
          <div className="p-4 md:p-8 overflow-auto flex-1">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
