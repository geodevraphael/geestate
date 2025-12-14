import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, RefreshCw, ExternalLink, MapPin, Layers } from 'lucide-react';
import { toast } from 'sonner';
import * as turf from '@turf/turf';

interface OverlapPair {
  listing1_id: string;
  listing1_title: string;
  listing2_id: string;
  listing2_title: string;
  overlap_percentage: number;
  overlap_area_m2: number;
}

interface ListingPolygon {
  listing_id: string;
  geojson: any;
  listings: {
    id: string;
    title: string;
    status: string;
    owner_id: string;
    region: string | null;
    district: string | null;
  };
}

export default function AdminOverlapReview() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [overlaps, setOverlaps] = useState<OverlapPair[]>([]);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);

  const allowedRoles = ['admin', 'verification_officer', 'spatial_analyst'];

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Enforce role-based access using roles from user_roles
    if (roles && roles.length > 0 && !roles.some((r) => allowedRoles.includes(r))) {
      navigate('/dashboard');
      toast.error('You do not have permission to access this page');
      return;
    }

    setLoading(false);
  }, [user, roles, navigate]);

  const analyzeOverlaps = async () => {
    setAnalyzing(true);
    try {
      // Fetch all polygons for published/pending listings
      const { data: polygons, error } = await supabase
        .from('listing_polygons')
        .select(`
          listing_id,
          geojson,
          listings!inner (
            id,
            title,
            status,
            owner_id,
            region,
            district
          )
        `)
        .not('listings.status', 'in', '("draft","archived")');

      if (error) throw error;

      const typedPolygons = polygons as unknown as ListingPolygon[];
      const detectedOverlaps: OverlapPair[] = [];
      const processedPairs = new Set<string>();

      for (let i = 0; i < typedPolygons.length; i++) {
        const poly1 = typedPolygons[i];
        if (!poly1.geojson?.coordinates) continue;

        let turfPoly1;
        try {
          turfPoly1 = turf.polygon(poly1.geojson.coordinates);
        } catch {
          continue;
        }

        const area1 = turf.area(turfPoly1);

        for (let j = i + 1; j < typedPolygons.length; j++) {
          const poly2 = typedPolygons[j];
          if (!poly2.geojson?.coordinates) continue;

          // Create unique pair key to avoid duplicates
          const pairKey = [poly1.listing_id, poly2.listing_id].sort().join('-');
          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          let turfPoly2;
          try {
            turfPoly2 = turf.polygon(poly2.geojson.coordinates);
          } catch {
            continue;
          }

          // Quick bounding box check
          const bbox1 = turf.bbox(turfPoly1);
          const bbox2 = turf.bbox(turfPoly2);
          
          if (bbox1[2] < bbox2[0] || bbox1[0] > bbox2[2] ||
              bbox1[3] < bbox2[1] || bbox1[1] > bbox2[3]) {
            continue;
          }

          // Check actual intersection
          try {
            const intersection = turf.intersect(turf.featureCollection([turfPoly1, turfPoly2]));
            
            if (intersection) {
              const intersectionArea = turf.area(intersection);
              const overlapPercentage = (intersectionArea / Math.min(area1, turf.area(turfPoly2))) * 100;

              if (overlapPercentage >= 10) {
                detectedOverlaps.push({
                  listing1_id: poly1.listing_id,
                  listing1_title: poly1.listings.title,
                  listing2_id: poly2.listing_id,
                  listing2_title: poly2.listings.title,
                  overlap_percentage: Math.round(overlapPercentage * 10) / 10,
                  overlap_area_m2: Math.round(intersectionArea),
                });
              }
            }
          } catch (e) {
            console.error('Error calculating intersection:', e);
          }
        }
      }

      // Sort by overlap percentage descending
      detectedOverlaps.sort((a, b) => b.overlap_percentage - a.overlap_percentage);
      setOverlaps(detectedOverlaps);
      setLastAnalyzed(new Date());
      toast.success(`Analysis complete: Found ${detectedOverlaps.length} overlapping pairs`);
    } catch (error) {
      console.error('Error analyzing overlaps:', error);
      toast.error('Failed to analyze overlaps');
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityBadge = (percentage: number) => {
    if (percentage >= 50) {
      return <Badge variant="destructive">Critical ({percentage}%)</Badge>;
    } else if (percentage >= 20) {
      return <Badge className="bg-orange-500 text-white">High ({percentage}%)</Badge>;
    } else {
      return <Badge variant="secondary">Low ({percentage}%)</Badge>;
    }
  };

  const formatArea = (area: number) => {
    if (area >= 10000) {
      return `${(area / 10000).toFixed(2)} ha`;
    }
    return `${area.toLocaleString()} m²`;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Polygon Overlap Review
          </h1>
          <p className="text-muted-foreground mt-1">
            Detect and review listings with overlapping property boundaries
          </p>
        </div>
        <Button 
          onClick={analyzeOverlaps} 
          disabled={analyzing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${analyzing ? 'animate-spin' : ''}`} />
          {analyzing ? 'Analyzing...' : 'Run Analysis'}
        </Button>
      </div>

      {lastAnalyzed && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Last analyzed: {lastAnalyzed.toLocaleString()} • Found {overlaps.length} overlapping pairs
            {overlaps.filter(o => o.overlap_percentage >= 20).length > 0 && (
              <span className="text-destructive font-medium ml-2">
                ({overlaps.filter(o => o.overlap_percentage >= 20).length} blocking overlaps ≥20%)
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Overlapping Property Pairs</CardTitle>
          <CardDescription>
            Properties with ≥10% overlap. Red items (≥20%) would be blocked from creation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overlaps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {lastAnalyzed ? (
                <>
                  <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No overlapping properties found</p>
                </>
              ) : (
                <>
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Run Analysis" to detect overlapping properties</p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Property 1</TableHead>
                    <TableHead>Property 2</TableHead>
                    <TableHead>Overlap Area</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overlaps.map((overlap, idx) => (
                    <TableRow 
                      key={idx}
                      className={overlap.overlap_percentage >= 20 ? 'bg-destructive/5' : ''}
                    >
                      <TableCell>{getSeverityBadge(overlap.overlap_percentage)}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium truncate">{overlap.listing1_title}</p>
                          <p className="text-xs text-muted-foreground truncate">{overlap.listing1_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium truncate">{overlap.listing2_title}</p>
                          <p className="text-xs text-muted-foreground truncate">{overlap.listing2_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatArea(overlap.overlap_area_m2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/listings/${overlap.listing1_id}`, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/listings/${overlap.listing2_id}`, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overlap Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <h4 className="font-medium text-green-700 dark:text-green-400">Allowed (&lt;20%)</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Minor overlaps are allowed for adjacent properties with shared boundaries
              </p>
            </div>
            <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <h4 className="font-medium text-orange-700 dark:text-orange-400">Warning (10-20%)</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Users are warned but can proceed. Flagged for review.
              </p>
            </div>
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <h4 className="font-medium text-red-700 dark:text-red-400">Blocked (≥20%)</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Listing creation is blocked. Requires manual admin intervention.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
