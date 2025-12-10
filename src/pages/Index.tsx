import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Search, Building2, Shield, TrendingUp, Users, ArrowRight, Sparkles, ChevronRight } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { LocationAwareWelcome } from '@/components/LocationAwareWelcome';
import { useTranslation } from 'react-i18next';

const Index = () => {
  const { t } = useTranslation();

  const quickActions = [
    { icon: MapPin, label: t('home.exploreMapShort'), href: '/map', color: 'bg-accent/10 text-accent' },
    { icon: Search, label: t('home.browseListingsShort'), href: '/listings', color: 'bg-primary/10 text-primary' },
    { icon: Users, label: t('home.viewSellersShort'), href: '/sellers', color: 'bg-success/10 text-success' },
    { icon: Building2, label: 'Services', href: '/service-providers', color: 'bg-warning/10 text-warning' },
  ];

  const features = [
    { icon: Shield, title: 'Verified Listings', description: 'All properties are verified for authenticity' },
    { icon: TrendingUp, title: 'Market Insights', description: 'Real-time valuation and analytics' },
    { icon: MapPin, title: 'Geospatial Data', description: 'Precise boundary mapping technology' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <MobileBottomNav />

      {/* Mobile App-Like Hero */}
      <section className="md:hidden pt-4 pb-24">
        <div className="px-4 space-y-6">
          {/* Greeting Card */}
          <div className="glass-card rounded-2xl p-4 animate-fade-in">
            <LocationAwareWelcome />
          </div>

          {/* Main Headline */}
          <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent/10 rounded-full">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-medium text-accent">{t('home.verifiedBadge')}</span>
            </div>
            <h1 className="text-2xl font-display font-bold leading-tight">
              {t('home.heroTitle1')}{' '}
              <span className="text-accent">{t('home.heroTitle2')}</span>
              {' '}{t('home.heroTitle3')}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('home.heroSubtitle')}
            </p>
          </div>

          {/* Quick Action Grid - App Style */}
          <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {quickActions.map((action, index) => (
              <Link
                key={action.href}
                to={action.href}
                className="group glass-card rounded-2xl p-4 touch-feedback flex flex-col items-center gap-3 hover:border-accent/30 transition-colors"
              >
                <div className={`p-3 rounded-xl ${action.color} transition-transform group-active:scale-90`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-center">{action.label}</span>
              </Link>
            ))}
          </div>

          {/* Featured Section */}
          <div className="space-y-3 pt-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold">Why GeoEstate?</h2>
              <Link to="/about" className="text-xs text-accent flex items-center gap-1">
                Learn more <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-2">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="glass-card rounded-xl p-3 flex items-center gap-3 touch-feedback"
                >
                  <div className="p-2 bg-accent/10 rounded-lg shrink-0">
                    <feature.icon className="h-4 w-4 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Primary CTA */}
          <div className="pt-2 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Link to="/map" className="block">
              <Button className="w-full h-14 text-base font-medium rounded-2xl bg-primary hover:bg-primary/90 touch-feedback">
                <MapPin className="mr-2 h-5 w-5" />
                {t('home.exploreMap')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Desktop Hero - Premium Design */}
      <section className="hidden md:flex relative min-h-[90vh] items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/30 to-background">
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px] animate-float" />
          <div className="absolute top-1/3 -right-32 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }} />
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="container relative z-10 px-6 py-20">
          <div className="max-w-5xl mx-auto">
            {/* Location Welcome */}
            <div className="mb-8 max-w-md animate-fade-in">
              <LocationAwareWelcome />
            </div>

            {/* Trust Badge */}
            <div className="mb-8 inline-flex items-center gap-3 px-5 py-3 glass rounded-full animate-fade-in border border-accent/20">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
              </div>
              <span className="text-sm font-semibold text-foreground">{t('home.verifiedBadge')}</span>
              <Shield className="h-4 w-4 text-success" />
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl lg:text-7xl xl:text-8xl font-display font-bold mb-8 leading-[1.05] animate-fade-in-up">
              {t('home.heroTitle1')}{' '}
              <span className="relative inline-block">
                <span className="text-accent">{t('home.heroTitle2')}</span>
                <svg className="absolute -bottom-2 left-0 w-full" height="14" viewBox="0 0 300 14" fill="none">
                  <path d="M2 12C80 4 220 4 298 12" stroke="hsl(var(--accent))" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
              {' '}{t('home.heroTitle3')}
            </h1>

            <p className="text-xl lg:text-2xl text-muted-foreground mb-12 max-w-3xl leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
              {t('home.heroSubtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 mb-16 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Link to="/map" className="group">
                <Button size="lg" className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <MapPin className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                  {t('home.exploreMap')}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/listings" className="group">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg glass hover:bg-accent/10 border-2 border-border hover:border-accent/50 transition-all duration-300">
                  <Search className="mr-2 h-5 w-5" />
                  {t('home.browseListings')}
                </Button>
              </Link>
              <Link to="/sellers" className="group">
                <Button size="lg" variant="secondary" className="h-14 px-8 text-lg hover:bg-secondary/80 transition-all duration-300">
                  <Users className="mr-2 h-5 w-5" />
                  {t('home.viewSellers')}
                </Button>
              </Link>
              <Link to="/service-providers" className="group">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg glass hover:bg-accent/10 border-2 border-border hover:border-accent/50 transition-all duration-300">
                  <Building2 className="mr-2 h-5 w-5" />
                  Service Providers
                </Button>
              </Link>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '0.45s' }}>
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="group glass-card rounded-2xl p-6 hover:border-accent/30 hover-lift cursor-default"
                >
                  <div className="p-3 bg-accent/10 rounded-xl w-fit mb-4 group-hover:bg-accent/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-lg font-display font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
