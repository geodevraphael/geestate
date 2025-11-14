import { Navbar } from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, MapPin, CheckCircle, HandshakeIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HowItWorks() {
  const navigate = useNavigate();

  const steps = [
    {
      icon: Upload,
      title: '1. Create Your Listing',
      description: 'Upload property details and boundaries using GeoJSON/TopoJSON files for land parcels, or draw boundaries for other properties on an interactive map.',
      forSellers: true,
    },
    {
      icon: MapPin,
      title: '2. Verification Process',
      description: 'Our verification officers review your listing, validate documents, check polygon accuracy, and assess environmental risks like flood zones.',
      forSellers: true,
    },
    {
      icon: CheckCircle,
      title: '3. Get Listed',
      description: 'Once verified, your property appears on our platform with verified badge, risk assessments, and AI-powered valuation estimates.',
      forSellers: true,
    },
    {
      icon: HandshakeIcon,
      title: '4. Connect with Buyers',
      description: 'Buyers can message you, schedule visits, and submit payment proofs. Our system guides the entire transaction process securely.',
      forSellers: true,
    },
  ];

  const buyerSteps = [
    {
      icon: MapPin,
      title: '1. Search Properties',
      description: 'Use our advanced search filters by region, district, price range, property type, and risk levels to find your perfect property.',
      forSellers: false,
    },
    {
      icon: CheckCircle,
      title: '2. Review Details',
      description: 'View comprehensive property information including boundaries, flood risk, land use regulations, seller reputation, and AI valuation.',
      forSellers: false,
    },
    {
      icon: HandshakeIcon,
      title: '3. Schedule Visit',
      description: 'Request property visits directly through the platform and communicate with verified sellers securely via our messaging system.',
      forSellers: false,
    },
    {
      icon: Upload,
      title: '4. Complete Transaction',
      description: 'Submit payment proof, complete verification, and finalize your purchase with admin oversight ensuring a secure transaction.',
      forSellers: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto p-6 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-12">
          <h1 className="text-5xl font-bold">How GeoEstate Works</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A simple, secure, and transparent process for buying and selling property in Tanzania
          </p>
        </div>

        {/* For Sellers */}
        <div>
          <h2 className="text-3xl font-bold text-center mb-8">For Property Sellers</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <Card key={index}>
                <CardContent className="p-6 space-y-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Start Selling
            </Button>
          </div>
        </div>

        {/* For Buyers */}
        <div className="bg-muted/50 p-8 rounded-lg">
          <h2 className="text-3xl font-bold text-center mb-8">For Property Buyers</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {buyerSteps.map((step, index) => (
              <Card key={index}>
                <CardContent className="p-6 space-y-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button size="lg" onClick={() => navigate('/listings')}>
              Browse Properties
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-8 space-y-6">
            <h2 className="text-3xl font-bold text-center">Platform Features</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">✓ Geospatial Technology</h3>
                <p>Precise property boundaries with GeoJSON/TopoJSON support</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">✓ Risk Assessment</h3>
                <p>Automated flood risk and land use analysis</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">✓ AI Valuation</h3>
                <p>Machine learning-powered property valuations</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">✓ Verified Sellers</h3>
                <p>Reputation scores and fraud detection</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">✓ Secure Messaging</h3>
                <p>Direct communication with buyers/sellers</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">✓ Dispute Resolution</h3>
                <p>Fair and transparent conflict management</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center space-y-4 py-12">
          <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground">
            Join thousands of satisfied users on Tanzania's premier property platform
          </p>
          <Button size="lg" onClick={() => navigate('/auth')}>
            Sign Up Now
          </Button>
        </div>
      </div>
    </div>
  );
}
