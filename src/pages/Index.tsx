import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Search, CheckCircle2, ArrowRight, Briefcase, Users, Home, ChevronDown, Navigation } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { LocationAwareWelcome } from '@/components/LocationAwareWelcome';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect, useCallback } from 'react';

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pullProgress, setPullProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  // Pull-down gesture handler
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
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

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />
      <MobileBottomNav />
      
      {/* ===== MOBILE APP VIEW ===== */}
      <div 
        ref={containerRef}
        className={`md:hidden h-[100dvh] bg-background flex flex-col transition-transform duration-300 ${
          isTransitioning ? '-translate-y-full' : ''
        }`}
        style={{ transform: isTransitioning ? 'translateY(-100%)' : `translateY(${pullProgress * 30}px)` }}
      >
        {/* Pull-down indicator */}
        <div 
          className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center py-3 z-50 transition-opacity"
          style={{ opacity: pullProgress, transform: `translateY(${-20 + pullProgress * 20}px)` }}
        >
          <div className="flex items-center gap-2 text-primary">
            <MapPin className="h-4 w-4" />
            <span className="text-xs font-medium">Pull to open map</span>
          </div>
          <ChevronDown className={`h-4 w-4 text-primary mt-1 transition-transform ${pullProgress >= 1 ? 'rotate-180' : ''}`} />
        </div>

        {/* Main Content - Fixed height, no scroll */}
        <div className="flex-1 flex flex-col px-5 pt-16 pb-6 overflow-hidden">
          {/* Compact Location Card */}
          <div className="mb-6">
            <LocationAwareWelcome />
          </div>

          {/* Hero Section */}
          <div className="flex-1 flex flex-col justify-center">
            {/* Trust Badge */}
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('home.verifiedBadge')}
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-3xl font-display font-bold tracking-tight leading-tight mb-3">
              {t('home.heroTitle1')}{' '}
              <span className="text-gradient">{t('home.heroTitle2')}</span>
              {' '}{t('home.heroTitle3')}
            </h1>
            
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              {t('home.heroSubtitle')}
            </p>

            {/* Primary Action */}
            <Link to="/map" className="block mb-4">
              <Button 
                size="lg" 
                className="w-full h-14 text-base font-semibold rounded-2xl shadow-lg shadow-primary/25 active:scale-[0.98] transition-transform"
              >
                <MapPin className="mr-2 h-5 w-5" />
                {t('home.exploreMapShort')}
                <ArrowRight className="ml-auto h-5 w-5" />
              </Button>
            </Link>

            {/* Secondary Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Link to="/listings" className="block">
                <Button 
                  variant="outline" 
                  className="w-full h-12 text-sm font-medium rounded-xl border-border/60 active:scale-[0.98] transition-transform"
                >
                  <Search className="mr-1.5 h-4 w-4" />
                  {t('home.browseListingsShort')}
                </Button>
              </Link>
              <Link to="/sellers" className="block">
                <Button 
                  variant="outline" 
                  className="w-full h-12 text-sm font-medium rounded-xl border-border/60 active:scale-[0.98] transition-transform"
                >
                  <Users className="mr-1.5 h-4 w-4" />
                  {t('home.viewSellersShort')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Bottom Pull Hint */}
          <div className="flex flex-col items-center pt-4 animate-bounce">
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground mt-1">Swipe down for map</span>
          </div>
        </div>
      </div>
      
      {/* ===== DESKTOP VIEW - UNCHANGED ===== */}
      <section className="hidden md:flex relative min-h-screen items-center justify-center overflow-hidden">
        {/* Desktop Animated Background Mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/20 to-background">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-1/3 -right-20 w-[500px] h-[500px] bg-accent/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        {/* Desktop Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />

        {/* Desktop Content */}
        <div className="container relative z-10 mx-auto px-6 py-20">
          <div className="max-w-5xl mx-auto">
            {/* Location-Aware Welcome */}
            <div className="mb-8 max-w-md animate-fade-in" style={{ animationDelay: '0.5s' }}>
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
            
            <p className="text-xl lg:text-2xl text-muted-foreground mb-12 max-w-3xl leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              {t('home.heroSubtitle')}
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-row gap-4 mb-16 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
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