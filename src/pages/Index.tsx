import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Search, CheckCircle2, ArrowRight, Briefcase, Users, Home, ChevronDown, Navigation, Building2, FileText, Shield } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { LocationAwareWelcome } from '@/components/LocationAwareWelcome';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect, useCallback } from 'react';
import mobileHeroImage from '@/assets/mobile-hero-property.jpg';

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pullProgress, setPullProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  // Pull-down gesture handler for map navigation
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const target = e.target as HTMLElement;
    const scrollContainer = target.closest('[data-scroll-container]');
    if (scrollContainer && scrollContainer.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPullingRef.current) return;
    
    const deltaY = e.touches[0].clientY - startYRef.current;
    if (deltaY > 0) {
      const progress = Math.min(deltaY / 150, 1);
      setPullProgress(progress);
      
      if (progress >= 1) {
        isPullingRef.current = false;
        setIsTransitioning(true);
        setTimeout(() => navigate('/map'), 300);
      }
    }
  }, [navigate]);

  const handleTouchEnd = useCallback(() => {
    isPullingRef.current = false;
    if (pullProgress < 1) {
      setPullProgress(0);
    }
  }, [pullProgress]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const quickActions = [
    {
      icon: MapPin,
      label: t('home.exploreMapShort'),
      sublabel: 'Interactive map',
      to: '/map',
      color: 'bg-primary/10 text-primary',
    },
    {
      icon: Search,
      label: t('home.browseListingsShort'),
      sublabel: 'All properties',
      to: '/listings',
      color: 'bg-accent/10 text-accent',
    },
    {
      icon: Users,
      label: t('home.viewSellersShort'),
      sublabel: 'Verified sellers',
      to: '/sellers',
      color: 'bg-success/10 text-success',
    },
    {
      icon: Briefcase,
      label: 'Services',
      sublabel: 'Find providers',
      to: '/service-providers',
      color: 'bg-secondary text-secondary-foreground',
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />
      <MobileBottomNav />
      
      {/* ===== MOBILE APP VIEW ===== */}
      <div 
        ref={containerRef}
        className={`md:hidden h-[100dvh] bg-background flex flex-col transition-all duration-300 ${
          isTransitioning ? 'opacity-0 -translate-y-8' : ''
        }`}
      >
        {/* Pull-down indicator */}
        <div 
          className="absolute top-14 left-0 right-0 flex flex-col items-center justify-center py-2 z-50 transition-all pointer-events-none"
          style={{ opacity: pullProgress, transform: `translateY(${-10 + pullProgress * 10}px)` }}
        >
          <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg">
            <MapPin className="h-4 w-4" />
            <span className="text-xs font-semibold">Release to open map</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div 
          data-scroll-container
          className="flex-1 overflow-y-auto pt-14 pb-24"
          style={{ transform: `translateY(${pullProgress * 20}px)` }}
        >
          {/* Hero Section with Image */}
          <div className="relative h-56 overflow-hidden">
            <img 
              src={mobileHeroImage} 
              alt="Premium Property" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            
            {/* Floating Location Card */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-card/95 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-border/50">
                <LocationAwareWelcome />
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-4 -mt-2 relative z-10">
            <Link to="/listings">
              <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm active:scale-[0.98] transition-transform">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Search properties</p>
                  <p className="text-xs text-muted-foreground">Location, price, size...</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>
          </div>

          {/* Quick Actions Grid */}
          <div className="px-4 mt-6">
            <h2 className="text-sm font-semibold text-foreground mb-3 px-1">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link key={action.to} to={action.to}>
                  <div className="bg-card border border-border/60 rounded-2xl p-4 active:scale-[0.97] transition-transform">
                    <div className={`h-11 w-11 rounded-xl ${action.color} flex items-center justify-center mb-3`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{action.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{action.sublabel}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Trust Section */}
          <div className="px-4 mt-6">
            <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-4 border border-primary/10">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground">{t('home.verifiedBadge')}</span>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('home.heroSubtitle')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Featured Categories */}
          <div className="px-4 mt-6">
            <h2 className="text-sm font-semibold text-foreground mb-3 px-1">Browse by Type</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {[
                { icon: Building2, label: 'Commercial', count: '120+' },
                { icon: Home, label: 'Residential', count: '450+' },
                { icon: MapPin, label: 'Land', count: '890+' },
                { icon: FileText, label: 'Projects', count: '45+' },
              ].map((category, idx) => (
                <Link key={idx} to="/listings" className="flex-shrink-0">
                  <div className="bg-card border border-border/60 rounded-2xl px-5 py-4 text-center min-w-[100px] active:scale-[0.97] transition-transform">
                    <category.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="text-xs font-semibold text-foreground">{category.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{category.count}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Map CTA */}
          <div className="px-4 mt-6 mb-6">
            <Link to="/map">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-5 w-5 text-primary-foreground" />
                    <span className="text-xs font-medium text-primary-foreground/80 uppercase tracking-wider">Featured</span>
                  </div>
                  <h3 className="text-lg font-bold text-primary-foreground mb-1">
                    {t('home.exploreMap')}
                  </h3>
                  <p className="text-sm text-primary-foreground/80 mb-4">
                    View all properties on an interactive map
                  </p>
                  <div className="inline-flex items-center gap-2 bg-primary-foreground/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                    <span className="text-sm font-semibold text-primary-foreground">Open Map</span>
                    <ArrowRight className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
                {/* Decorative elements */}
                <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-primary-foreground/10" />
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-foreground/5" />
              </div>
            </Link>
          </div>

          {/* Pull hint at bottom */}
          <div className="flex flex-col items-center py-4 opacity-50">
            <ChevronDown className="h-5 w-5 text-muted-foreground animate-bounce" />
            <span className="text-[10px] text-muted-foreground">Pull down for map</span>
          </div>
        </div>
      </div>
      
      {/* ===== DESKTOP VIEW - UNCHANGED ===== */}
      <section className="hidden md:flex relative min-h-screen items-center justify-center overflow-hidden">
        {/* Desktop Animated Background Mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/20 to-background">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-1/3 -right-20 w-[500px] h-[500px] bg-accent/15 rounded-full blur-3xl animate-float" style={{
          animationDelay: '1s'
        }} />
          <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-float" style={{
          animationDelay: '2s'
        }} />
        </div>

        {/* Desktop Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />

        {/* Desktop Content */}
        <div className="container relative z-10 mx-auto px-6 py-20">
          <div className="max-w-5xl mx-auto">
            {/* Location-Aware Welcome */}
            <div className="mb-8 max-w-md animate-fade-in" style={{
            animationDelay: '0.5s'
          }}>
              <LocationAwareWelcome />
            </div>

            {/* Trust Badge */}
            <div className="mb-8 inline-flex items-center gap-2 px-5 py-2.5 glass rounded-full animate-fade-in border border-primary/20 text-sm">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </div>
              <span className="text-sm font-semibold text-primary">{t('home.verifiedBadge')}</span>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </div>
            
            {/* Main Heading */}
            <h1 className="text-7xl lg:text-8xl font-display font-bold mb-8 leading-[1.1] animate-fade-in-up">
              {t('home.heroTitle1')}{' '}
              <span className="relative inline-block">
                <span className="text-gradient">{t('home.heroTitle2')}</span>
                <svg className="absolute -bottom-2 left-0 w-full" height="12" viewBox="0 0 300 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 10C80 4 220 4 298 10" stroke="hsl(38 92% 50%)" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
              {' '}{t('home.heroTitle3')}
            </h1>
            
            <p className="text-xl lg:text-2xl text-muted-foreground mb-12 max-w-3xl leading-relaxed animate-fade-in-up" style={{
            animationDelay: '0.2s'
          }}>
              {t('home.heroSubtitle')}
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-row gap-4 mb-16 animate-fade-in-up" style={{
            animationDelay: '0.4s'
          }}>
              <Link to="/map" className="group">
                <Button size="lg" className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-105">
                  <MapPin className="mr-2 h-6 w-6 group-hover:rotate-12 transition-transform" />
                  {t('home.exploreMap')}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/listings" className="group">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg glass hover:bg-primary/10 border-2 border-border hover:border-primary/50 transition-all duration-300">
                  <Search className="mr-2 h-6 w-6" />
                  {t('home.browseListings')}
                </Button>
              </Link>
              <Link to="/sellers" className="group">
                <Button size="lg" variant="secondary" className="h-14 px-8 text-lg hover:bg-secondary/80 transition-all duration-300">
                  <Users className="mr-2 h-6 w-6" />
                  {t('home.viewSellers')}
                </Button>
              </Link>
              <Link to="/service-providers" className="group">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg glass hover:bg-primary/10 border-2 border-border hover:border-primary/50 transition-all duration-300">
                  <Briefcase className="mr-2 h-6 w-6" />
                  Service Providers
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
export default Index;
