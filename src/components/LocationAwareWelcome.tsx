import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bot, MapPin, Navigation, Loader2, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

interface LocationInfo {
  region: { id: string; name: string } | null;
  district: { id: string; name: string } | null;
  ward: { id: string; name: string } | null;
  accuracy: number;
  latitude: number;
  longitude: number;
}

export const LocationAwareWelcome: React.FC = () => {
  const { t } = useTranslation();
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

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
          // Query regions to find which one contains this point
          const { data: regions } = await supabase
            .from('regions')
            .select('id, name, geometry');

          let foundRegion: { id: string; name: string } | null = null;
          let foundDistrict: { id: string; name: string } | null = null;
          let foundWard: { id: string; name: string } | null = null;

          // Simple point-in-bbox check for regions (rough approximation)
          if (regions) {
            for (const region of regions) {
              if (region.geometry) {
                const geom = typeof region.geometry === 'string' 
                  ? JSON.parse(region.geometry) 
                  : region.geometry;
                
                if (isPointInGeometry(latitude, longitude, geom)) {
                  foundRegion = { id: region.id, name: region.name };
                  break;
                }
              }
            }
          }

          // If region found, search for district
          if (foundRegion) {
            const { data: districts } = await supabase
              .from('districts')
              .select('id, name, geometry')
              .eq('region_id', foundRegion.id);

            if (districts) {
              for (const district of districts) {
                if (district.geometry) {
                  const geom = typeof district.geometry === 'string'
                    ? JSON.parse(district.geometry)
                    : district.geometry;
                  
                  if (isPointInGeometry(latitude, longitude, geom)) {
                    foundDistrict = { id: district.id, name: district.name };
                    break;
                  }
                }
              }
            }
          }

          // If district found, search for ward
          if (foundDistrict) {
            const { data: wards } = await supabase
              .from('wards')
              .select('id, name, geometry')
              .eq('district_id', foundDistrict.id);

            if (wards) {
              for (const ward of wards) {
                if (ward.geometry) {
                  const geom = typeof ward.geometry === 'string'
                    ? JSON.parse(ward.geometry)
                    : ward.geometry;
                  
                  if (isPointInGeometry(latitude, longitude, geom)) {
                    foundWard = { id: ward.id, name: ward.name };
                    break;
                  }
                }
              }
            }
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
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  };

  // Simple point-in-polygon check using ray casting
  const isPointInGeometry = (lat: number, lng: number, geometry: any): boolean => {
    try {
      let coordinates: number[][][] = [];
      
      if (geometry.type === 'Polygon') {
        coordinates = [geometry.coordinates[0]];
      } else if (geometry.type === 'MultiPolygon') {
        coordinates = geometry.coordinates.map((p: number[][][]) => p[0]);
      } else {
        return false;
      }

      for (const ring of coordinates) {
        if (pointInPolygon([lng, lat], ring)) {
          return true;
        }
      }
      return false;
    } catch {
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
    // Auto-detect on mount
    const timer = setTimeout(() => {
      detectLocation();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  if (dismissed || permissionDenied) return null;

  const getAccuracyLabel = (accuracy: number) => {
    if (accuracy <= 50) return { label: 'High', color: 'bg-green-500' };
    if (accuracy <= 200) return { label: 'Medium', color: 'bg-yellow-500' };
    return { label: 'Low', color: 'bg-orange-500' };
  };

  const buildMapUrl = () => {
    const params = new URLSearchParams();
    if (locationInfo?.region?.id) params.set('region', locationInfo.region.id);
    if (locationInfo?.district?.id) params.set('district', locationInfo.district.id);
    if (locationInfo?.ward?.id) params.set('ward', locationInfo.ward.id);
    return `/map?${params.toString()}`;
  };

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 backdrop-blur-sm">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted/80 transition-colors z-10"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="p-5 flex items-start gap-4">
        {/* Robot Avatar */}
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
            <Bot className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-3">
          {loading ? (
            <div className="flex items-center gap-3 py-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Detecting your location...
              </p>
            </div>
          ) : error ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={detectLocation}>
                <Navigation className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : locationInfo ? (
            <>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  {locationInfo.region || locationInfo.district || locationInfo.ward ? (
                    <>
                      <span className="text-primary">Hello!</span> Our system detected you're in{' '}
                      {locationInfo.ward && (
                        <span className="font-semibold text-primary">{locationInfo.ward.name}</span>
                      )}
                      {locationInfo.ward && locationInfo.district && ' ward, '}
                      {locationInfo.district && (
                        <span className="font-semibold">{locationInfo.district.name}</span>
                      )}
                      {locationInfo.district && locationInfo.region && ' district, '}
                      {locationInfo.region && (
                        <span className="font-semibold">{locationInfo.region.name}</span>
                      )}
                      {locationInfo.region && ' region'}.
                    </>
                  ) : (
                    <>
                      <span className="text-primary">Hello!</span> We detected your location but couldn't match it to a known area. You might be outside our coverage zone.
                    </>
                  )}
                </p>
                
                {/* Accuracy Badge */}
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Accuracy: ±{Math.round(locationInfo.accuracy)}m
                  </span>
                  <Badge 
                    variant="secondary" 
                    className={`text-[10px] px-1.5 py-0 ${getAccuracyLabel(locationInfo.accuracy).color} text-white`}
                  >
                    {getAccuracyLabel(locationInfo.accuracy).label}
                  </Badge>
                </div>
              </div>

              {(locationInfo.region || locationInfo.district || locationInfo.ward) && (
                <Link to={buildMapUrl()}>
                  <Button size="sm" className="gap-2 shadow-lg shadow-primary/20">
                    <MapPin className="h-4 w-4" />
                    View Properties Near You
                  </Button>
                </Link>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Allow location access to discover properties near you
              </p>
              <Button variant="outline" size="sm" onClick={detectLocation}>
                <Navigation className="h-4 w-4 mr-2" />
                Enable Location
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
