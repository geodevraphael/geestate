import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { InstitutionalSellerWithDetails, Listing } from '@/types/database';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Phone, Mail, Globe, Calendar, Users, Award, Facebook, Twitter, Linkedin, Instagram, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function InstitutionLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [institution, setInstitution] = useState<InstitutionalSellerWithDetails | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchInstitution();
    }
  }, [slug]);

  const fetchInstitution = async () => {
    try {
      const { data: institutionData, error: instError } = await supabase
        .from('institutional_sellers')
        .select('*, profiles(full_name, email)')
        .eq('slug', slug)
        .eq('is_approved', true)
        .maybeSingle();

      if (instError) throw instError;

      setInstitution(institutionData as any);

      // Fetch listings
      const { data: listingsData } = await supabase
        .from('listings')
        .select('*')
        .eq('owner_id', institutionData.profile_id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(6);

      if (listingsData) {
        setListings(listingsData);
      }
    } catch (error) {
      console.error('Error fetching institution:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          Loading...
        </div>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Institution Not Found</h1>
          <p className="text-muted-foreground mb-6">The institutional seller you're looking for doesn't exist or hasn't been approved yet.</p>
          <Button asChild>
            <Link to="/listings">Browse All Listings</Link>
          </Button>
        </div>
      </div>
    );
  }

  const socialMedia = institution.social_media as any;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Cover Image */}
      {institution.cover_image_url && (
        <div className="w-full h-64 md:h-96 relative overflow-hidden">
          <img 
            src={institution.cover_image_url} 
            alt={institution.institution_name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Institution Header */}
        <div className="flex flex-col md:flex-row gap-6 items-start mb-8 -mt-16 relative z-10">
          {/* Logo */}
          {institution.logo_url && (
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden bg-background border-4 border-background shadow-xl flex-shrink-0">
              <img 
                src={institution.logo_url} 
                alt={institution.institution_name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Institution Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{institution.institution_name}</h1>
                <Badge variant="secondary" className="mb-4">
                  {institution.institution_type.charAt(0).toUpperCase() + institution.institution_type.slice(1)}
                </Badge>
                
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {institution.year_established && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Est. {institution.year_established}
                    </div>
                  )}
                  {institution.total_employees && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {institution.total_employees} Employees
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Actions */}
              <div className="flex flex-col gap-2">
                {institution.website_url && (
                  <Button asChild variant="default">
                    <a href={institution.website_url} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-2" />
                      Visit Website
                    </a>
                  </Button>
                )}
                <Button asChild variant="outline">
                  <Link to={`/listings?owner=${institution.profile_id}`}>
                    View All Listings
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            {institution.about_company && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-bold mb-4">About Us</h2>
                  <p className="text-muted-foreground whitespace-pre-line">{institution.about_company}</p>
                </CardContent>
              </Card>
            )}

            {/* Mission Statement */}
            {institution.mission_statement && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
                  <p className="text-muted-foreground whitespace-pre-line italic">{institution.mission_statement}</p>
                </CardContent>
              </Card>
            )}

            {/* Featured Listings */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Featured Properties</h2>
              {listings.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No listings available at this time.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {listings.map((listing) => (
                    <Link to={`/listing/${listing.id}`} key={listing.id}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                        <CardContent className="pt-6">
                          <h3 className="font-semibold mb-2 line-clamp-2">{listing.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {listing.location_label}
                          </p>
                          <div className="flex items-center justify-between">
                            <Badge variant={listing.listing_type === 'sale' ? 'default' : 'secondary'}>
                              For {listing.listing_type === 'sale' ? 'Sale' : 'Rent'}
                            </Badge>
                            {listing.price && (
                              <span className="font-bold text-primary">
                                {listing.currency} {listing.price.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-bold text-lg mb-4">Contact Information</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="font-medium">{institution.contact_person}</p>
                      <p className="text-muted-foreground text-xs">Contact Person</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <a href={`mailto:${institution.contact_email}`} className="hover:underline text-primary">
                      {institution.contact_email}
                    </a>
                  </div>

                  {institution.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <a href={`tel:${institution.contact_phone}`} className="hover:underline text-primary">
                        {institution.contact_phone}
                      </a>
                    </div>
                  )}
                </div>

                {/* Social Media */}
                {socialMedia && (Object.values(socialMedia).some(v => v)) && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Follow Us</p>
                    <div className="flex gap-2">
                      {socialMedia.facebook && (
                        <a href={socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                          <Facebook className="h-5 w-5" />
                        </a>
                      )}
                      {socialMedia.twitter && (
                        <a href={socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                          <Twitter className="h-5 w-5" />
                        </a>
                      )}
                      {socialMedia.linkedin && (
                        <a href={socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                          <Linkedin className="h-5 w-5" />
                        </a>
                      )}
                      {socialMedia.instagram && (
                        <a href={socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                          <Instagram className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service Areas */}
            {institution.service_areas && institution.service_areas.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Service Areas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {institution.service_areas.map((area, idx) => (
                      <Badge key={idx} variant="outline">{area}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certifications */}
            {institution.certifications && institution.certifications.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Certifications
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {institution.certifications.map((cert, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <span>{cert}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}