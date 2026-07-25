import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Users,
  Bot,
  MessageCircle,
  Calendar,
  CreditCard,
  Shield,
  Settings,
  Bell,
  Home,
  Activity,
  TestTube,
  Tag,
  Phone,
  TrendingUp
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Platform",
    items: [
      { title: "Overview",   url: "/admin",            icon: Home,        exact: true },
      { title: "Analytics",  url: "/admin/analytics",  icon: BarChart3 },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Users",          url: "/admin/users",         icon: Users },
      { title: "Assistants",     url: "/admin/assistants",    icon: Bot },
      { title: "Conversations",  url: "/admin/conversations", icon: MessageCircle },
      { title: "Bookings",       url: "/admin/bookings",      icon: Calendar },
      { title: "Subscriptions",  url: "/admin/subscriptions", icon: CreditCard },
      { title: "Promo Codes",    url: "/admin/promo-codes",   icon: Tag },
    ],
  },
  {
    label: "Communications",
    items: [
      { title: "Phone Management",  url: "/admin/phone-management", icon: Phone },
      { title: "Call Analytics",    url: "/admin/call-analytics",   icon: TrendingUp },
      { title: "Phone Config",      url: "/admin/phone-config",     icon: Settings },
      { title: "WhatsApp Numbers",  url: "/admin/whatsapp-numbers", icon: MessageCircle },
      { title: "Widget Testing",    url: "/admin/widget-testing",   icon: TestTube },
    ],
  },
  {
    label: "System",
    items: [
      { title: "System Health",  url: "/admin/system",        icon: Activity },
      { title: "Security",       url: "/admin/security",      icon: Shield },
      { title: "Notifications",  url: "/admin/notifications", icon: Bell },
      { title: "Settings",       url: "/admin/settings",      icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return currentPath === path;
    return currentPath.startsWith(path);
  };

  const getNavClass = (path: string, exact?: boolean) =>
    cn(
      "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
      isActive(path, exact)
        ? "bg-primary/10 text-primary font-medium"
        : "text-muted-foreground hover:bg-accent hover:text-foreground"
    );

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      {/* Sidebar header / brand */}
      <div className={cn(
        "flex items-center border-b border-sidebar-border",
        collapsed ? "h-14 justify-center" : "h-14 px-4 gap-2"
      )}>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-foreground truncate">
            TalkWeb Admin
          </span>
        )}
        <SidebarTrigger className={cn("text-muted-foreground hover:text-foreground", !collapsed && "ml-auto")} />
      </div>

      <SidebarContent className="py-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="px-2 pb-1">
            {!collapsed && (
              <SidebarGroupLabel className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.exact}
                        className={getNavClass(item.url, item.exact)}
                        title={collapsed ? item.title : undefined}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
