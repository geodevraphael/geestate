import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Menu, X, Plus, LogOut, LayoutDashboard, FileUp, ChevronDown } from 'lucide-react';
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
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-4 md:px-6 lg:px-8">
        <div className="flex h-16 md:h-18 items-center justify-between">
          {/* Logo - Bigger and more prominent */}
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src={logo} 
              alt="GeoEstate" 
              className="h-10 md:h-12 w-auto transition-transform group-hover:scale-105" 
            />
            <span className="hidden sm:block font-display font-bold text-lg md:text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              GeoEstate
            </span>
          </Link>

          {/* Mobile Top Actions - Streamlined */}
          <div className="md:hidden flex items-center gap-1">
            <ThemeSwitcher compact />
            <LanguageSwitcher />
            {user ? (
              <>
                <RoleSwitcher compact />
                <SurveyPlanUploadDialog 
                  trigger={
                    <Button variant="ghost" size="icon" className="h-9 w-9 touch-feedback">
                      <FileUp className="h-5 w-5" />
                    </Button>
                  }
                />
                <NotificationBell />
              </>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="h-9 px-4 touch-feedback font-medium">
                  Sign In
                </Button>
              </Link>
            )}
            <button
              className="ml-1 p-2 hover:bg-muted rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Desktop Navigation - Modernized */}
          <div className="hidden md:flex items-center gap-1">
            {/* Main Nav Links */}
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
              
              {/* More dropdown for less important links */}
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
            
            {/* Separator */}
            <div className="h-6 w-px bg-border mx-2" />

            {/* Actions */}
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

        {/* Mobile Menu - Enhanced */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-1 border-t border-border animate-fade-in">
            <Link
              to="/map"
              className="flex items-center px-4 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.browseMap')}
            </Link>
            <Link
              to="/listings"
              className="flex items-center px-4 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.allListings')}
            </Link>
            <Link
              to="/sellers"
              className="flex items-center px-4 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.sellers')}
            </Link>
            <Link
              to="/about-us"
              className="flex items-center px-4 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.about')}
            </Link>
            <Link
              to="/how-it-works"
              className="flex items-center px-4 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.howItWorks')}
            </Link>
            <Link
              to="/contact"
              className="flex items-center px-4 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.contact')}
            </Link>
            
            <div className="h-px bg-border my-2" />
            
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {t('nav.dashboard')}
                </Link>

                <div className="px-4 py-2">
                  <SurveyPlanUploadDialog 
                    trigger={
                      <Button variant="outline" size="sm" className="w-full gap-2 h-11">
                        <FileUp className="h-4 w-4" />
                        Request Listing
                      </Button>
                    }
                  />
                </div>

                {(hasRole('seller') || hasRole('broker') || hasRole('admin')) && (
                  <Link
                    to="/listings/new"
                    className="block px-4 py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button size="sm" className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
                      <Plus className="h-4 w-4" />
                      {t('nav.listProperty')}
                    </Button>
                  </Link>
                )}

                <Link
                  to={`/profile/${user.id}`}
                  className="flex items-center px-4 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.myProfile')}
                </Link>
                
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="px-4 py-2 space-y-2">
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full h-11">
                    {t('auth.signIn')}
                  </Button>
                </Link>
                <Link to="/auth?tab=signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground">
                    {t('nav.getStarted')}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
