import { useState } from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileJson, MapPin, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import * as topojson from 'topojson-client';

interface FieldMapping {
  region_name: string;
  district_name: string;
  ward_name: string;
  region_code?: string;
  district_code?: string;
  ward_code?: string;
}

export default function AdminGeoDataUpload() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileProperties, setFileProperties] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({
    region_name: '',
    district_name: '',
    ward_name: '',
    region_code: '',
    district_code: '',
    ward_code: '',
  });
  const [step, setStep] = useState<'upload' | 'mapping' | 'processing'>('upload');
  const [stats, setStats] = useState({ regions: 0, districts: 0, wards: 0, errors: 0 });
  const [assigningBoundaries, setAssigningBoundaries] = useState(false);
  const [boundaryStats, setBoundaryStats] = useState({ total: 0, updated: 0, failed: 0 });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.json') && !selectedFile.name.endsWith('.topojson')) {
        toast({
          title: 'Invalid file',
          description: 'Please select a TopoJSON (.json or .topojson) file',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
      
      // Parse file to extract properties
      try {
        const fileContent = await selectedFile.text();
        const topology = JSON.parse(fileContent);
        
        // Get first feature to extract property names
        const firstObject = Object.values(topology.objects)[0] as any;
        if (firstObject && firstObject.geometries && firstObject.geometries[0]) {
          const properties = Object.keys(firstObject.geometries[0].properties || {});
          setFileProperties(properties);
          setStep('mapping');
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        toast({
          title: 'Error',
          description: 'Failed to parse TopoJSON file',
          variant: 'destructive',
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !fieldMapping.region_name || !fieldMapping.district_name || !fieldMapping.ward_name) {
      toast({
        title: 'Missing information',
        description: 'Please map all required fields',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setStep('processing');
    
    try {
      const fileContent = await file.text();
      const topology = JSON.parse(fileContent);
      
      // Convert TopoJSON to GeoJSON
      const firstObjectKey = Object.keys(topology.objects)[0];
      const geojson = topojson.feature(topology, topology.objects[firstObjectKey]) as any;
      
      const features = geojson.features;
      const regionMap = new Map<string, string>();
      const districtMap = new Map<string, string>();
      let regionsInserted = 0;
      let districtsInserted = 0;
      let wardsInserted = 0;
      let errors = 0;

      // Group features by region
      const featuresByRegion = new Map<string, any[]>();
      features.forEach((feature: any) => {
        const regionName = feature.properties[fieldMapping.region_name];
        if (!featuresByRegion.has(regionName)) {
          featuresByRegion.set(regionName, []);
        }
        featuresByRegion.get(regionName)?.push(feature);
      });

      // Process each region
      for (const [regionName, regionFeatures] of featuresByRegion.entries()) {
        try {
          // Insert or get region
          let regionId: string;
          const regionCode = fieldMapping.region_code 
            ? regionFeatures[0].properties[fieldMapping.region_code] 
            : null;

          const { data: existingRegion } = await supabase
            .from('regions')
            .select('id')
            .eq('name', regionName)
            .single();

          if (existingRegion) {
            regionId = existingRegion.id;
          } else {
            const { data: newRegion, error: regionError } = await supabase
              .from('regions')
              .insert({
                name: regionName,
                code: regionCode,
                geometry: null, // Regions don't have geometry in this model
              })
              .select('id')
              .single();

            if (regionError) throw regionError;
            regionId = newRegion.id;
            regionsInserted++;
          }

          regionMap.set(regionName, regionId);

          // Group by district within this region
          const featuresByDistrict = new Map<string, any[]>();
          regionFeatures.forEach((feature: any) => {
            const districtName = feature.properties[fieldMapping.district_name];
            const key = `${regionName}-${districtName}`;
            if (!featuresByDistrict.has(key)) {
              featuresByDistrict.set(key, []);
            }
            featuresByDistrict.get(key)?.push(feature);
          });

          // Process each district
          for (const [key, districtFeatures] of featuresByDistrict.entries()) {
            try {
              const districtName = districtFeatures[0].properties[fieldMapping.district_name];
              let districtId: string;
              const districtCode = fieldMapping.district_code
                ? districtFeatures[0].properties[fieldMapping.district_code]
                : null;

              const { data: existingDistrict } = await supabase
                .from('districts')
                .select('id')
                .eq('name', districtName)
                .eq('region_id', regionId)
                .single();

              if (existingDistrict) {
                districtId = existingDistrict.id;
              } else {
                const { data: newDistrict, error: districtError } = await supabase
                  .from('districts')
                  .insert({
                    name: districtName,
                    code: districtCode,
                    region_id: regionId,
                    geometry: null,
                  })
                  .select('id')
                  .single();

                if (districtError) throw districtError;
                districtId = newDistrict.id;
                districtsInserted++;
              }

              districtMap.set(key, districtId);

              // Process wards
              for (const feature of districtFeatures) {
                try {
                  const wardName = feature.properties[fieldMapping.ward_name];
                  const wardCode = fieldMapping.ward_code
                    ? feature.properties[fieldMapping.ward_code]
                    : null;

                  const { data: existingWard } = await supabase
                    .from('wards')
                    .select('id')
                    .eq('name', wardName)
                    .eq('district_id', districtId)
                    .maybeSingle();

                  if (!existingWard) {
                    const { error: wardError } = await supabase
                      .from('wards')
                      .insert({
                        name: wardName,
                        code: wardCode,
                        district_id: districtId,
                        geometry: feature.geometry,
                      });

                    if (wardError) {
                      console.error('Error inserting ward:', wardError);
                      errors++;
                    } else {
                      wardsInserted++;
                    }
                  }
                } catch (err) {
                  console.error('Error processing ward:', err);
                  errors++;
                }
              }
            } catch (err) {
              console.error('Error processing district:', err);
              errors++;
            }
          }
        } catch (err) {
          console.error('Error processing region:', err);
          errors++;
        }
      }

      setStats({ regions: regionsInserted, districts: districtsInserted, wards: wardsInserted, errors });
      
      toast({
        title: 'Upload complete',
        description: `Inserted ${regionsInserted} regions, ${districtsInserted} districts, ${wardsInserted} wards${errors > 0 ? `. ${errors} errors occurred.` : ''}`,
      });

      // Reset form
      setFile(null);
      setStep('upload');
      setFieldMapping({
        region_name: '',
        district_name: '',
        ward_name: '',
        region_code: '',
        district_code: '',
        ward_code: '',
      });
      if (document.getElementById('file-upload') as HTMLInputElement) {
        (document.getElementById('file-upload') as HTMLInputElement).value = '';
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to process TopoJSON file',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const assignBoundariesToExistingListings = async () => {
    setAssigningBoundaries(true);
    setBoundaryStats({ total: 0, updated: 0, failed: 0 });

    try {
      // Get all listings with polygons but missing boundary data
      const { data: listings, error: fetchError } = await supabase
        .from('listings')
        .select('id, listing_polygons(geojson)')
        .or('region_id.is.null,district_id.is.null,ward_id.is.null')
        .not('listing_polygons', 'is', null);

      if (fetchError) throw fetchError;

      if (!listings || listings.length === 0) {
        toast({
          title: 'No listings to update',
          description: 'All listings already have administrative boundaries assigned',
        });
        setAssigningBoundaries(false);
        return;
      }

      setBoundaryStats(prev => ({ ...prev, total: listings.length }));
      let updated = 0;
      let failed = 0;

      // Process each listing
      for (const listing of listings) {
        try {
          const listingPolygons = listing.listing_polygons as any;
          if (!listingPolygons || (Array.isArray(listingPolygons) && listingPolygons.length === 0)) {
            failed++;
            continue;
          }

          const polygon = Array.isArray(listingPolygons) ? listingPolygons[0].geojson : listingPolygons.geojson;

          // Call edge function to detect boundaries
          const { data: boundariesData, error: boundariesError } = await supabase.functions.invoke(
            'detect-admin-boundaries',
            {
              body: { polygon: { type: 'Feature', geometry: polygon } },
            }
          );

          if (boundariesError || !boundariesData?.success) {
            console.error(`Failed to detect boundaries for listing ${listing.id}:`, boundariesError);
            failed++;
            setBoundaryStats(prev => ({ ...prev, failed: prev.failed + 1 }));
            continue;
          }

          const { boundaries } = boundariesData;

          // Update listing with detected boundaries
          const { error: updateError } = await supabase
            .from('listings')
            .update({
              region_id: boundaries.region_id,
              district_id: boundaries.district_id,
              ward_id: boundaries.ward_id,
              street_village_id: boundaries.street_village_id,
            })
            .eq('id', listing.id);

          if (updateError) {
            console.error(`Failed to update listing ${listing.id}:`, updateError);
            failed++;
            setBoundaryStats(prev => ({ ...prev, failed: prev.failed + 1 }));
          } else {
            updated++;
            setBoundaryStats(prev => ({ ...prev, updated: prev.updated + 1 }));
          }
        } catch (error) {
          console.error(`Error processing listing ${listing.id}:`, error);
          failed++;
          setBoundaryStats(prev => ({ ...prev, failed: prev.failed + 1 }));
        }
      }

      toast({
        title: 'Boundary Assignment Complete',
        description: `Updated ${updated} of ${listings.length} listings. ${failed} failed.`,
      });
    } catch (error) {
      console.error('Error assigning boundaries:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign boundaries to listings',
        variant: 'destructive',
      });
    } finally {
      setAssigningBoundaries(false);
    }
  };

  if (!hasRole('admin')) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access this page.</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Geographic Data Upload</h1>
          <p className="text-muted-foreground">
            Upload a single TopoJSON file containing hierarchical administrative boundaries (Regions → Districts → Wards)
          </p>
        </div>

        <div className="grid gap-6 max-w-2xl">
          {/* Assign Boundaries to Existing Listings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Assign Boundaries to Existing Listings
              </CardTitle>
              <CardDescription>
                Automatically detect and assign region, district, and ward to all existing listings based on their spatial location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={assignBoundariesToExistingListings}
                disabled={assigningBoundaries}
                className="w-full sm:w-auto"
              >
                {assigningBoundaries ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning Boundaries...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Assign Boundaries to Listings
                  </>
                )}
              </Button>

              {boundaryStats.total > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Processing {boundaryStats.total} listings
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-semibold text-foreground">{boundaryStats.total}</div>
                      <div className="text-muted-foreground">Total</div>
                    </div>
                    <div>
                      <div className="font-semibold text-green-600">{boundaryStats.updated}</div>
                      <div className="text-muted-foreground">Updated</div>
                    </div>
                    <div>
                      <div className="font-semibold text-red-600">{boundaryStats.failed}</div>
                      <div className="text-muted-foreground">Failed</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Step 1: File Upload */}
          {step === 'upload' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Upload TopoJSON File
                </CardTitle>
                <CardDescription>
                  Select a TopoJSON file containing administrative boundaries with hierarchical data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="file-upload">TopoJSON File</Label>
                  <div className="flex items-center gap-4">
                    <input
                      id="file-upload"
                      type="file"
                      accept=".json,.topojson"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      className="w-full"
                    >
                      <FileJson className="mr-2 h-4 w-4" />
                      {file ? file.name : 'Choose TopoJSON file'}
                    </Button>
                  </div>
                  {file && (
                    <p className="text-sm text-muted-foreground">
                      File size: {(file.size / 1024).toFixed(2)} KB
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Field Mapping */}
          {step === 'mapping' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-primary" />
                  Map Fields
                </CardTitle>
                <CardDescription>
                  Map the TopoJSON properties to database fields
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="region-name">Region Name Field *</Label>
                  <Select value={fieldMapping.region_name} onValueChange={(value) => setFieldMapping({...fieldMapping, region_name: value})}>
                    <SelectTrigger id="region-name">
                      <SelectValue placeholder="Select property for region name" />
                    </SelectTrigger>
                    <SelectContent>
                      {fileProperties.map((prop) => (
                        <SelectItem key={prop} value={prop}>{prop}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="district-name">District Name Field *</Label>
                  <Select value={fieldMapping.district_name} onValueChange={(value) => setFieldMapping({...fieldMapping, district_name: value})}>
                    <SelectTrigger id="district-name">
                      <SelectValue placeholder="Select property for district name" />
                    </SelectTrigger>
                    <SelectContent>
                      {fileProperties.map((prop) => (
                        <SelectItem key={prop} value={prop}>{prop}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ward-name">Ward Name Field *</Label>
                  <Select value={fieldMapping.ward_name} onValueChange={(value) => setFieldMapping({...fieldMapping, ward_name: value})}>
                    <SelectTrigger id="ward-name">
                      <SelectValue placeholder="Select property for ward name" />
                    </SelectTrigger>
                    <SelectContent>
                      {fileProperties.map((prop) => (
                        <SelectItem key={prop} value={prop}>{prop}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Optional Code Fields</p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="region-code">Region Code Field</Label>
                    <Select value={fieldMapping.region_code || 'none'} onValueChange={(value) => setFieldMapping({...fieldMapping, region_code: value === 'none' ? '' : value})}>
                      <SelectTrigger id="region-code">
                        <SelectValue placeholder="Select property for region code (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {fileProperties.map((prop) => (
                          <SelectItem key={prop} value={prop}>{prop}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="district-code">District Code Field</Label>
                    <Select value={fieldMapping.district_code || 'none'} onValueChange={(value) => setFieldMapping({...fieldMapping, district_code: value === 'none' ? '' : value})}>
                      <SelectTrigger id="district-code">
                        <SelectValue placeholder="Select property for district code (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {fileProperties.map((prop) => (
                          <SelectItem key={prop} value={prop}>{prop}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ward-code">Ward Code Field</Label>
                    <Select value={fieldMapping.ward_code || 'none'} onValueChange={(value) => setFieldMapping({...fieldMapping, ward_code: value === 'none' ? '' : value})}>
                      <SelectTrigger id="ward-code">
                        <SelectValue placeholder="Select property for ward code (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {fileProperties.map((prop) => (
                          <SelectItem key={prop} value={prop}>{prop}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => { setStep('upload'); setFile(null); }}>
                    Back
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!fieldMapping.region_name || !fieldMapping.district_name || !fieldMapping.ward_name || uploading}
                    className="flex-1"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Process and Upload
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Processing */}
          {step === 'processing' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {uploading ? 'Processing...' : 'Complete'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Regions inserted:</span>
                    <span className="font-medium">{stats.regions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Districts inserted:</span>
                    <span className="font-medium">{stats.districts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Wards inserted:</span>
                    <span className="font-medium">{stats.wards}</span>
                  </div>
                  {stats.errors > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Errors:</span>
                      <span className="font-medium">{stats.errors}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions Card */}
          <Card>
            <CardHeader>
              <CardTitle>File Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">TopoJSON Format:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>File must be valid TopoJSON format</li>
                  <li>Each feature must have properties for region, district, and ward names</li>
                  <li>Optional code properties for administrative codes</li>
                  <li>Ward geometries will be stored; regions and districts won't have geometries</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">How It Works:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Upload a single TopoJSON file containing all boundaries</li>
                  <li>Map the property names to database fields</li>
                  <li>System automatically creates hierarchical relationships</li>
                  <li>Duplicate entries are skipped automatically</li>
                </ol>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2 text-sm">Example Feature Properties:</h4>
                <pre className="text-xs overflow-x-auto">
{`{
  "Region_Name": "Dar es Salaam",
  "District_Nam": "Ilala",
  "Ward_Name": "Buguruni",
  "Reg_Code": "DSM",
  "Dstrct_Cod": "IL",
  "Ward_Code": "BG"
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
