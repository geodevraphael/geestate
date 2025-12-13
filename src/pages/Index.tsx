import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Search, CheckCircle2, ArrowRight, Briefcase, Users, Home, TrendingUp } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { LocationAwareWelcome } from '@/components/LocationAwareWelcome';
import { useTranslation } from 'react-i18next';
import mobileHeroImage from '@/assets/mobile-hero-property.jpg';
const Index = () => {
  const {
    t
  } = useTranslation();
  return <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />
      <MobileBottomNav />
      
      {/* ===== MOBILE APP VIEW ===== */}
      <div className="md:hidden min-h-screen bg-secondary/30 pb-24">
        {/* Mobile App Header */}
        <div className="px-4 pt-4 pb-3">
          <LocationAwareWelcome />
        </div>
        
        {/* Hero Image Card with Search Overlay */}
        
        
        {/* Quick Actions Section */}
        <div className="px-4 mb-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t('home.verifiedBadge')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Explore Map Card */}
            <Link to="/map" className="block">
              <div className="bg-card rounded-2xl p-4 border border-border/50 active:scale-[0.97] transition-transform shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <p className="font-semibold text-sm text-foreground">{t('home.exploreMapShort')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('home.heroTitle2')}</p>
              </div>
            </Link>
            
            {/* Browse Listings Card */}
            <Link to="/listings" className="block">
              <div className="bg-card rounded-2xl p-4 border border-border/50 active:scale-[0.97] transition-transform shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                  <Home className="h-5 w-5 text-accent" />
                </div>
                <p className="font-semibold text-sm text-foreground">{t('home.browseListingsShort')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('home.heroTitle3')}</p>
              </div>
            </Link>
          </div>
        </div>
        
        {/* More Actions */}
        <div className="px-4 space-y-3">
          {/* View Sellers */}
          <Link to="/sellers" className="block">
            <div className="bg-card rounded-2xl p-4 flex items-center gap-4 border border-border/50 active:scale-[0.98] transition-transform shadow-sm">
              <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center">
                <Users className="h-6 w-6 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">{t('home.viewSellersShort')}</p>
                <p className="text-xs text-muted-foreground">{t('home.heroSubtitle')}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Link>
          
          {/* Service Providers */}
          <Link to="/service-providers" className="block">
            <div className="bg-card rounded-2xl p-4 flex items-center gap-4 border border-border/50 active:scale-[0.98] transition-transform shadow-sm">
              <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">Service Providers</p>
                <p className="text-xs text-muted-foreground">Find professionals</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Link>
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
    </div>;
};
export default Index;