import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  MapPin, 
  Layers, 
  Download, 
  Archive, 
  Trash2, 
  Eye,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  AlertCircle,
  FileText,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import * as turf from '@turf/turf';

interface OverlapPair {
  id: string;
  listing1_id: string;
  listing1_title: string;
  listing1_status: string;
  listing1_owner_id: string;
  listing1_region: string | null;
  listing2_id: string;
  listing2_title: string;
  listing2_status: string;
  listing2_owner_id: string;
  listing2_region: string | null;
  overlap_percentage: number;
  overlap_area_m2: number;
  is_same_owner: boolean;
  created_at: Date;
}

interface ListingPolygon {
  listing_id: string;
  geojson: any;
  area_m2: number | null;
  listings: {
    id: string;
    title: string;
    status: string;
    owner_id: string;
    region: string | null;
    district: string | null;
    created_at: string;
  };
}

interface OverlapStats {
  total: number;
  critical: number;
  high: number;
  low: number;
  sameOwner: number;
  differentOwner: number;
}

export default function AdminOverlapReview() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [overlaps, setOverlaps] = useState<OverlapPair[]>([]);
  const [filteredOverlaps, setFilteredOverlaps] = useState<OverlapPair[]>([]);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);
  const [selectedOverlaps, setSelectedOverlaps] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [actionDialog, setActionDialog] = useState<{open: boolean; type: 'archive' | 'delete' | null; listingId: string | null}>({
    open: false,
    type: null,
    listingId: null
  });
  const [actionNotes, setActionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const allowedRoles = ['admin', 'verification_officer', 'spatial_analyst'];

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (roles && roles.length > 0 && !roles.some((r) => allowedRoles.includes(r))) {
      navigate('/dashboard');
      toast.error('You do not have permission to access this page');
      return;
    }
    setLoading(false);
  }, [user, roles, navigate]);

  // Filter overlaps when search/filters change
  useEffect(() => {
    let filtered = [...overlaps];
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o => 
        o.listing1_title.toLowerCase().includes(term) ||
        o.listing2_title.toLowerCase().includes(term) ||
        o.listing1_id.toLowerCase().includes(term) ||
        o.listing2_id.toLowerCase().includes(term)
      );
    }
    
    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(o => {
        if (severityFilter === 'critical') return o.overlap_percentage >= 50;
        if (severityFilter === 'high') return o.overlap_percentage >= 20 && o.overlap_percentage < 50;
        if (severityFilter === 'low') return o.overlap_percentage < 20;
        return true;
      });
    }
    
    // Owner filter
    if (ownerFilter !== 'all') {
      filtered = filtered.filter(o => {
        if (ownerFilter === 'same') return o.is_same_owner;
        if (ownerFilter === 'different') return !o.is_same_owner;
        return true;
      });
    }
    
    setFilteredOverlaps(filtered);
  }, [overlaps, searchTerm, severityFilter, ownerFilter]);

  const getStats = (): OverlapStats => {
    return {
      total: overlaps.length,
      critical: overlaps.filter(o => o.overlap_percentage >= 50).length,
      high: overlaps.filter(o => o.overlap_percentage >= 20 && o.overlap_percentage < 50).length,
      low: overlaps.filter(o => o.overlap_percentage < 20).length,
      sameOwner: overlaps.filter(o => o.is_same_owner).length,
      differentOwner: overlaps.filter(o => !o.is_same_owner).length,
    };
  };

  const analyzeOverlaps = async () => {
    setAnalyzing(true);
    try {
      const { data: polygons, error } = await supabase
        .from('listing_polygons')
        .select(`
          listing_id,
          geojson,
          area_m2,
          listings!inner (
            id,
            title,
            status,
            owner_id,
            region,
            district,
            created_at
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

          try {
            const intersection = turf.intersect(turf.featureCollection([turfPoly1, turfPoly2]));
            
            if (intersection) {
              const intersectionArea = turf.area(intersection);
              const overlapPercentage = (intersectionArea / Math.min(area1, turf.area(turfPoly2))) * 100;

              if (overlapPercentage >= 10) {
                detectedOverlaps.push({
                  id: pairKey,
                  listing1_id: poly1.listing_id,
                  listing1_title: poly1.listings.title,
                  listing1_status: poly1.listings.status,
                  listing1_owner_id: poly1.listings.owner_id,
                  listing1_region: poly1.listings.region,
                  listing2_id: poly2.listing_id,
                  listing2_title: poly2.listings.title,
                  listing2_status: poly2.listings.status,
                  listing2_owner_id: poly2.listings.owner_id,
                  listing2_region: poly2.listings.region,
                  overlap_percentage: Math.round(overlapPercentage * 10) / 10,
                  overlap_area_m2: Math.round(intersectionArea),
                  is_same_owner: poly1.listings.owner_id === poly2.listings.owner_id,
                  created_at: new Date(),
                });
              }
            }
          } catch (e) {
            console.error('Error calculating intersection:', e);
          }
        }
      }

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

  const handleArchiveListing = async (listingId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'archived' })
        .eq('id', listingId);

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert({
        action_type: 'ARCHIVE_DUPLICATE_LISTING',
        actor_id: user?.id,
        listing_id: listingId,
        action_details: { reason: actionNotes || 'Duplicate polygon detected' }
      });

      toast.success('Listing archived successfully');
      setActionDialog({ open: false, type: null, listingId: null });
      setActionNotes('');
      
      // Remove from overlaps list
      setOverlaps(prev => prev.filter(o => 
        o.listing1_id !== listingId && o.listing2_id !== listingId
      ));
    } catch (error) {
      console.error('Error archiving listing:', error);
      toast.error('Failed to archive listing');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    setProcessing(true);
    try {
      // Delete related data first
      await supabase.from('listing_polygons').delete().eq('listing_id', listingId);
      await supabase.from('listing_media').delete().eq('listing_id', listingId);
      
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert({
        action_type: 'DELETE_DUPLICATE_LISTING',
        actor_id: user?.id,
        action_details: { 
          deleted_listing_id: listingId,
          reason: actionNotes || 'Duplicate polygon detected' 
        }
      });

      toast.success('Listing deleted successfully');
      setActionDialog({ open: false, type: null, listingId: null });
      setActionNotes('');
      
      // Remove from overlaps list
      setOverlaps(prev => prev.filter(o => 
        o.listing1_id !== listingId && o.listing2_id !== listingId
      ));
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    } finally {
      setProcessing(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Severity', 'Property 1', 'Property 1 ID', 'Property 2', 'Property 2 ID', 'Overlap %', 'Overlap Area (m²)', 'Same Owner'];
    const rows = filteredOverlaps.map(o => [
      o.overlap_percentage >= 50 ? 'Critical' : o.overlap_percentage >= 20 ? 'High' : 'Low',
      o.listing1_title,
      o.listing1_id,
      o.listing2_title,
      o.listing2_id,
      o.overlap_percentage,
      o.overlap_area_m2,
      o.is_same_owner ? 'Yes' : 'No'
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overlap-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Report exported successfully');
  };

  const toggleSelectAll = () => {
    if (selectedOverlaps.size === filteredOverlaps.length) {
      setSelectedOverlaps(new Set());
    } else {
      setSelectedOverlaps(new Set(filteredOverlaps.map(o => o.id)));
    }
  };

  const getSeverityBadge = (percentage: number) => {
    if (percentage >= 50) {
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Critical ({percentage}%)</Badge>;
    } else if (percentage >= 20) {
      return <Badge className="bg-orange-500 text-white gap-1"><AlertTriangle className="h-3 w-3" /> High ({percentage}%)</Badge>;
    } else {
      return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> Low ({percentage}%)</Badge>;
    }
  };

  const formatArea = (area: number) => {
    if (area >= 10000) {
      return `${(area / 10000).toFixed(2)} ha`;
    }
    return `${area.toLocaleString()} m²`;
  };

  const stats = getStats();

  if (loading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              Polygon Overlap Detection
            </h1>
            <p className="text-muted-foreground mt-1">
              Detect, review, and resolve property boundary conflicts
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              onClick={exportToCSV}
              disabled={overlaps.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button 
              onClick={analyzeOverlaps} 
              disabled={analyzing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${analyzing ? 'animate-spin' : ''}`} />
              {analyzing ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Overlaps</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Layers className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical (≥50%)</p>
                  <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
                </div>
                <XCircle className="h-8 w-8 text-destructive opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">High (20-50%)</p>
                  <p className="text-2xl font-bold text-orange-500">{stats.high}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-muted-foreground">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Same Owner</p>
                  <p className="text-2xl font-bold">{stats.sameOwner}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Last Analyzed Alert */}
        {lastAnalyzed && (
          <Alert variant={stats.critical > 0 ? 'destructive' : 'default'}>
            <Clock className="h-4 w-4" />
            <AlertTitle>Last Analysis: {lastAnalyzed.toLocaleString()}</AlertTitle>
            <AlertDescription>
              Found {overlaps.length} overlapping property pairs.
              {stats.critical > 0 && (
                <span className="font-medium ml-1">
                  {stats.critical} critical overlap(s) require immediate attention.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="overlaps" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overlaps" className="gap-2">
              <Layers className="h-4 w-4" />
              Overlaps ({filteredOverlaps.length})
            </TabsTrigger>
            <TabsTrigger value="policy" className="gap-2">
              <Settings className="h-4 w-4" />
              Policy Settings
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <FileText className="h-4 w-4" />
              Action Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overlaps" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by property name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical (≥50%)</SelectItem>
                      <SelectItem value="high">High (20-50%)</SelectItem>
                      <SelectItem value="low">Low (&lt;20%)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Owner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Owners</SelectItem>
                      <SelectItem value="same">Same Owner</SelectItem>
                      <SelectItem value="different">Different Owners</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Overlaps Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Overlapping Property Pairs</CardTitle>
                    <CardDescription>
                      Properties with ≥10% overlap. Items ≥20% would be blocked from creation.
                    </CardDescription>
                  </div>
                  {selectedOverlaps.size > 0 && (
                    <Badge variant="outline">{selectedOverlaps.size} selected</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {filteredOverlaps.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {lastAnalyzed ? (
                      <>
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                        <p className="font-medium">No overlapping properties found</p>
                        <p className="text-sm mt-1">All property boundaries are clear</p>
                      </>
                    ) : (
                      <>
                        <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No analysis performed yet</p>
                        <p className="text-sm mt-1">Click "Run Analysis" to detect overlapping properties</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]">
                            <Checkbox 
                              checked={selectedOverlaps.size === filteredOverlaps.length}
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Property 1</TableHead>
                          <TableHead>Property 2</TableHead>
                          <TableHead>Overlap</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOverlaps.map((overlap) => (
                          <TableRow 
                            key={overlap.id}
                            className={overlap.overlap_percentage >= 20 ? 'bg-destructive/5' : ''}
                          >
                            <TableCell>
                              <Checkbox 
                                checked={selectedOverlaps.has(overlap.id)}
                                onCheckedChange={(checked) => {
                                  const newSet = new Set(selectedOverlaps);
                                  if (checked) newSet.add(overlap.id);
                                  else newSet.delete(overlap.id);
                                  setSelectedOverlaps(newSet);
                                }}
                              />
                            </TableCell>
                            <TableCell>{getSeverityBadge(overlap.overlap_percentage)}</TableCell>
                            <TableCell>
                              <div className="max-w-[200px]">
                                <p className="font-medium truncate">{overlap.listing1_title}</p>
                                <p className="text-xs text-muted-foreground truncate">{overlap.listing1_id}</p>
                                {overlap.listing1_region && (
                                  <p className="text-xs text-muted-foreground">{overlap.listing1_region}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[200px]">
                                <p className="font-medium truncate">{overlap.listing2_title}</p>
                                <p className="text-xs text-muted-foreground truncate">{overlap.listing2_id}</p>
                                {overlap.listing2_region && (
                                  <p className="text-xs text-muted-foreground">{overlap.listing2_region}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{formatArea(overlap.overlap_area_m2)}</p>
                                <p className="text-xs text-muted-foreground">{overlap.overlap_percentage}% overlap</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={overlap.is_same_owner ? 'secondary' : 'outline'}>
                                {overlap.is_same_owner ? 'Same' : 'Different'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(`/listings/${overlap.listing1_id}`, '_blank')}
                                  title="View Property 1"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(`/listings/${overlap.listing2_id}`, '_blank')}
                                  title="View Property 2"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setActionDialog({ 
                                    open: true, 
                                    type: 'archive', 
                                    listingId: overlap.listing2_id 
                                  })}
                                  title="Archive newer listing"
                                  className="text-orange-500 hover:text-orange-600"
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setActionDialog({ 
                                    open: true, 
                                    type: 'delete', 
                                    listingId: overlap.listing2_id 
                                  })}
                                  title="Delete duplicate"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
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
          </TabsContent>

          <TabsContent value="policy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Overlap Detection Policy</CardTitle>
                <CardDescription>
                  Configure how polygon overlaps are detected and handled
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <h4 className="font-medium text-green-700 dark:text-green-400">Allowed (&lt;20%)</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Minor overlaps are allowed for adjacent properties with shared boundaries. These are considered normal for neighboring plots.
                    </p>
                  </div>
                  <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <h4 className="font-medium text-orange-700 dark:text-orange-400">Warning (10-20%)</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Users are warned about the overlap but can proceed. These are flagged for admin review after submission.
                    </p>
                  </div>
                  <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <h4 className="font-medium text-red-700 dark:text-red-400">Blocked (≥20%)</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Listing creation is blocked. The user must adjust boundaries or contact admin to resolve the conflict.
                    </p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">How Overlap is Calculated</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Overlap percentage is calculated as: (Intersection Area / Smaller Polygon Area) × 100
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Using the smaller polygon ensures duplicates are always detected at near 100%
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Exact duplicate detection uses geometric equality check before overlap calculation
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Bounding box pre-filtering optimizes performance for large datasets
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Recent Actions</CardTitle>
                <CardDescription>
                  History of overlap resolution actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center py-12 text-muted-foreground">
                  Action logs will appear here after you archive or delete duplicate listings
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Dialog */}
        <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionDialog.type === 'archive' ? 'Archive Listing' : 'Delete Listing'}
              </DialogTitle>
              <DialogDescription>
                {actionDialog.type === 'archive' 
                  ? 'This will archive the listing and remove it from public view. It can be restored later.'
                  : 'This will permanently delete the listing and all associated data. This action cannot be undone.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Reason / Notes</label>
                <Textarea
                  placeholder="Enter reason for this action..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setActionDialog({ open: false, type: null, listingId: null })}
              >
                Cancel
              </Button>
              <Button
                variant={actionDialog.type === 'delete' ? 'destructive' : 'default'}
                onClick={() => {
                  if (actionDialog.listingId) {
                    if (actionDialog.type === 'archive') {
                      handleArchiveListing(actionDialog.listingId);
                    } else {
                      handleDeleteListing(actionDialog.listingId);
                    }
                  }
                }}
                disabled={processing}
              >
                {processing ? 'Processing...' : actionDialog.type === 'archive' ? 'Archive' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
