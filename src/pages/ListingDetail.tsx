import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layouts/MainLayout';
import { PaymentProofDialog } from '@/components/PaymentProofDialog';
import { VisitRequestDialog } from '@/components/VisitRequestDialog';
import { GeospatialServiceRequest } from '@/components/GeospatialServiceRequest';
import { GeoInsightServices } from '@/components/GeoInsightServices';
import { PropertyMapThumbnail } from '@/components/PropertyMapThumbnail';
import { BuyingProcessTracker } from '@/components/BuyingProcessTracker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MapPin, CheckCircle2, AlertCircle, Calendar, Building2, DollarSign, Edit, ArrowLeft, Droplets, TreePine, TrendingUp, Navigation, Hospital, School, ShoppingCart, Bus, ExternalLink, Share2, Map as MapIcon } from 'lucide-react';
import { ShareDialog } from '@/components/ShareDialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ListingWithDetails, ListingPolygon, ListingMedia, Profile, SpatialRiskProfile, LandUseProfile, ValuationEstimate } from '@/types/database';
import { useListingCalculations } from '@/hooks/useListingCalculations';
import { useProximityAnalysis } from '@/hooks/useProximityAnalysis';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Polygon } from 'ol/geom';
import Feature from 'ol/Feature';
import { Style, Fill, Stroke } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { getCenter } from 'ol/extent';
import 'ol/ol.css';

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile, user, hasRole } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [listing, setListing] = useState<ListingWithDetails | null>(null);
  const [polygon, setPolygon] = useState<ListingPolygon | null>(null);
  const [media, setMedia] = useState<ListingMedia[]>([]);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [spatialRisk, setSpatialRisk] = useState<SpatialRiskProfile | null>(null);
  const [landUse, setLandUse] = useState<LandUseProfile | null>(null);
  const [valuation, setValuation] = useState<ValuationEstimate | null>(null);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [proximityAnalysis, setProximityAnalysis] = useState<any | null>(null);
  const [approvedVisitRequest, setApprovedVisitRequest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [riskAnalyzing, setRiskAnalyzing] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);

  // Removed automatic calculation - now manual via button
  // useListingCalculations({
  //   listingId: id || '',
  //   propertyType: listing?.property_type || '',
  //   region: listing?.region,
  //   district: listing?.district,
  //   geojson: polygon?.geojson,
  // });

  // Trigger proximity analysis
  const { loading: proximityLoading, error: proximityError, calculateProximity } = useProximityAnalysis({
    listingId: id || '',
    geojson: polygon?.geojson,
  });

  useEffect(() => {
    if (id) {
      fetchListing();
      fetchServiceRequests();
      fetchProximityAnalysis();
      fetchApprovedVisitRequest();
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (!polygon?.geojson || !mapRef.current || mapInstanceRef.current) {
      return;
    }

    console.log('Initializing map with polygon:', polygon);

    try {
      const geojson = typeof polygon.geojson === 'string' 
        ? JSON.parse(polygon.geojson) 
        : polygon.geojson;

      console.log('Parsed geojson:', geojson);

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

      // Get the extent of the polygon for proper fitting
      const extent = polygonGeom.getExtent();
      const center = getCenter(extent);

      console.log('Creating map with extent:', extent);

      const map = new Map({
        target: mapRef.current,
        layers: [
          new TileLayer({
            source: new XYZ({
              url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
              attributions: '© OpenStreetMap contributors',
              crossOrigin: 'anonymous',
            }),
          }),
          vectorLayer,
        ],
        view: new View({
          center: center,
          zoom: 2,
          maxZoom: 19,
        }),
      });

      // Fit the view to show the entire polygon with padding
      map.getView().fit(extent, {
        padding: [80, 80, 80, 80],
        duration: 500,
        maxZoom: 18,
      });

      mapInstanceRef.current = map;

      // Force map to update its size
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.updateSize();
          console.log('Map size updated');
        }
      }, 200);

      console.log('Map initialized successfully');
    } catch (error) {
      console.error('Error rendering map:', error);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, [polygon?.geojson, listing?.verification_status]);

  const fetchServiceRequests = async () => {
    try {
      const { data, error} = await supabase
        .from('service_requests')
        .select(`
          *,
          service_providers (
            company_name,
            contact_person
          )
        `)
        .eq('listing_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServiceRequests(data || []);
    } catch (error) {
      console.error('Error fetching service requests:', error);
    }
  };

  const fetchProximityAnalysis = async () => {
    try {
      const { data, error } = await supabase
        .from('proximity_analysis')
        .select('*')
        .eq('listing_id', id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setProximityAnalysis(data);
    } catch (error) {
      console.error('Error fetching proximity analysis:', error);
    }
  };

  const fetchApprovedVisitRequest = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .eq('listing_id', id)
        .eq('buyer_id', user.id)
        .eq('status', 'accepted')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setApprovedVisitRequest(data);
    } catch (error) {
      console.error('Error fetching approved visit request:', error);
    }
  };

  const handleGetDirections = () => {
    if (polygon?.centroid_lat && polygon?.centroid_lng) {
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${polygon.centroid_lat},${polygon.centroid_lng}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  const handleAnalyzeProximity = async () => {
    await calculateProximity();
    // Refresh the proximity data after analysis
    setTimeout(() => {
      fetchProximityAnalysis();
    }, 3000);
  };

  const handleAnalyzeRisk = async () => {
    if (!id || !polygon?.geojson) return;
    
    setRiskAnalyzing(true);
    try {
      const { error } = await supabase.functions.invoke('calculate-spatial-risk', {
        body: {
          listing_id: id,
          geojson: polygon.geojson,
        },
      });

      if (error) throw error;

      toast.success(t('detail.riskAnalysisComplete'));
      
      // Refresh spatial risk data
      setTimeout(async () => {
        const { data } = await supabase
          .from('spatial_risk_profiles')
          .select('*')
          .eq('listing_id', id)
          .maybeSingle();
        
        setSpatialRisk(data as SpatialRiskProfile | null);
      }, 2000);
    } catch (error) {
      console.error('Error analyzing risk:', error);
      toast.error(t('detail.riskAnalysisFailed'));
    } finally {
      setRiskAnalyzing(false);
    }
  };

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
  
  const isOwner = profile?.id === listing?.owner_id;
  const editingAsAdmin = canEdit && !isOwner;

  const handleShareListing = () => {
    setShareDialogOpen(true);
  };

  const handleBrowseOnMap = () => {
    navigate(`/map?listing=${id}`);
  };

  const getVerificationBadge = () => {
    if (!listing) return null;

    const config: Record<string, { className: string; icon: React.ReactNode; label: string }> = {
      verified: { className: 'bg-success text-success-foreground', icon: <CheckCircle2 className="h-4 w-4" />, label: t('verificationStatus.verified') },
      pending: { className: 'bg-warning text-warning-foreground', icon: <AlertCircle className="h-4 w-4" />, label: t('verificationStatus.pending') },
      rejected: { className: 'bg-destructive text-destructive-foreground', icon: <AlertCircle className="h-4 w-4" />, label: t('verificationStatus.rejected') },
      unverified: { className: 'bg-muted text-muted-foreground', icon: <AlertCircle className="h-4 w-4" />, label: t('verificationStatus.unverified') },
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
            <p className="text-muted-foreground">{t('common.loading')}</p>
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
              <h2 className="text-2xl font-bold mb-2">{t('listing.listingNotFound')}</h2>
              <p className="text-muted-foreground mb-4">{t('listing.mayBeRemoved')}</p>
              <Link to="/listings">
                <Button>{t('listing.browseAllListings')}</Button>
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
              {t('listing.backToListings')}
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleBrowseOnMap}>
              <MapIcon className="mr-2 h-4 w-4" />
              {t('listing.browseOnMap')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareListing}>
              <Share2 className="mr-2 h-4 w-4" />
              {t('listing.share')}
            </Button>
            {canEdit && (
              <Link to={`/listings/${id}/edit`}>
                <Button size="sm" className="relative">
                  <Edit className="mr-2 h-4 w-4" />
                  {t('listing.editListing')}
                  {editingAsAdmin && (
                    <Badge variant="secondary" className="ml-2 text-xs">{t('roles.admin')}</Badge>
                  )}
                </Button>
              </Link>
            )}
          </div>
          
          {/* Share Dialog */}
          <ShareDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            url={`${window.location.origin}/listings/${id}`}
            title={listing?.title || ''}
            description={listing?.description || undefined}
            price={listing?.price || undefined}
            currency={listing?.currency || 'TZS'}
            location={listing?.location_label}
            area={polygon?.area_m2 || undefined}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
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
                  {listing.price 
                    ? `${listing.price.toLocaleString()} ${listing.currency}` 
                    : valuation?.estimated_value 
                      ? `${valuation.estimated_value.toLocaleString()} ${valuation.estimation_currency || listing.currency} (${t('listing.marketValuation')})` 
                      : t('listing.priceOnRequest')}
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge variant="outline" className="capitalize">
                    <Building2 className="mr-1 h-3 w-3" />
                    {t(`propertyTypes.${listing.property_type}`)}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    <DollarSign className="mr-1 h-3 w-3" />
                    {t(`listingTypes.${listing.listing_type}`)}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {t(`listingStatus.${listing.status}`)}
                  </Badge>
                </div>

                <Separator className="my-6" />

                <div>
                  <h2 className="text-xl font-semibold mb-3">{t('listing.description')}</h2>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {listing.description || t('listing.noDescription')}
                  </p>
                </div>

                {listing.verification_notes && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h2 className="text-xl font-semibold mb-3">{t('detail.verificationNotes')}</h2>
                      <p className="text-muted-foreground">{listing.verification_notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Property Images Gallery */}
            {media.filter(m => m.media_type === 'image').length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('detail.propertyImages', 'Property Images')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {media
                      .filter(m => m.media_type === 'image')
                      .map((item, index) => (
                        <div
                          key={item.id || index}
                          className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(item.file_url, '_blank')}
                        >
                          <img
                            src={item.file_url}
                            alt={item.caption || `Property image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {item.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 truncate">
                              {item.caption}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Map */}
            {polygon?.geojson && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('detail.propertyLocation')}</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <PropertyMapThumbnail 
                    geojson={polygon.geojson}
                    className="w-full h-96 rounded-lg"
                  />
                  {polygon.area_m2 && (
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('detail.totalArea')}</span>
                      <span className="font-semibold">{polygon.area_m2.toLocaleString()} m²</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* STEP 4: Risk & Environmental Analysis */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{t('detail.comprehensiveRiskAnalysis')}</CardTitle>
                  <Button 
                    onClick={handleAnalyzeRisk}
                    disabled={riskAnalyzing || !polygon?.geojson}
                    size="sm"
                  >
                    {riskAnalyzing ? t('detail.analyzing') : t('detail.analyzeRisk')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!spatialRisk && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t('detail.clickToAnalyze')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Flood Risk */}
              {spatialRisk && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Droplets className="h-5 w-5 text-primary" />
                      {t('detail.floodRiskAnalysis')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t('detail.riskLevel')}</span>
                      <Badge variant={
                        spatialRisk.flood_risk_level === 'low' ? 'default' :
                        spatialRisk.flood_risk_level === 'medium' ? 'secondary' : 'destructive'
                      }>
                        {spatialRisk.flood_risk_level.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('detail.riskScore')}</span>
                        <span className="font-medium">{spatialRisk.flood_risk_score}/100</span>
                      </div>
                      <Progress value={spatialRisk.flood_risk_score} className="h-2" />
                    </div>

                    <Separator />

                    {/* Environmental Notes with formatted sections */}
                    {spatialRisk.environmental_notes && (
                      <div className="space-y-3 text-sm">
                        {spatialRisk.environmental_notes.split('\n\n').map((section: string, idx: number) => {
                          const lines = section.split('\n');
                          const header = lines[0];
                          const items = lines.slice(1);

                          if (header.startsWith('DATA SOURCES:')) {
                            return (
                              <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                                <p className="font-semibold text-xs text-primary mb-1">
                                  {t('detail.dataAvailability')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {header.replace('DATA SOURCES: ', '')}
                                </p>
                              </div>
                            );
                          }

                          if (header.startsWith('RISK FACTORS:')) {
                            return (
                              <div key={idx} className="space-y-1">
                                <p className="font-semibold text-xs text-destructive">
                                  {t('detail.riskFactors')}
                                </p>
                                <ul className="space-y-1 ml-2">
                                  {items.map((item, i) => (
                                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                      <span className="text-destructive mt-0.5">•</span>
                                      <span>{item.replace(/^\d+\.\s*/, '')}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          }

                          if (header.startsWith('PROTECTIVE FACTORS:')) {
                            return (
                              <div key={idx} className="space-y-1">
                                <p className="font-semibold text-xs text-success">
                                  {t('detail.protectiveFactors')}
                                </p>
                                <ul className="space-y-1 ml-2">
                                  {items.map((item, i) => (
                                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                      <span className="text-success mt-0.5">•</span>
                                      <span>{item.replace(/^\d+\.\s*/, '')}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          }

                          if (header.startsWith('RECOMMENDATION:')) {
                            return (
                              <div key={idx} className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                <p className="text-xs leading-relaxed">
                                  {header.replace('RECOMMENDATION: ', '')}
                                </p>
                              </div>
                            );
                          }

                          return null;
                        })}
                      </div>
                    )}

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      {spatialRisk.near_river && spatialRisk.distance_to_river_m && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">River Distance:</span>
                          <p className="font-medium">{spatialRisk.distance_to_river_m}m</p>
                        </div>
                      )}
                      {spatialRisk.elevation_m && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Elevation:</span>
                          <p className="font-medium">{Math.round(spatialRisk.elevation_m)}m</p>
                        </div>
                      )}
                      {spatialRisk.slope_percent !== null && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Slope:</span>
                          <p className="font-medium">{spatialRisk.slope_percent.toFixed(1)}%</p>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Last analyzed: {new Date(spatialRisk.calculated_at).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Land Use */}
              {landUse && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TreePine className="h-5 w-5 text-primary" />
                      {t('detail.landUseZoning')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t('detail.landUse')}</p>
                        <p className="font-medium capitalize">{landUse.dominant_land_use}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t('detail.zoning')}</p>
                        <p className="font-medium">{landUse.zoning_code || 'N/A'}</p>
                      </div>
                    </div>
                    {landUse.allowed_uses && landUse.allowed_uses.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground mb-2">{t('detail.allowedUses')}</p>
                        <div className="flex flex-wrap gap-2">
                          {landUse.allowed_uses.map((use) => (
                            <Badge key={use} variant="outline" className="capitalize text-xs">
                              {use}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {landUse.land_use_conflict && (
                      <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-destructive">Land use conflict detected. Verify with local authorities.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Service Request History */}
            {serviceRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Service Request History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {serviceRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold capitalize">
                            {request.service_type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {request.service_category}
                          </p>
                        </div>
                        <Badge 
                          variant={
                            request.status === 'completed' ? 'default' : 
                            request.status === 'in_progress' ? 'secondary' : 
                            'outline'
                          }
                          className="capitalize"
                        >
                          {request.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      
                      {request.service_providers && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Provider:</span>{' '}
                          {request.service_providers.company_name}
                        </p>
                      )}
                      
                      {request.quoted_price && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Quote:</span>{' '}
                          <span className="font-medium">
                            {request.quoted_price.toLocaleString()} {request.quoted_currency || 'TZS'}
                          </span>
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Requested: {new Date(request.created_at).toLocaleDateString()}
                        </div>
                        {request.actual_completion_date && (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            Completed: {new Date(request.actual_completion_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      
                      {request.report_file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => window.open(request.report_file_url, '_blank')}
                        >
                          View Report
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Valuation Estimate */}
            {valuation && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Market Valuation Estimate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-primary">
                      {valuation.estimated_value.toLocaleString()}
                    </span>
                    <span className="text-lg text-muted-foreground">{valuation.estimation_currency}</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Confidence</span>
                        <span className="font-medium">{valuation.confidence_score}/100</span>
                      </div>
                      <Progress value={valuation.confidence_score || 0} className="h-2" />
                    </div>
                    <div className="flex items-center justify-center">
                      <Badge variant="outline" className="capitalize">
                        {valuation.estimation_method.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                  {valuation.notes && (
                    <p className="text-sm text-muted-foreground pt-2 border-t">
                      {valuation.notes}
                    </p>
                  )}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Automated estimate for reference only. Not an official valuation.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Proximity Analysis */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Navigation className="h-5 w-5 text-primary" />
                      Proximity & Location Analysis
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Distances to nearby amenities and infrastructure
                    </p>
                  </div>
                  <Button 
                    onClick={handleAnalyzeProximity}
                    disabled={proximityLoading || !polygon?.geojson}
                    variant="outline"
                    size="sm"
                  >
                    {proximityLoading ? 'Analyzing...' : 'Analyze Proximity'}
                  </Button>
                </div>
              </CardHeader>
              {proximityAnalysis ? (
                <CardContent>
                  <Accordion type="multiple" defaultValue={["roads", "healthcare", "education", "shopping"]} className="w-full">
                    {/* Roads */}
                    <AccordionItem value="roads">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Navigation className="h-4 w-4 text-primary" />
                          <span className="font-semibold">Roads & Transportation</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-3">
                        <div className="grid md:grid-cols-2 gap-4">
                          {proximityAnalysis.nearest_road_name && (
                            <div className="p-3 border rounded-lg space-y-1">
                              <p className="text-xs text-muted-foreground">Nearest Road</p>
                              <p className="font-medium">{proximityAnalysis.nearest_road_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {(proximityAnalysis.nearest_road_distance_m / 1000).toFixed(2)} km away
                              </p>
                            </div>
                          )}
                          {proximityAnalysis.nearest_major_road_name && (
                            <div className="p-3 border rounded-lg space-y-1">
                              <p className="text-xs text-muted-foreground">Nearest Major Road</p>
                              <p className="font-medium">{proximityAnalysis.nearest_major_road_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {(proximityAnalysis.nearest_major_road_distance_m / 1000).toFixed(2)} km away
                              </p>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Hospitals */}
                    {proximityAnalysis.nearest_hospital_name && (
                      <AccordionItem value="healthcare">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <Hospital className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Healthcare Facilities</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pt-3">
                          <div className="p-3 border rounded-lg space-y-1">
                            <p className="text-xs text-muted-foreground">Nearest Hospital</p>
                            <p className="font-medium">{proximityAnalysis.nearest_hospital_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(proximityAnalysis.nearest_hospital_distance_m / 1000).toFixed(2)} km away
                            </p>
                          </div>
                          {proximityAnalysis.hospitals_within_5km?.length > 1 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">
                                {proximityAnalysis.hospitals_within_5km.length} hospitals within 5km:
                              </p>
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {proximityAnalysis.hospitals_within_5km.slice(1).map((hospital: any, idx: number) => (
                                  <div key={idx} className="text-xs p-2 bg-muted/50 rounded flex justify-between">
                                    <span>{hospital.name}</span>
                                    <span className="text-muted-foreground">
                                      {(hospital.distance / 1000).toFixed(2)} km
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Schools */}
                    {proximityAnalysis.nearest_school_name && (
                      <AccordionItem value="education">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <School className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Educational Institutions</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pt-3">
                          <div className="p-3 border rounded-lg space-y-1">
                            <p className="text-xs text-muted-foreground">Nearest School</p>
                            <p className="font-medium">{proximityAnalysis.nearest_school_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(proximityAnalysis.nearest_school_distance_m / 1000).toFixed(2)} km away
                            </p>
                          </div>
                          {proximityAnalysis.schools_within_5km?.length > 1 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">
                                {proximityAnalysis.schools_within_5km.length} schools within 5km:
                              </p>
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {proximityAnalysis.schools_within_5km.slice(1).map((school: any, idx: number) => (
                                  <div key={idx} className="text-xs p-2 bg-muted/50 rounded flex justify-between items-center">
                                    <span className="flex-1">{school.name}</span>
                                    <Badge variant="outline" className="mr-2 capitalize">
                                      {school.type}
                                    </Badge>
                                    <span className="text-muted-foreground">
                                      {(school.distance / 1000).toFixed(2)} km
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Marketplaces */}
                    {proximityAnalysis.nearest_marketplace_name && (
                      <AccordionItem value="shopping">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Shopping & Markets</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pt-3">
                          <div className="p-3 border rounded-lg space-y-1">
                            <p className="text-xs text-muted-foreground">Nearest Marketplace</p>
                            <p className="font-medium">{proximityAnalysis.nearest_marketplace_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(proximityAnalysis.nearest_marketplace_distance_m / 1000).toFixed(2)} km away
                            </p>
                          </div>
                          {proximityAnalysis.marketplaces_within_5km?.length > 1 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">
                                {proximityAnalysis.marketplaces_within_5km.length} markets within 5km:
                              </p>
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {proximityAnalysis.marketplaces_within_5km.slice(1).map((market: any, idx: number) => (
                                  <div key={idx} className="text-xs p-2 bg-muted/50 rounded flex justify-between">
                                    <span>{market.name}</span>
                                    <span className="text-muted-foreground">
                                      {(market.distance / 1000).toFixed(2)} km
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Public Transport */}
                    {proximityAnalysis.public_transport_nearby?.length > 0 && (
                      <AccordionItem value="transport">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <Bus className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Public Transportation</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pt-3">
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              {proximityAnalysis.public_transport_nearby.length} transport stops within 1km:
                            </p>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {proximityAnalysis.public_transport_nearby.map((transport: any, idx: number) => (
                                <div key={idx} className="text-xs p-2 bg-muted/50 rounded flex justify-between items-center">
                                  <span className="flex-1">{transport.name}</span>
                                  <Badge variant="outline" className="mr-2 capitalize">
                                    {transport.type}
                                  </Badge>
                                  <span className="text-muted-foreground">
                                    {(transport.distance).toFixed(0)} m
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>

                  <div className="p-3 bg-muted/50 rounded-lg mt-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Data sourced from OpenStreetMap. Last updated: {new Date(proximityAnalysis.calculated_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              ) : (
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      No proximity analysis data available yet.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Click "Analyze Proximity" to generate detailed location insights.
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
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
                <Button 
                  className="w-full mt-4"
                  onClick={() => navigate(`/messages?listing=${id}&seller=${listing.owner_id}`)}
                  disabled={!user || profile?.id === listing.owner_id}
                >
                  {profile?.id === listing.owner_id ? 'Your Listing' : 'Contact Seller'}
                </Button>

                {/* Payment Proof Button for Buyers */}
                {user && profile?.id !== listing.owner_id && listing.status === 'published' && (
                  <div className="mt-4 space-y-2">
                    {approvedVisitRequest && polygon?.centroid_lat && polygon?.centroid_lng ? (
                      <Button 
                        onClick={handleGetDirections}
                        className="w-full flex items-center gap-2"
                        variant="default"
                      >
                        <Navigation className="h-4 w-4" />
                        Get Directions
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </Button>
                    ) : (
                      <VisitRequestDialog listingId={id!} sellerId={listing.owner_id} />
                    )}
                    <PaymentProofDialog listing={listing} />
                  </div>
                )}

                {/* Edit Button for Owner/Admin */}
                {canEdit && (
                  <Link to={`/listings/${id}/edit`} className="mt-4 block">
                    <Button variant="outline" className="w-full flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Edit Listing
                      {editingAsAdmin && (
                        <Badge variant="secondary" className="ml-auto text-xs">Admin Access</Badge>
                      )}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Geospatial Services */}
            {user && listing.status === 'published' && (
              <GeospatialServiceRequest listingId={id!} sellerId={listing.owner_id} />
            )}

            {/* GeoInsight Professional Services */}
            {user && listing.status === 'published' && (
              <GeoInsightServices listingId={id!} sellerId={listing.owner_id} />
            )}

            {/* Buying Process Tracker for Buyers */}
            {user && profile?.id !== listing.owner_id && listing.status === 'published' && (
              <BuyingProcessTracker 
                listingId={id!} 
                sellerId={listing.owner_id}
                approvedVisitRequestId={approvedVisitRequest?.id}
              />
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
