import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { MapPin, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { NotificationBell } from './NotificationBell';

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <MapPin className="h-6 w-6 text-primary" />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              GeoEstate Tanzania
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/map" className="text-sm font-medium hover:text-primary transition-colors">
              Browse Map
            </Link>
            <Link to="/listings" className="text-sm font-medium hover:text-primary transition-colors">
              All Listings
            </Link>
            <Link to="/about-us" className="text-sm font-medium hover:text-primary transition-colors">
              About
            </Link>
            <Link to="/how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
              How It Works
            </Link>
            <Link to="/contact" className="text-sm font-medium hover:text-primary transition-colors">
              Contact
            </Link>
            
            {user ? (
              <>
                <Link to="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                  Dashboard
                </Link>
                <Link to="/messages" className="text-sm font-medium hover:text-primary transition-colors">
                  Messages
                </Link>
                <Link to="/reputation" className="text-sm font-medium hover:text-primary transition-colors">
                  Reputation
                </Link>
                <Link to="/disputes" className="text-sm font-medium hover:text-primary transition-colors">
                  Disputes
                </Link>
                
                {profile?.role && ['seller', 'broker', 'admin'].includes(profile.role) && (
                  <>
                    <Link to="/payment-proofs" className="text-sm font-medium hover:text-primary transition-colors">
                      Payments
                    </Link>
                    <Link to="/subscriptions" className="text-sm font-medium hover:text-primary transition-colors">
                      Subscriptions
                    </Link>
                  </>
                )}

                {(profile?.role === 'seller' || profile?.role === 'broker') && (
                  <Link to="/apply-institutional-seller" className="text-sm font-medium hover:text-primary transition-colors">
                    Apply as Institution
                  </Link>
                )}

                {profile?.role && ['admin', 'verification_officer', 'compliance_officer'].includes(profile.role) && (
                  <>
                    <Link to="/admin-dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                      Dashboard
                    </Link>
                    <Link to="/admin/verification" className="text-sm font-medium hover:text-primary transition-colors">
                      Verify Listings
                    </Link>
                    <Link to="/admin/analytics" className="text-sm font-medium hover:text-primary transition-colors">
                      Analytics
                    </Link>
                    <Link to="/audit-logs" className="text-sm font-medium hover:text-primary transition-colors">
                      Audit Logs
                    </Link>
                    <Link to="/data-export" className="text-sm font-medium hover:text-primary transition-colors">
                      Export
                    </Link>
                  </>
                )}

                {profile?.role === 'admin' && (
                  <Link to="/institutional-sellers" className="text-sm font-medium hover:text-primary transition-colors">
                    Institutions
                  </Link>
                )}

                <Link to="/visit-requests" className="text-sm font-medium hover:text-primary transition-colors">
                  Visits
                </Link>

                {profile?.role && ['seller', 'broker', 'admin'].includes(profile.role) && (
                  <Link to="/listings/new">
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      List Property
                    </Button>
                  </Link>
                )}
                <NotificationBell />
                <Button variant="outline" size="sm" onClick={signOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="outline" size="sm">Sign In</Button>
                </Link>
                <Link to="/auth?tab=signup">
                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                    Get Started
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
              Browse Map
            </Link>
            <Link
              to="/listings"
              className="block py-2 text-sm font-medium hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              All Listings
            </Link>
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="block py-2 text-sm font-medium hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>

                {profile?.role && ['seller', 'broker', 'admin'].includes(profile.role) && (
                  <Link
                    to="/payment-proofs"
                    className="block py-2 text-sm font-medium hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Payments
                  </Link>
                )}

                {profile?.role && ['admin', 'verification_officer', 'compliance_officer'].includes(profile.role) && (
                  <>
                    <Link
                      to="/admin/payments"
                      className="block py-2 text-sm font-medium hover:text-primary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Admin Payments
                    </Link>
                    <Link
                      to="/admin/compliance"
                      className="block py-2 text-sm font-medium hover:text-primary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Compliance
                    </Link>
                  </>
                )}

                {profile?.role && ['seller', 'broker', 'admin'].includes(profile.role) && (
                  <Link
                    to="/listings/new"
                    className="block py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button size="sm" className="w-full bg-primary hover:bg-primary/90">
                      List Property
                    </Button>
                  </Link>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth?tab=signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full bg-primary hover:bg-primary/90">
                    Get Started
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
