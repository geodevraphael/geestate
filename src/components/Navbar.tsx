import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Menu, X, Plus } from 'lucide-react';
import { useState } from 'react';
import { NotificationBell } from './NotificationBell';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserMenu } from './navbar/UserMenu';
import { AdminMenu } from './navbar/AdminMenu';
import { useTranslation } from 'react-i18next';
import logo from '@/assets/geoestate-logo.png';

export function Navbar() {
  const { user, hasRole } = useAuth();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-4 md:px-6">
        <div className="flex h-14 md:h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="GeoEstate" className="h-8 md:h-10 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/map" className="text-sm font-medium hover:text-primary transition-colors">
              {t('nav.browseMap')}
            </Link>
            <Link to="/listings" className="text-sm font-medium hover:text-primary transition-colors">
              {t('nav.allListings')}
            </Link>
            <Link to="/sellers" className="text-sm font-medium hover:text-primary transition-colors">
              Browse Sellers
            </Link>
            <Link to="/about-us" className="text-sm font-medium hover:text-primary transition-colors">
              {t('nav.about')}
            </Link>
            <Link to="/how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
              {t('nav.howItWorks')}
            </Link>
            <Link to="/contact" className="text-sm font-medium hover:text-primary transition-colors">
              {t('nav.contact')}
            </Link>
            
            {user ? (
              <>
                <Link to="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                  {t('nav.dashboard')}
                </Link>
                
                {(hasRole('seller') || hasRole('broker') || hasRole('admin')) && (
                  <Link to="/listings/new">
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      {t('nav.listProperty')}
                    </Button>
                  </Link>
                )}
                
                <AdminMenu />
                <NotificationBell />
                <LanguageSwitcher />
                <UserMenu />
              </>
            ) : (
              <>
                <LanguageSwitcher />
                <Link to="/auth">
                  <Button variant="outline" size="sm">{t('auth.signIn')}</Button>
                </Link>
                <Link to="/auth?tab=signup">
                  <Button size="sm">
                    {t('nav.getStarted')}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-3 border-t border-border">
            <Link
              to="/map"
              className="block py-2 text-sm font-medium hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.browseMap')}
            </Link>
            <Link
              to="/listings"
              className="block py-2 text-sm font-medium hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.allListings')}
            </Link>
            <Link
              to="/sellers"
              className="block py-2 text-sm font-medium hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Browse Sellers
            </Link>
            <Link
              to="/about-us"
              className="block py-2 text-sm font-medium hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.about')}
            </Link>
            <Link
              to="/how-it-works"
              className="block py-2 text-sm font-medium hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.howItWorks')}
            </Link>
            <Link
              to="/contact"
              className="block py-2 text-sm font-medium hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.contact')}
            </Link>
            
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="block py-2 text-sm font-medium hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.dashboard')}
                </Link>

                {(hasRole('seller') || hasRole('broker') || hasRole('admin')) && (
                  <Link
                    to="/listings/new"
                    className="block py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button size="sm" className="w-full">
                      {t('nav.listProperty')}
                    </Button>
                  </Link>
                )}

                <Link
                  to={`/profile/${user.id}`}
                  className="block py-2 text-sm font-medium hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.myProfile')}
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    {t('auth.signIn')}
                  </Button>
                </Link>
                <Link to="/auth?tab=signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full">
                    {t('nav.getStarted')}
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
