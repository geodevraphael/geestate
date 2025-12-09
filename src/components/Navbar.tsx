import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Menu, X, Plus, LogOut, LayoutDashboard, FileUp, ChevronDown, ClipboardList, ShoppingBag, Wrench } from 'lucide-react';
import { useState } from 'react';
import { NotificationBell } from './NotificationBell';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { UserMenu } from './navbar/UserMenu';
import { AdminMenu } from './navbar/AdminMenu';
import { RoleSwitcher } from './RoleSwitcher';
import { SurveyPlanUploadDialog } from './SurveyPlanUploadDialog';
import { useTranslation } from 'react-i18next';
import logo from '@/assets/geoestate-logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function Navbar() {
  const { user, hasRole, signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      {/* Mobile Floating Top Nav */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 px-3 pt-[env(safe-area-inset-top)] safe-area-top">
        <div className="mt-2 mx-auto max-w-md">
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-background/70 backdrop-blur-xl border border-border/50 shadow-lg shadow-black/5 dark:shadow-black/20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group shrink-0">
              <img 
                src={logo} 
                alt="GeoEstate" 
                className="h-8 w-auto transition-transform group-hover:scale-105" 
              />
              <span className="font-display font-bold text-sm bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                GeoEstate
              </span>
            </Link>

            {/* Right Actions */}
            <div className="flex items-center gap-0.5">
              <ThemeSwitcher compact />
              <LanguageSwitcher />
              {user ? (
                <>
                  <NotificationBell />
                  <button
                    className="p-2 hover:bg-muted/80 rounded-xl transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  >
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/auth">
                    <Button size="sm" className="h-8 px-3 text-xs font-medium rounded-xl">
                      Sign In
                    </Button>
                  </Link>
                  <button
                    className="p-2 hover:bg-muted/80 rounded-xl transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  >
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="mt-2 p-3 rounded-2xl bg-background/90 backdrop-blur-xl border border-border/50 shadow-xl shadow-black/10 dark:shadow-black/30 animate-fade-in">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <Link
                  to="/deals"
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs font-medium">My Deals</span>
                </Link>
                <Link
                  to="/my-service-requests"
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <ClipboardList className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs font-medium">Requests</span>
                </Link>
                <Link
                  to="/service-providers"
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wrench className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs font-medium">Services</span>
                </Link>
              </div>

              <div className="space-y-1">
                <Link
                  to="/about-us"
                  className="flex items-center px-3 py-2.5 text-sm font-medium rounded-xl hover:bg-muted/50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.about')}
                </Link>
                <Link
                  to="/how-it-works"
                  className="flex items-center px-3 py-2.5 text-sm font-medium rounded-xl hover:bg-muted/50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.howItWorks')}
                </Link>
                <Link
                  to="/contact"
                  className="flex items-center px-3 py-2.5 text-sm font-medium rounded-xl hover:bg-muted/50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.contact')}
                </Link>
              </div>
              
              {user && (
                <>
                  <div className="h-px bg-border/50 my-3" />
                  <div className="space-y-1">
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl hover:bg-muted/50 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                      {t('nav.dashboard')}
                    </Link>
                    
                    <div className="px-1 py-1">
                      <RoleSwitcher compact />
                    </div>

                    <SurveyPlanUploadDialog 
                      trigger={
                        <button className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-xl hover:bg-muted/50 transition-colors text-left">
                          <FileUp className="h-4 w-4 text-muted-foreground" />
                          Request Listing
                        </button>
                      }
                    />

                    {(hasRole('seller') || hasRole('broker') || hasRole('admin')) && (
                      <Link
                        to="/listings/new"
                        className="block px-1 py-1"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Button size="sm" className="w-full h-10 bg-accent hover:bg-accent/90 text-accent-foreground gap-2 rounded-xl">
                          <Plus className="h-4 w-4" />
                          {t('nav.listProperty')}
                        </Button>
                      </Link>
                    )}

                    <Link
                      to={`/profile/${user.id}`}
                      className="flex items-center px-3 py-2.5 text-sm font-medium rounded-xl hover:bg-muted/50 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('nav.myProfile')}
                    </Link>
                    
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-destructive rounded-xl hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}

              {!user && (
                <>
                  <div className="h-px bg-border/50 my-3" />
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" size="sm" className="w-full h-10 rounded-xl">
                        {t('auth.signIn')}
                      </Button>
                    </Link>
                    <Link to="/auth?tab=signup" onClick={() => setMobileMenuOpen(false)}>
                      <Button size="sm" className="w-full h-10 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl">
                        {t('nav.getStarted')}
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Desktop Navigation - Unchanged */}
      <nav className="hidden md:block sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-4 md:px-6 lg:px-8">
          <div className="flex h-16 md:h-18 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <img 
                src={logo} 
                alt="GeoEstate" 
                className="h-10 md:h-12 w-auto transition-transform group-hover:scale-105" 
              />
              <span className="font-display font-bold text-lg md:text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                GeoEstate
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="flex items-center gap-1">
              <div className="flex items-center">
                <Link 
                  to="/map" 
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
                >
                  {t('nav.browseMap')}
                </Link>
                <Link 
                  to="/listings" 
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
                >
                  {t('nav.allListings')}
                </Link>
                <Link 
                  to="/sellers" 
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
                >
                  {t('nav.sellers')}
                </Link>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                      More
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-40">
                    <DropdownMenuItem asChild>
                      <Link to="/about-us" className="cursor-pointer">
                        {t('nav.about')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/how-it-works" className="cursor-pointer">
                        {t('nav.howItWorks')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/contact" className="cursor-pointer">
                        {t('nav.contact')}
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="h-6 w-px bg-border mx-2" />

              <div className="flex items-center gap-1">
                <ThemeSwitcher />
                <LanguageSwitcher />
                
                {user ? (
                  <>
                    <Link to="/dashboard">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        {t('nav.dashboard')}
                      </Button>
                    </Link>
                    
                    <RoleSwitcher />
                    <SurveyPlanUploadDialog />
                    
                    {(hasRole('seller') || hasRole('broker') || hasRole('admin')) && (
                      <Link to="/listings/new">
                        <Button size="sm" className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                          <Plus className="h-4 w-4" />
                          {t('nav.listProperty')}
                        </Button>
                      </Link>
                    )}
                    
                    <AdminMenu />
                    <NotificationBell />
                    <UserMenu />
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link to="/auth">
                      <Button variant="ghost" size="sm">{t('auth.signIn')}</Button>
                    </Link>
                    <Link to="/auth?tab=signup">
                      <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                        {t('nav.getStarted')}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile spacer to prevent content from going under fixed nav */}
      <div className="md:hidden h-14 safe-area-top" />
    </>
  );
}
