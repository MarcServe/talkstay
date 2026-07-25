import { Button } from "@/components/ui/button";
import { Sparkles, LayoutDashboard, Moon, Sun, ChevronDown, Menu, X, MessageSquare } from "lucide-react";
import { useTheme } from "next-themes";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/utils/translations";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const navLinks = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
            For Organisations <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem asChild>
            <Link to="/for-organisations" className="w-full font-medium">Overview</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/sectors/universities" className="w-full">Universities</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/sectors/nhs" className="w-full">NHS &amp; Healthcare</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/sectors/councils" className="w-full">Councils</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/sectors/housing-charities" className="w-full">Housing &amp; Charities</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/sectors/hr" className="w-full">HR &amp; Professional Services</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/sectors/accessibility" className="w-full">Accessibility-First Orgs</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
            Solutions <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem asChild>
            <Link to="/use-cases" className="w-full">Use Cases</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/features" className="w-full">Features</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/languages" className="w-full">Languages</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/voice-form-demo" className="w-full">Voice Forms</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <a href="https://talkweb.io/preview/05750dee-98db-460b-a235-db5ef7bcef2d?mode=widget-only" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors text-sm font-semibold">
        Try It Live
      </a>
      <Link to="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
        How It Works
      </Link>
      <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
        Pricing
      </Link>
    </>
  );

  return (
    <header className="border-b border-glass bg-glass/50 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2" aria-label="TalkWeb Home">
          <img src="/lovable-uploads/d8670dc7-02cf-487b-8267-ebcdb13bffb5.png" alt="TalkWeb Logo" className="w-12 h-12 md:w-16 md:h-16" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center space-x-6" aria-label="Main navigation">
          {navLinks}
        </nav>

        <div className="flex items-center space-x-2 md:space-x-3">
          {/* Book a Discovery Call CTA - desktop */}
          <Link to="/book-demo" className="hidden md:block">
            <Button variant="hero" size="sm" className="gap-1 text-xs md:text-sm">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Book a Discovery Call
            </Button>
          </Link>

          <Button variant="ghost" size="sm" onClick={toggleTheme} className="p-2" aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <LanguageSelector variant="compact" className="hidden md:flex" />

          {user ? (
            <>
              <Link to="/dashboard" className="block">
                <Button variant="ghost" size="sm" className="gap-1 md:gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('nav_dashboard', 'Dashboard')}</span>
                </Button>
              </Link>
              <ProfileDropdown
                onProfileClick={() => navigate('/dashboard?tab=profile')}
                onSignOut={() => { signOut(); navigate('/auth'); }}
              />
            </>
          ) : (
            <Link to="/auth" className="hidden md:block">
              <Button variant="ghost" size="sm" className="text-xs md:text-sm">
                {t('nav_sign_in', 'Sign In')}
              </Button>
            </Link>
          )}

          {/* Mobile menu toggle */}
          <Button variant="ghost" size="sm" className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3" aria-label="Mobile navigation">
          <p className="text-xs uppercase tracking-widest text-muted-foreground/70 pt-2">For Organisations</p>
          <Link to="/for-organisations" className="block text-sm py-1.5 font-medium hover:text-foreground" onClick={() => setMobileOpen(false)}>Overview</Link>
          <Link to="/sectors/universities" className="block text-sm py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Universities</Link>
          <Link to="/sectors/nhs" className="block text-sm py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>NHS &amp; Healthcare</Link>
          <Link to="/sectors/councils" className="block text-sm py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Councils</Link>
          <Link to="/sectors/housing-charities" className="block text-sm py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Housing &amp; Charities</Link>
          <Link to="/sectors/hr" className="block text-sm py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>HR &amp; Professional Services</Link>
          <Link to="/sectors/accessibility" className="block text-sm py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Accessibility-First Orgs</Link>

          <p className="text-xs uppercase tracking-widest text-muted-foreground/70 pt-3">Solutions</p>
          <Link to="/use-cases" className="block text-sm py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Use Cases</Link>
          <Link to="/features" className="block text-sm py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Features</Link>
          <Link to="/languages" className="block text-sm py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Languages</Link>
          <Link to="/voice-form-demo" className="block text-sm py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Voice Forms</Link>

          <a href="https://talkweb.io/preview/05750dee-98db-460b-a235-db5ef7bcef2d?mode=widget-only" target="_blank" rel="noopener noreferrer" className="block text-sm py-2 font-semibold text-primary hover:text-primary/80" onClick={() => setMobileOpen(false)}>Try It Live</a>
          <Link to="/how-it-works" className="block text-sm py-2 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>How It Works</Link>
          <Link to="/pricing" className="block text-sm py-2 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Pricing</Link>
          <Link to="/feedback" className="flex items-center gap-2 text-sm py-2 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
            Send Feedback
          </Link>
          <Link to="/book-demo" onClick={() => setMobileOpen(false)}>
            <Button variant="hero" size="sm" className="w-full gap-1 mt-2">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Book a Discovery Call
            </Button>
          </Link>
          {!user && (
            <Link to="/auth" className="block text-sm py-2 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>
              Sign In
            </Link>
          )}
        </nav>
      )}
    </header>
  );
};
