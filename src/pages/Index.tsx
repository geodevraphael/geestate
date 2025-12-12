import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Search, CheckCircle2, ArrowRight, Briefcase, Users, Building2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { LocationAwareWelcome } from '@/components/LocationAwareWelcome';
import { useTranslation } from 'react-i18next';

const Index = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />
      <MobileBottomNav />
      
      {/* Hero Section - Desktop keeps original, Mobile gets modern app-like design */}
      <section className="relative min-h-[100dvh] md:min-h-screen flex items-center justify-center overflow-hidden">
        
        {/* Mobile Hero Background - Full bleed gradient with animated shapes */}
        <div className="absolute inset-0 md:hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
          <div className="absolute top-0 left-0 right-0 h-[45vh] bg-gradient-to-br from-primary/8 via-accent/5 to-transparent" />
          <div className="absolute top-20 -right-16 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-40 -left-20 w-48 h-48 bg-primary/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        {/* Desktop Animated Background Mesh - Unchanged */}
        <div className="hidden md:block absolute inset-0 bg-gradient-to-br from-background via-secondary/20 to-background">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-1/3 -right-20 w-[500px] h-[500px] bg-accent/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        {/* Desktop Grid Pattern Overlay - Unchanged */}
        <div className="hidden md:block absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />

        {/* Mobile Content Layout */}
        <div className="md:hidden relative z-10 w-full h-full flex flex-col px-5 pt-16 pb-32">
          {/* Mobile Top Section - Location Welcome */}
          <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <LocationAwareWelcome />
          </div>

          {/* Mobile App Shell Card */}
          <div className="mt-6 flex-1 flex flex-col justify-end">
            <div className="bg-card/90 backdrop-blur-xl rounded-3xl border border-border/60 shadow-xl px-5 py-6 space-y-5">
              {/* Mobile Trust Badge - Inside card */}
              <div className="flex items-center gap-2">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </div>
                <span className="text-[11px] font-medium text-foreground/80 tracking-wide uppercase">
                  {t('home.verifiedBadge')}
                </span>
              </div>

              {/* Mobile Hero Text */}
              <div className="space-y-3">
                <h1 className="text-2xl font-display font-semibold tracking-tight leading-snug">
                  {t('home.heroTitle1')}{' '}
                  <span className="text-gradient">{t('home.heroTitle2')}</span>
                  {' '}{t('home.heroTitle3')}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('home.heroSubtitle')}
                </p>
              </div>

              {/* Mobile CTA Buttons - App-like stacked layout */}
              <div className="space-y-3 pt-2">
                {/* Primary CTA - Prominent */}
                <Link to="/map" className="block">
                  <Button
                    size="lg"
                    className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
                  >
                    <MapPin className="mr-2 h-5 w-5" />
                    {t('home.exploreMapShort')}
                    <ArrowRight className="ml-auto h-5 w-5" />
                  </Button>
                </Link>

                {/* Secondary CTAs - 2x2 Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <Link to="/listings" className="block">
                    <Button
                      variant="outline"
                      className="w-full h-12 text-sm font-medium rounded-xl border-border/60 bg-card/60 backdrop-blur-sm active:scale-[0.98] transition-transform"
                    >
                      <Search className="mr-1.5 h-4 w-4" />
                      {t('home.browseListingsShort')}
                    </Button>
                  </Link>
                  <Link to="/sellers" className="block">
                    <Button
                      variant="outline"
                      className="w-full h-12 text-sm font-medium rounded-xl border-border/60 bg-card/60 backdrop-blur-sm active:scale-[0.98] transition-transform"
                    >
                      <Users className="mr-1.5 h-4 w-4" />
                      {t('home.viewSellersShort')}
                    </Button>
                  </Link>
                </div>

                {/* Tertiary CTA */}
                <Link to="/service-providers" className="block">
                  <Button
                    variant="ghost"
                    className="w-full h-11 text-sm text-muted-foreground hover:text-foreground rounded-xl active:scale-[0.98] transition-transform"
                  >
                    <Briefcase className="mr-2 h-4 w-4" />
                    Browse Service Providers
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Content - Unchanged */}
        <div className="hidden md:block container relative z-10 mx-auto px-6 py-20">
          <div className="max-w-5xl mx-auto">
            {/* Location-Aware Welcome - Above Trust Badge */}
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