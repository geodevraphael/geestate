import { Navbar } from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Shield, Target, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AboutUs() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto p-6 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-12">
          <h1 className="text-5xl font-bold">About GeoEstate Tanzania</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Tanzania's first geospatial property marketplace, connecting buyers and sellers with verified land and property information
          </p>
        </div>

        {/* Mission Section */}
        <Card>
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <Target className="h-12 w-12 text-primary flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
                <p className="text-lg text-muted-foreground">
                  To revolutionize property transactions in Tanzania by providing a transparent, secure, and efficient platform that leverages geospatial technology to eliminate fraud and ensure every property transaction is verified and trustworthy.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What We Do */}
        <div>
          <h2 className="text-3xl font-bold text-center mb-8">What We Do</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center space-y-4">
                <Building2 className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-xl font-bold">Verified Listings</h3>
                <p className="text-muted-foreground">
                  Every property is verified using geospatial data, official documents, and on-ground verification to ensure authenticity
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center space-y-4">
                <Shield className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-xl font-bold">Fraud Prevention</h3>
                <p className="text-muted-foreground">
                  Advanced fraud detection systems, compliance checks, and reputation scoring protect both buyers and sellers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center space-y-4">
                <Users className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-xl font-bold">Trusted Community</h3>
                <p className="text-muted-foreground">
                  Built on trust with verified sellers, transparent transactions, and a dispute resolution system
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Why Choose Us */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-8 space-y-6">
            <h2 className="text-3xl font-bold text-center">Why Choose GeoEstate?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">✓ Geospatial Verification</h3>
                <p>Accurate land boundaries using GeoJSON and TopoJSON technology</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">✓ Risk Assessment</h3>
                <p>Flood risk, land use, and environmental analysis for every property</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">✓ Official Verification</h3>
                <p>Admin-verified listings with document checks and field verification</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">✓ Secure Transactions</h3>
                <p>Payment proof system and deal closure workflow</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center space-y-4 py-12">
          <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground">
            Join Tanzania's most trusted property marketplace today
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Sign Up Now
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/listings')}>
              Browse Listings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
