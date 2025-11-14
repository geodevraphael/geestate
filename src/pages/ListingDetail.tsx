import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layouts/MainLayout';
import { PaymentProofDialog } from '@/components/PaymentProofDialog';
import { VisitRequestDialog } from '@/components/VisitRequestDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { MapPin, CheckCircle2, AlertCircle, Calendar, Building2, DollarSign, Edit, ArrowLeft, Droplets, TreePine, TrendingUp } from 'lucide-react';
import { ListingWithDetails, ListingPolygon, ListingMedia, Profile, SpatialRiskProfile, LandUseProfile, ValuationEstimate } from '@/types/database';
import { useListingCalculations } from '@/hooks/useListingCalculations';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Polygon } from 'ol/geom';
import Feature from 'ol/Feature';
import { Style, Fill, Stroke } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import 'ol/ol.css';

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile, user, hasRole } = useAuth();
  const [listing, setListing] = useState<ListingWithDetails | null>(null);
  const [polygon, setPolygon] = useState<ListingPolygon | null>(null);
  const [media, setMedia] = useState<ListingMedia[]>([]);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [spatialRisk, setSpatialRisk] = useState<SpatialRiskProfile | null>(null);
  const [landUse, setLandUse] = useState<LandUseProfile | null>(null);
  const [valuation, setValuation] = useState<ValuationEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);

  // Trigger automatic calculations for STEP 4 data
  useListingCalculations({
    listingId: id || '',
    propertyType: listing?.property_type || '',
    region: listing?.region,
    district: listing?.district,
    geojson: polygon?.geojson,
  });

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  useEffect(() => {
    if (!mapRef.current || !polygon?.geojson) return;

    try {
      const geojson = typeof polygon.geojson === 'string' 
        ? JSON.parse(polygon.geojson) 
        : polygon.geojson;

      const coordinates = geojson.coordinates[0].map((coord: [number, number]) => 
        fromLonLat([coord[0], coord[1]])
      );

      const polygonGeom = new Polygon([coordinates]);
      const feature = new Feature({
        geometry: polygonGeom,
      });

      const color = listing?.verification_status === 'verified' ? '#22c55e' : '#eab308';
      feature.setStyle(
        new Style({
          fill: new Fill({
            color: color + '66',
          }),
          stroke: new Stroke({
            color: color,
            width: 3,
          }),
        })
      );

      const vectorSource = new VectorSource({
        features: [feature],
      });

      const vectorLayer = new VectorLayer({
        source: vectorSource,
      });

      const center = polygon.centroid_lng && polygon.centroid_lat
        ? fromLonLat([polygon.centroid_lng, polygon.centroid_lat])
        : fromLonLat([34.888822, -6.369028]);

      const map = new Map({
        target: mapRef.current,
        layers: [
          new TileLayer({
            source: new OSM(),
          }),
          vectorLayer,
        ],
        view: new View({
          center: center,
          zoom: 15,
        }),
      });

      return () => {
        map.setTarget(undefined);
      };
    } catch (error) {
      console.error('Error rendering map:', error);
    }
  }, [polygon, listing]);

  const fetchListing = async () => {
    try {
      // Fetch listing
      const { data: listingData, error: listingError } = await (supabase as any)
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();

      if (listingError) throw listingError;
      setListing(listingData);

      // Fetch polygon
      const { data: polygonData } = await (supabase as any)
        .from('listing_polygons')
        .select('*')
        .eq('listing_id', id)
        .maybeSingle();

      setPolygon(polygonData);

      // Fetch media
      const { data: mediaData } = await (supabase as any)
        .from('listing_media')
        .select('*')
        .eq('listing_id', id)
        .order('created_at', { ascending: true });

      setMedia(mediaData || []);

      // Fetch owner profile
      const { data: ownerData } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', listingData.owner_id)
        .maybeSingle();
      setOwner(ownerData);

      // Fetch STEP 4 data
      const [spatialRiskData, landUseData, valuationData] = await Promise.all([
        supabase.from('spatial_risk_profiles').select('*').eq('listing_id', id).maybeSingle(),
        supabase.from('land_use_profiles').select('*').eq('listing_id', id).maybeSingle(),
        supabase.from('valuation_estimates').select('*').eq('listing_id', id).maybeSingle(),
      ]);

      setSpatialRisk(spatialRiskData.data as SpatialRiskProfile | null);
      setLandUse(landUseData.data as LandUseProfile | null);
      setValuation(valuationData.data as ValuationEstimate | null);
    } catch (error) {
      console.error('Error fetching listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const canEdit = profile?.id === listing?.owner_id || 
    hasRole('admin') || hasRole('verification_officer') || hasRole('compliance_officer');

  const getVerificationBadge = () => {
    if (!listing) return null;

    const config: Record<string, { className: string; icon: React.ReactNode; label: string }> = {
      verified: { className: 'bg-success text-success-foreground', icon: <CheckCircle2 className="h-4 w-4" />, label: 'Verified' },
      pending: { className: 'bg-warning text-warning-foreground', icon: <AlertCircle className="h-4 w-4" />, label: 'Pending Verification' },
      rejected: { className: 'bg-destructive text-destructive-foreground', icon: <AlertCircle className="h-4 w-4" />, label: 'Rejected' },
      unverified: { className: 'bg-muted text-muted-foreground', icon: <AlertCircle className="h-4 w-4" />, label: 'Unverified' },
    };

    const c = config[listing.verification_status];

    return (
      <Badge className={`flex items-center gap-2 w-fit ${c.className}`}>
        {c.icon}
        {c.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!listing) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Listing Not Found</h2>
              <p className="text-muted-foreground mb-4">This listing may have been removed or doesn't exist.</p>
              <Link to="/listings">
                <Button>Browse All Listings</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/listings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Listings
            </Button>
          </Link>
          {canEdit && (
            <Link to={`/listings/${id}/edit`}>
              <Button size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit Listing
              </Button>
            </Link>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            {media.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    <img
                      src={media[0].file_url}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {media.length > 1 && (
                    <div className="grid grid-cols-4 gap-2 p-4">
                      {media.slice(1, 5).map((item) => (
                        <div key={item.id} className="aspect-video bg-muted rounded overflow-hidden">
                          <img src={item.file_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Details */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {listing.location_label}
                      {listing.region && `, ${listing.region}`}
                    </div>
                  </div>
                  {getVerificationBadge()}
                </div>

                <div className="text-3xl font-bold text-primary mb-6">
                  {listing.price ? `${listing.price.toLocaleString()} ${listing.currency}` : 'Price on request'}
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge variant="outline" className="capitalize">
                    <Building2 className="mr-1 h-3 w-3" />
                    {listing.property_type}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    <DollarSign className="mr-1 h-3 w-3" />
                    For {listing.listing_type}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {listing.status}
                  </Badge>
                </div>

                <Separator className="my-6" />

                <div>
                  <h2 className="text-xl font-semibold mb-3">Description</h2>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {listing.description || 'No description provided.'}
                  </p>
                </div>

                {listing.verification_notes && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h2 className="text-xl font-semibold mb-3">Verification Notes</h2>
                      <p className="text-muted-foreground">{listing.verification_notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Map */}
            {polygon && (
              <Card>
                <CardContent className="p-0">
                  <div ref={mapRef} className="h-96 rounded-lg overflow-hidden" />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Owner Info */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Listed By</h2>
                <div className="space-y-2">
                  <p className="font-medium">{owner?.organization_name || owner?.full_name}</p>
                  <Badge variant="outline" className="capitalize">
                    {owner?.role}
                  </Badge>
                  {owner?.phone && (
                    <p className="text-sm text-muted-foreground">Phone: {owner.phone}</p>
                  )}
                </div>
                <Button className="w-full mt-4">
                  Contact Seller
                </Button>

                {/* Payment Proof Button for Buyers */}
                {user && profile?.id !== listing.owner_id && listing.status === 'published' && (
                  <div className="mt-4 space-y-2">
                    <VisitRequestDialog listingId={id!} sellerId={listing.owner_id} />
                    <PaymentProofDialog listing={listing} />
                  </div>
                )}

                {/* Edit Button for Owner */}
                {canEdit && (
                  <Link to={`/listings/${id}/edit`} className="mt-4 block">
                    <Button variant="outline" className="w-full flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Edit Listing
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* STEP 4: Flood Risk & Environmental */}
            {spatialRisk && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Droplets className="h-5 w-5 text-primary" />
                    Flood Risk & Environmental Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Flood Risk Level</span>
                    <Badge variant={
                      spatialRisk.flood_risk_level === 'low' ? 'default' :
                      spatialRisk.flood_risk_level === 'medium' ? 'secondary' : 'destructive'
                    }>
                      {spatialRisk.flood_risk_level.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Risk Score</span>
                      <span className="font-medium">{spatialRisk.flood_risk_score}/100</span>
                    </div>
                    <Progress value={spatialRisk.flood_risk_score} className="h-2" />
                  </div>
                  {spatialRisk.near_river && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Distance to River: </span>
                      <span className="font-medium">{spatialRisk.distance_to_river_m?.toFixed(0)}m</span>
                    </div>
                  )}
                  {spatialRisk.elevation_m && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Elevation: </span>
                      <span className="font-medium">{spatialRisk.elevation_m.toFixed(0)}m</span>
                    </div>
                  )}
                  {spatialRisk.environmental_notes && (
                    <p className="text-sm text-muted-foreground pt-2 border-t">
                      {spatialRisk.environmental_notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* STEP 4: Land Use & Zoning */}
            {landUse && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TreePine className="h-5 w-5 text-primary" />
                    Land Use & Zoning
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Dominant Land Use</p>
                      <p className="font-medium capitalize">{landUse.dominant_land_use}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Zoning Code</p>
                      <p className="font-medium">{landUse.zoning_code || 'N/A'}</p>
                    </div>
                  </div>
                  {landUse.allowed_uses && landUse.allowed_uses.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Allowed Uses</p>
                      <div className="flex flex-wrap gap-2">
                        {landUse.allowed_uses.map((use) => (
                          <Badge key={use} variant="outline" className="capitalize">
                            {use}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {landUse.land_use_conflict && (
                    <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-destructive">Land Use Conflict Detected</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          The property type may not align with the designated land use. Verify with local authorities.
                        </p>
                      </div>
                    </div>
                  )}
                  {landUse.notes && (
                    <p className="text-sm text-muted-foreground pt-2 border-t">
                      {landUse.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* STEP 4: Valuation Estimate */}
            {valuation && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Estimated Market Value
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-primary">
                      {valuation.estimated_value.toLocaleString()}
                    </span>
                    <span className="text-lg text-muted-foreground">{valuation.estimation_currency}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Confidence Score</span>
                      <span className="font-medium">{valuation.confidence_score}/100</span>
                    </div>
                    <Progress value={valuation.confidence_score || 0} className="h-2" />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="capitalize">
                      {valuation.estimation_method.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {valuation.notes && (
                    <p className="text-sm text-muted-foreground pt-2 border-t">
                      {valuation.notes}
                    </p>
                  )}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      This is an automated estimate for reference only, not an official valuation.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Property Details */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Property Details</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Property Type</span>
                    <span className="font-medium capitalize">{listing.property_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Listing Type</span>
                    <span className="font-medium capitalize">For {listing.listing_type}</span>
                  </div>
                  {listing.region && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Region</span>
                      <span className="font-medium">{listing.region}</span>
                    </div>
                  )}
                  {listing.district && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">District</span>
                      <span className="font-medium">{listing.district}</span>
                    </div>
                  )}
                  {listing.ward && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ward</span>
                      <span className="font-medium">{listing.ward}</span>
                    </div>
                  )}
                  {polygon?.area_m2 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Area</span>
                      <span className="font-medium">{polygon.area_m2.toLocaleString()} m²</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Posted</span>
                    <span className="font-medium">
                      {new Date(listing.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
