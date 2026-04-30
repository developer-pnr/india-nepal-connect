import {
  LayoutDashboard, ArrowLeftRight, Users, UserCheck, BookOpen,
  TrendingUp, FileBarChart, Shield, Store, Scale, Wallet, FileText, HandCoins,
  PiggyBank, Tag, BarChart3,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Transactions", url: "/transactions", icon: ArrowLeftRight },
  { title: "Senders", url: "/senders", icon: Users },
  { title: "Payers / Shops", url: "/payers", icon: Store },
  { title: "Receivers", url: "/receivers", icon: UserCheck },
  { title: "Lending / Borrowing", url: "/lending", icon: HandCoins },
  { title: "Settlements", url: "/settlements", icon: Scale },
  { title: "My Accounts", url: "/accounts", icon: PiggyBank },
  { title: "Wallets", url: "/wallets", icon: Wallet },
  { title: "Events", url: "/events", icon: Tag },
  { title: "Statements", url: "/statements", icon: FileText },
  { title: "Ledger", url: "/ledger", icon: BookOpen },
  { title: "Rates", url: "/rates", icon: TrendingUp },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Reports", url: "/reports", icon: FileBarChart },
];

const adminItems = [
  { title: "Admin", url: "/admin", icon: Shield },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { hasRole } = useAuth();
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center gap-2">
          <div className="h-8 w-8 rounded-sm bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm font-mono">S</span>
          </div>
          {!collapsed && <span className="font-semibold text-lg tracking-tight">Setu</span>}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {hasRole("admin") && (
          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-muted/50"
                        activeClassName="bg-primary/10 text-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
