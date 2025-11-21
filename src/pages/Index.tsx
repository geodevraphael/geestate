import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Search, CheckCircle2, ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
const Index = () => {
  return <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />
      <MobileBottomNav />
      
      {/* Hero Section with Advanced Design */}
      <section className="relative min-h-[85vh] md:min-h-screen flex items-center justify-center overflow-hidden pt-8 md:pt-0">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/20 to-background">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-1/3 -right-20 w-[500px] h-[500px] bg-accent/15 rounded-full blur-3xl animate-float" style={{
          animationDelay: '1s'
        }} />
          <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-float" style={{
          animationDelay: '2s'
        }} />
        </div>

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />

        <div className="container relative z-10 mx-auto px-4 md:px-6 py-12 md:py-20">
          <div className="max-w-5xl mx-auto">
            {/* Trust Badge */}
            <div className="mb-6 md:mb-8 inline-flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 glass rounded-full animate-fade-in border border-primary/20 text-xs md:text-sm">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </div>
              <span className="text-sm font-semibold text-primary">Verified by GeoInsight Enterprise</span>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </div>
            
            {/* Main Heading */}
            <h1 className="text-3xl sm:text-4xl md:text-7xl lg:text-8xl font-display font-bold mb-6 md:mb-8 leading-[1.1] animate-fade-in-up">
              Discover Premium{' '}
              <span className="relative inline-block">
                <span className="text-gradient">Land & Property</span>
                <svg className="absolute -bottom-2 left-0 w-full" height="12" viewBox="0 0 300 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 10C80 4 220 4 298 10" stroke="hsl(38 92% 50%)" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
              {' '}in Tanzania
            </h1>
            
            <p className="text-base md:text-xl lg:text-2xl text-muted-foreground mb-10 md:mb-12 max-w-3xl leading-relaxed animate-fade-in-up" style={{
            animationDelay: '0.2s'
          }}>
              Africa's most advanced real estate marketplace. Every property is polygon-mapped, 
              AI-verified, and backed by our comprehensive fraud detection system.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-10 md:mb-16 animate-fade-in-up" style={{
            animationDelay: '0.4s'
          }}>
              <Link to="/map" className="group w-full sm:w-auto">
                <Button size="lg" className="w-full h-12 md:h-14 px-6 md:px-8 text-base md:text-lg bg-primary hover:bg-primary/90 shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-105">
                  <MapPin className="mr-2 h-5 md:h-6 w-5 md:w-6 group-hover:rotate-12 transition-transform" />
                  <span className="hidden sm:inline">Explore Interactive Map</span>
                  <span className="sm:hidden">Explore Map</span>
                  <ArrowRight className="ml-2 h-4 md:h-5 w-4 md:w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/listings" className="group w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full h-12 md:h-14 px-6 md:px-8 text-base md:text-lg glass hover:bg-primary/10 border-2 border-border hover:border-primary/50 transition-all duration-300">
                  <Search className="mr-2 h-5 md:h-6 w-5 md:w-6" />
                  <span className="hidden sm:inline">Browse All Listings</span>
                  <span className="sm:hidden">Browse Listings</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-primary/30 flex items-start justify-center p-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-glow" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      

      {/* Footer */}
      <footer className="py-8 md:py-12 mb-16 md:mb-0 border-t border-border/50 bg-card/50">
        <div className="container mx-auto px-4 md:px-6">
          
          <div className="pt-6 md:pt-8 border-t border-border/50 text-center text-xs md:text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} GeoEstate Tanzania. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;