import {
  LayoutDashboard, Users, ArrowLeftRight, UsersRound, ClipboardList,
  Wrench, Settings, ArrowLeft,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard, end: true },
  { title: "Users & Roles", url: "/admin/users", icon: Users },
  { title: "Transactions", url: "/admin/transactions", icon: ArrowLeftRight },
  { title: "Parties", url: "/admin/parties", icon: UsersRound },
  { title: "Audit Logs", url: "/admin/audit", icon: ClipboardList },
  { title: "Maintenance", url: "/admin/maintenance", icon: Wrench },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center gap-2">
          <div className="h-8 w-8 rounded-sm bg-destructive flex items-center justify-center">
            <span className="text-destructive-foreground font-bold text-sm font-mono">A</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-sm tracking-tight">Setu Admin</span>
              <span className="text-[10px] text-muted-foreground uppercase">Control Panel</span>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className="hover:bg-muted/50"
                      activeClassName="bg-destructive/10 text-destructive font-medium"
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

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" className="hover:bg-muted/50" activeClassName="">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Back to App</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
