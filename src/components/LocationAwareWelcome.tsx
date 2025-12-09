import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bot, MapPin, Navigation, Loader2, X, Sparkles, ChevronRight, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface LocationInfo {
  region: { id: string; name: string } | null;
  district: { id: string; name: string } | null;
  ward: { id: string; name: string } | null;
  accuracy: number;
  latitude: number;
  longitude: number;
}

export const LocationAwareWelcome: React.FC = () => {
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [propertyCount, setPropertyCount] = useState<number>(0);

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        try {
          let foundRegion: { id: string; name: string } | null = null;
          let foundDistrict: { id: string; name: string } | null = null;
          let foundWard: { id: string; name: string } | null = null;

          // Query ALL wards with geometry - geometry is only stored at ward level
          // Join with districts and regions to get names
          const { data: wards, error: wardsError } = await supabase
            .from('wards')
            .select(`
              id, 
              name, 
              geometry,
              district_id,
              districts!inner (
                id,
                name,
                region_id,
                regions!inner (
                  id,
                  name
                )
              )
            `)
            .not('geometry', 'is', null);

          if (wardsError) {
            console.error('Error fetching wards:', wardsError);
            throw new Error('Could not fetch location data');
          }

          console.log(`Checking ${wards?.length || 0} wards for point (${latitude}, ${longitude})`);

          // Find which ward contains the user's location
          if (wards) {
            for (const ward of wards) {
              if (ward.geometry) {
                const geom = typeof ward.geometry === 'string' 
                  ? JSON.parse(ward.geometry) 
                  : ward.geometry;
                
                if (isPointInGeometry(latitude, longitude, geom)) {
                  foundWard = { id: ward.id, name: ward.name };
                  
                  // Get district and region from the joined data
                  const district = ward.districts as any;
                  if (district) {
                    foundDistrict = { id: district.id, name: district.name };
                    
                    const region = district.regions as any;
                    if (region) {
                      foundRegion = { id: region.id, name: region.name };
                    }
                  }
                  
                  console.log(`Found ward: ${ward.name}, District: ${foundDistrict?.name}, Region: ${foundRegion?.name}`);
                  break;
                }
              }
            }
          }

          // Get property count for the area
          if (foundWard) {
            const { count } = await supabase
              .from('listings')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'published')
              .eq('ward_id', foundWard.id);
            
            setPropertyCount(count || 0);
          } else if (foundDistrict) {
            const { count } = await supabase
              .from('listings')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'published')
              .eq('district_id', foundDistrict.id);
            
            setPropertyCount(count || 0);
          }

          setLocationInfo({
            region: foundRegion,
            district: foundDistrict,
            ward: foundWard,
            accuracy,
            latitude,
            longitude,
          });
        } catch (err) {
          console.error('Error detecting location:', err);
          setError('Could not determine your area');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
        } else {
          setError('Could not get your location');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000,
      }
    );
  };

  const isPointInGeometry = (lat: number, lng: number, geometry: any): boolean => {
    try {
      let polygons: number[][][] = [];
      
      if (geometry.type === 'Polygon') {
        polygons = [geometry.coordinates[0]];
      } else if (geometry.type === 'MultiPolygon') {
        polygons = geometry.coordinates.map((p: number[][][]) => p[0]);
      } else {
        return false;
      }

      for (const ring of polygons) {
        if (pointInPolygon([lng, lat], ring)) {
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error('Error checking point in geometry:', e);
      return false;
    }
  };

  const pointInPolygon = (point: number[], polygon: number[][]): boolean => {
    const [x, y] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      detectLocation();
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  if (dismissed || permissionDenied) return null;

  const getAccuracyInfo = (accuracy: number) => {
    if (accuracy <= 100) return { label: 'Precise', color: 'bg-emerald-500', icon: '🎯' };
    if (accuracy <= 500) return { label: 'Good', color: 'bg-green-500', icon: '✓' };
    if (accuracy <= 2000) return { label: 'Approximate', color: 'bg-amber-500', icon: '~' };
    return { label: 'Rough estimate', color: 'bg-orange-500', icon: '≈' };
  };

  const buildMapUrl = () => {
    const params = new URLSearchParams();
    if (locationInfo?.region?.id) params.set('region', locationInfo.region.id);
    if (locationInfo?.district?.id) params.set('district', locationInfo.district.id);
    if (locationInfo?.ward?.id) params.set('ward', locationInfo.ward.id);
    return `/map?${params.toString()}`;
  };

  const hasLocation = locationInfo?.region || locationInfo?.district || locationInfo?.ward;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card/95 to-primary/5 shadow-2xl shadow-primary/10 backdrop-blur-xl">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-accent/10 to-transparent rounded-tr-full" />
      
      {/* Close button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors z-10"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="relative p-4 md:p-5">
        <div className="flex gap-3 md:gap-4">
          {/* Robot Avatar */}
          <div className="relative shrink-0">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30 animate-pulse">
              <Bot className="h-6 w-6 md:h-7 md:w-7 text-primary-foreground" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center shadow-sm">
              <Sparkles className="h-2.5 w-2.5 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-3">
            {loading ? (
              <div className="flex items-center gap-3 py-3">
                <div className="relative">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div className="absolute inset-0 h-5 w-5 animate-ping text-primary opacity-30">
                    <Target className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Pinpointing your location...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Matching with ward boundaries
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" onClick={detectLocation} className="gap-2">
                  <Navigation className="h-4 w-4" />
                  Try Again
                </Button>
              </div>
            ) : locationInfo ? (
              <>
                <div className="space-y-2">
                  {hasLocation ? (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-primary font-semibold">
                        📍 Location Detected
                      </p>
                      <p className="text-sm md:text-base font-medium text-foreground leading-snug">
                        You're in{' '}
                        {locationInfo.ward && (
                          <span className="text-primary font-bold">{locationInfo.ward.name}</span>
                        )}
                        {locationInfo.ward && locationInfo.district && ' ward, '}
                        {locationInfo.district && (
                          <span className="font-semibold">{locationInfo.district.name}</span>
                        )}
                        {locationInfo.district && ' District'}
                        {locationInfo.region && (
                          <>, <span className="font-semibold">{locationInfo.region.name}</span> Region</>
                        )}
                        {propertyCount > 0 && (
                          <span className="text-muted-foreground block mt-0.5">
                            🏠 {propertyCount} {propertyCount === 1 ? 'property' : 'properties'} available nearby!
                          </span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-amber-500 font-semibold">
                        🌍 Outside Coverage Area
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Your location ({locationInfo.latitude.toFixed(4)}°, {locationInfo.longitude.toFixed(4)}°) isn't within our mapped wards yet. Browse the map to explore available properties!
                      </p>
                    </div>
                  )}
                  
                  {/* Accuracy indicator */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
                      <MapPin className="h-3 w-3" />
                      <span>±{locationInfo.accuracy < 1000 ? `${Math.round(locationInfo.accuracy)}m` : `${(locationInfo.accuracy / 1000).toFixed(1)}km`}</span>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`text-[10px] px-2 py-0.5 ${getAccuracyInfo(locationInfo.accuracy).color} text-white border-0`}
                    >
                      {getAccuracyInfo(locationInfo.accuracy).icon} {getAccuracyInfo(locationInfo.accuracy).label}
                    </Badge>
                  </div>
                </div>

                {/* CTA Button */}
                <Link to={buildMapUrl()} className="block">
                  <Button 
                    size="sm" 
                    className="w-full md:w-auto gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <MapPin className="h-4 w-4" />
                    {hasLocation ? 'Explore Properties Near You' : 'Browse the Map'}
                    <ChevronRight className="h-4 w-4 -mr-1" />
                  </Button>
                </Link>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Enable location to discover properties in your area
                </p>
                <Button variant="outline" size="sm" onClick={detectLocation} className="gap-2">
                  <Navigation className="h-4 w-4" />
                  Enable Location
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
