import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Home,
  Bot,
  Calendar,
  BarChart3,
  Star,
  MessageSquare,
  FileText,
  Briefcase,
  
  Settings,
  Plus,
  Edit,
  Users,
  Mic,
  Palette,
  UserCircle,
  Key,
  ChevronDown,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  Link as LinkIcon,
  Sparkles,
  Sun,
  Moon,
  BookOpen,
  History,
  ShieldCheck,
  Mail,
  
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardSidebarProps {
  selectedAssistantId?: string;
  activeView?: string;
  onViewChange?: (view: string) => void;
}

export function DashboardSidebar({
  selectedAssistantId,
  activeView,
  onViewChange,
}: DashboardSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  
  // Dashboard mode: 'basic' or 'advanced'
  const [dashboardMode, setDashboardMode] = useState<'basic' | 'advanced'>(() => {
    const saved = localStorage.getItem('dashboardMode');
    return (saved === 'advanced') ? 'advanced' : 'basic';
  });

  // Persist mode to localStorage
  useEffect(() => {
    localStorage.setItem('dashboardMode', dashboardMode);
  }, [dashboardMode]);

  const isAdvanced = dashboardMode === 'advanced';
  const isDark = theme === 'dark';

  const isActive = (path: string) => {
    if (activeView) {
      return activeView === path;
    }
    return currentPath.includes(path);
  };

  const getNavClass = (path: string) => {
    return isActive(path)
      ? "bg-primary/10 text-primary font-medium rounded-md"
      : "text-muted-foreground hover:bg-accent hover:text-foreground rounded-md transition-colors duration-150";
  };

  const handleNavClick = (view: string) => {
    if (onViewChange) {
      onViewChange(view);
    }
    // Close mobile drawer after navigation
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  // Determine which sections should be open based on current route/view
  const isAssistantsOpen = isActive("assistants") || isActive("create-assistant") || isActive("edit-assistant");
  const isBookingsOpen = isActive("bookings") || isActive("consultation");
  const isReviewsActive = isActive("reviews");
  const isBrandingActive = isActive("branding");
  
  const isSettingsOpen = isActive("settings") || isActive("profile") || isActive("api-keys");

  // Theme toggle component
  const ThemeToggle = () => (
    <div className={cn(
      "flex items-center mx-2 mb-1 px-2 py-1.5 rounded-md",
      collapsed ? "justify-center" : "justify-between"
    )}>
      {!collapsed && (
        <span className="text-xs text-muted-foreground">
          {isDark ? 'Dark mode' : 'Light mode'}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDark ? (
          <Sun className="h-3.5 w-3.5" />
        ) : (
          <Moon className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );

  // Mode toggle component
  const ModeToggle = () => (
    <div className={cn(
      "flex items-center mx-2 my-2 px-3 py-2 rounded-md border border-border/70 bg-card",
      collapsed ? "justify-center px-2" : "gap-2"
    )}>
      {!collapsed && (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">
              {isAdvanced ? 'Advanced' : 'Basic'}
            </span>
          </div>
          <Switch
            checked={isAdvanced}
            onCheckedChange={(checked) => setDashboardMode(checked ? 'advanced' : 'basic')}
            className="scale-90 data-[state=checked]:bg-primary"
          />
        </div>
      )}
      {collapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDashboardMode(isAdvanced ? 'basic' : 'advanced')}
          className={cn(
            "h-7 w-7",
            isAdvanced ? "text-primary" : "text-muted-foreground"
          )}
          title={isAdvanced ? "Switch to Basic" : "Switch to Advanced"}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );

  // Basic mode menu - simplified for non-technical users
  const BasicMenuContent = () => (
    <div className="space-y-1 py-4">
      {!collapsed && (
        <div className="pb-1.5 px-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Dashboard
          </span>
        </div>
      )}
      <div className="space-y-1 px-2">
        {/* Overview */}
        <Button
          variant="ghost"
          onClick={() => handleNavClick("overview")}
          className={cn("w-full justify-start", getNavClass("overview"))}
          title={collapsed ? "Overview" : undefined}
        >
          <Home className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && "Overview"}
        </Button>

        {/* Create Assistant */}
        <Button
          variant="ghost"
          onClick={() => handleNavClick("create-assistant")}
          className={cn("w-full justify-start", getNavClass("create-assistant"))}
          title={collapsed ? "Create Assistant" : undefined}
        >
          <Plus className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && "Create Assistant"}
        </Button>

        {/* Edit Assistant */}
        <Button
          variant="ghost"
          onClick={() => handleNavClick("edit-assistant")}
          className={cn("w-full justify-start", getNavClass("edit-assistant"))}
          title={collapsed ? "Edit Assistant" : undefined}
        >
          <Edit className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && "Edit Assistant"}
        </Button>

        {/* Knowledge Base, Branding, Meeting Links remain below — Team/Departments/Prompt History/Audit Log/Advanced Analytics are Advanced-mode only */}

        {/* Knowledge Base */}
        <Button
          variant="ghost"
          onClick={() => handleNavClick("knowledge-base")}
          className={cn("w-full justify-start", getNavClass("knowledge-base"))}
          title={collapsed ? "Knowledge Base" : undefined}
        >
          <BookOpen className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && "Knowledge Base"}
        </Button>

        {/* Branding */}
        <Button
          variant="ghost"
          onClick={() => handleNavClick("branding")}
          className={cn("w-full justify-start", getNavClass("branding"))}
          title={collapsed ? "Branding" : undefined}
        >
          <Palette className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && "Branding"}
        </Button>

        {/* Meeting Links */}
        <Button
          variant="ghost"
          onClick={() => handleNavClick("meeting-links")}
          className={cn("w-full justify-start", getNavClass("meeting-links"))}
          title={collapsed ? "Meeting Links" : undefined}
        >
          <LinkIcon className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && "Meeting Links"}
        </Button>
      </div>
    </div>
  );

  // Advanced mode menu - full features
  const AdvancedMenuContent = () => (
    <div className="space-y-1 py-4">
      {!collapsed && (
        <div className="pb-1.5 px-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Dashboard
          </span>
        </div>
      )}
      <div className="space-y-1 px-2">
        {/* Overview - Non-expandable */}
        <Button
          variant="ghost"
          onClick={() => handleNavClick("overview")}
          className={cn("w-full justify-start", getNavClass("overview"))}
          title={collapsed ? "Overview" : undefined}
        >
          <Home className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && "Overview"}
        </Button>

        {/* Section Header: Sales & Leads */}
        {!collapsed && (
          <div className="pt-5 pb-1.5 px-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Sales &amp; Leads
            </span>
          </div>
        )}

        {/* Assistants - Expandable on desktop, simple button when collapsed */}
        {collapsed ? (
          <Button
            variant="ghost"
            onClick={() => handleNavClick("assistants")}
            className={cn("w-full justify-start", getNavClass("assistants"))}
            title="Assistants"
          >
            <Bot className="h-4 w-4" />
          </Button>
        ) : (
          <Collapsible defaultOpen={isAssistantsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <div className="flex items-center">
                  <Bot className="mr-2 h-4 w-4" />
                  Assistants
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-6 mt-1 space-y-1">
              <Button
                variant="ghost"
                onClick={() => handleNavClick("create-assistant")}
                className={cn("w-full justify-start text-sm", getNavClass("create-assistant"))}
              >
                <Plus className="mr-2 h-3 w-3" />
                Create New
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleNavClick("assistants")}
                className={cn("w-full justify-start text-sm", getNavClass("assistants"))}
              >
                <Bot className="mr-2 h-3 w-3" />
                Manage
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleNavClick("edit-assistant")}
                className={cn("w-full justify-start text-sm", getNavClass("edit-assistant"))}
              >
                <Edit className="mr-2 h-3 w-3" />
                Edit Assistant
              </Button>
              {/* Advanced Analytics merged into the main Analytics view (Trends & Topics tab) */}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Workspace & Governance group (Advanced mode only) */}
        {!collapsed && (
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between mt-1">
                <div className="flex items-center">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Workspace & Governance
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-6 mt-1 space-y-1">
              <Button
                variant="ghost"
                onClick={() => handleNavClick("team")}
                className={cn("w-full justify-start text-sm", getNavClass("team"))}
              >
                <Users className="mr-2 h-3 w-3" />
                Team & Roles
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleNavClick("departments")}
                className={cn("w-full justify-start text-sm", getNavClass("departments"))}
              >
                <Briefcase className="mr-2 h-3 w-3" />
                Departments
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleNavClick("prompt-history")}
                className={cn("w-full justify-start text-sm", getNavClass("prompt-history"))}
              >
                <History className="mr-2 h-3 w-3" />
                Prompt History
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleNavClick("audit-log")}
                className={cn("w-full justify-start text-sm", getNavClass("audit-log"))}
              >
                <ShieldCheck className="mr-2 h-3 w-3" />
                Audit Log
              </Button>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Analytics - Single non-expandable item */}
        <Button
          variant="ghost"
          onClick={() => handleNavClick("analytics")}
          className={cn("w-full justify-start", getNavClass("analytics"))}
          title={collapsed ? "Analytics" : undefined}
        >
          <BarChart3 className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && "Analytics"}
        </Button>

        {/* Bookings - Expandable on desktop, simple button when collapsed */}
        {collapsed ? (
          <Button
            variant="ghost"
            onClick={() => handleNavClick("bookings")}
            className={cn("w-full justify-start", getNavClass("bookings"))}
            title="Bookings"
          >
            <Calendar className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={() => handleNavClick("bookings")}
            className={cn("w-full justify-start", getNavClass("bookings"))}
            title={collapsed ? "Bookings" : undefined}
          >
            <Calendar className={cn("h-4 w-4", !collapsed && "mr-2")} />
            {!collapsed && "Bookings"}
          </Button>
        )}


        {/* Reviews - Standalone */}
        <Button
          variant="ghost"
          onClick={() => handleNavClick("reviews")}
          className={cn("w-full justify-start", getNavClass("reviews"))}
          title={collapsed ? "Reviews" : undefined}
        >
          <Star className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && "Reviews"}
        </Button>

        {/* Branding - Standalone */}
        <Button
          variant="ghost"
          onClick={() => handleNavClick("branding")}
          className={cn("w-full justify-start", getNavClass("branding"))}
          title={collapsed ? "Branding" : undefined}
        >
          <Palette className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && "Branding"}
        </Button>

        {/* Knowledge Base */}
        <Button
          variant="ghost"
          onClick={() => handleNavClick("knowledge-base")}
          className={cn("w-full justify-start", getNavClass("knowledge-base"))}
          title={collapsed ? "Knowledge Base" : undefined}
        >
          <BookOpen className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && "Knowledge Base"}
        </Button>

        {/* Content */}
        <Button
          variant="ghost"
          onClick={() => handleNavClick("content")}
          className={cn("w-full justify-start", getNavClass("content"))}
          title={collapsed ? "Content" : undefined}
        >
          <FileText className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && "Content"}
        </Button>

        {/* Services */}
        <Button
          variant="ghost"
          onClick={() => handleNavClick("services")}
          className={cn("w-full justify-start", getNavClass("services"))}
          title={collapsed ? "Services" : undefined}
        >
          <Briefcase className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && "Services"}
        </Button>

        {/* Section Header: Data Collection */}
        {!collapsed && (
          <div className="pt-5 pb-1.5 px-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Data Collection
            </span>
          </div>
        )}

        {/* Voice Forms */}
        <Button
          variant="ghost"
          onClick={() => handleNavClick("voice-forms")}
          className={cn("w-full justify-start", getNavClass("voice-forms"))}
          title={collapsed ? "Voice Forms" : undefined}
        >
          <Mic className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && (
            <span className="flex items-center gap-2">
              Voice Forms
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/40">Beta</Badge>
            </span>
          )}
        </Button>

        {/* WhatsApp Channel */}
        <Button
          variant="ghost"
          onClick={() => handleNavClick("whatsapp")}
          className={cn("w-full justify-start", getNavClass("whatsapp"))}
          title={collapsed ? "WhatsApp" : undefined}
        >
          <MessageSquare className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && (
            <span className="flex items-center gap-2">
              WhatsApp
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/40">Beta</Badge>
            </span>
          )}
        </Button>

        {/* Email Inbox */}
        <Button
          variant="ghost"
          onClick={() => handleNavClick("email-inbox")}
          className={cn("w-full justify-start", getNavClass("email-inbox"))}
          title={collapsed ? "Email Inbox" : undefined}
        >
          <Mail className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && (
            <span className="flex items-center gap-2">
              Email Inbox
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/40">New</Badge>
            </span>
          )}
        </Button>

        {/* Section Divider before Settings */}
        {!collapsed && (
          <div className="pt-5 pb-1.5 px-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Configuration
            </span>
          </div>
        )}

        {/* Settings - Expandable on desktop, simple button when collapsed */}
        {collapsed ? (
          <Button
            variant="ghost"
            onClick={() => handleNavClick("settings")}
            className={cn("w-full justify-start", getNavClass("settings"))}
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        ) : (
          <Collapsible defaultOpen={isSettingsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <div className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-6 mt-1 space-y-1">
              <Button
                variant="ghost"
                onClick={() => handleNavClick("settings")}
                className={cn("w-full justify-start text-sm", getNavClass("settings"))}
              >
                <Settings className="mr-2 h-3 w-3" />
                General
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleNavClick("profile")}
                className={cn("w-full justify-start text-sm", getNavClass("profile"))}
              >
                <UserCircle className="mr-2 h-3 w-3" />
                Profile
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleNavClick("api-keys")}
                className={cn("w-full justify-start text-sm", getNavClass("api-keys"))}
              >
                <Key className="mr-2 h-3 w-3" />
                API Keys
              </Button>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );

  // Mobile: Sheet overlay
  if (isMobile) {
    return (
      <>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed top-5 left-4 z-50 md:hidden shadow-lg"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="px-4 py-6 border-b">
              <SheetTitle>Dashboard Menu</SheetTitle>
            </SheetHeader>
            <ModeToggle />
            <ThemeToggle />
            <div className="overflow-y-auto h-[calc(100vh-12rem)]">
              {isAdvanced ? <AdvancedMenuContent /> : <BasicMenuContent />}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: Collapsible sidebar
  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-primary font-semibold">
              Dashboard
            </SidebarGroupLabel>
          )}
          <ModeToggle />
          <ThemeToggle />
          <SidebarGroupContent>
            {isAdvanced ? <AdvancedMenuContent /> : <BasicMenuContent />}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}