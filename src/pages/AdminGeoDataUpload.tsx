import { useState } from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileJson, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type BoundaryLevel = 'regions' | 'districts' | 'wards' | 'streets_villages';

export default function AdminGeoDataUpload() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [boundaryLevel, setBoundaryLevel] = useState<BoundaryLevel>('regions');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parentId, setParentId] = useState<string>('');
  const [parents, setParents] = useState<any[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);

  // Load parent options when boundary level changes
  const loadParents = async (level: BoundaryLevel) => {
    if (level === 'regions') return; // Regions don't have parents
    
    setLoadingParents(true);
    try {
      let data: any[] = [];
      let error: any = null;

      if (level === 'districts') {
        const result = await supabase.from('regions').select('id, name').order('name');
        data = result.data || [];
        error = result.error;
      } else if (level === 'wards') {
        const result = await supabase.from('districts').select('id, name').order('name');
        data = result.data || [];
        error = result.error;
      } else if (level === 'streets_villages') {
        const result = await supabase.from('wards').select('id, name').order('name');
        data = result.data || [];
        error = result.error;
      }

      if (error) throw error;
      setParents(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to load parent boundaries: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoadingParents(false);
    }
  };

  const handleBoundaryLevelChange = (level: BoundaryLevel) => {
    setBoundaryLevel(level);
    setParentId('');
    setParents([]);
    if (level !== 'regions') {
      loadParents(level);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.json') && !selectedFile.name.endsWith('.geojson')) {
        toast({
          title: 'Invalid file',
          description: 'Please select a GeoJSON (.json or .geojson) file',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a GeoJSON file to upload',
        variant: 'destructive',
      });
      return;
    }

    if (boundaryLevel !== 'regions' && !parentId) {
      toast({
        title: 'Parent required',
        description: `Please select a parent ${boundaryLevel === 'districts' ? 'region' : boundaryLevel === 'wards' ? 'district' : 'ward'}`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Read the file
      const fileContent = await file.text();
      const geojson = JSON.parse(fileContent);

      // Validate GeoJSON structure
      if (!geojson.type || !geojson.features) {
        throw new Error('Invalid GeoJSON format');
      }

      // Process each feature
      const features = geojson.features;
      let inserted = 0;
      let errors = 0;

      for (const feature of features) {
        try {
          const properties = feature.properties || {};
          const geometry = feature.geometry;

          // Prepare the data based on boundary level
          let data: any = {
            name: properties.name || properties.NAME || 'Unnamed',
            code: properties.code || properties.CODE || null,
            geometry: geometry,
          };

          // Add parent ID for child levels
          if (boundaryLevel === 'districts') {
            data.region_id = parentId;
          } else if (boundaryLevel === 'wards') {
            data.district_id = parentId;
          } else if (boundaryLevel === 'streets_villages') {
            data.ward_id = parentId;
          }

          // Insert into the appropriate table
          let error: any = null;
          
          if (boundaryLevel === 'regions') {
            const result = await supabase.from('regions').insert(data);
            error = result.error;
          } else if (boundaryLevel === 'districts') {
            const result = await supabase.from('districts').insert(data);
            error = result.error;
          } else if (boundaryLevel === 'wards') {
            const result = await (supabase as any).from('wards').insert(data);
            error = result.error;
          } else if (boundaryLevel === 'streets_villages') {
            const result = await supabase.from('streets_villages').insert(data);
            error = result.error;
          }

          if (error) {
            console.error('Error inserting feature:', error);
            errors++;
          } else {
            inserted++;
          }
        } catch (err: any) {
          console.error('Error processing feature:', err);
          errors++;
        }
      }

      toast({
        title: 'Upload complete',
        description: `Successfully imported ${inserted} boundaries${errors > 0 ? `. ${errors} failed.` : ''}`,
      });

      // Reset form
      setFile(null);
      if (document.getElementById('file-upload') as HTMLInputElement) {
        (document.getElementById('file-upload') as HTMLInputElement).value = '';
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to process GeoJSON file',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
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
            Upload GeoJSON files to populate administrative boundaries
          </p>
        </div>

        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Upload Administrative Boundaries
              </CardTitle>
              <CardDescription>
                Import GeoJSON data for regions, districts, wards, and streets/villages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Boundary Level Selection */}
              <div className="space-y-2">
                <Label htmlFor="boundary-level">Boundary Level</Label>
                <Select
                  value={boundaryLevel}
                  onValueChange={(value) => handleBoundaryLevelChange(value as BoundaryLevel)}
                >
                  <SelectTrigger id="boundary-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regions">Regions</SelectItem>
                    <SelectItem value="districts">Districts</SelectItem>
                    <SelectItem value="wards">Wards</SelectItem>
                    <SelectItem value="streets_villages">Streets/Villages</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Parent Selection (for child levels) */}
              {boundaryLevel !== 'regions' && (
                <div className="space-y-2">
                  <Label htmlFor="parent-boundary">
                    Parent {boundaryLevel === 'districts' ? 'Region' : 
                            boundaryLevel === 'wards' ? 'District' : 'Ward'}
                  </Label>
                  <Select
                    value={parentId}
                    onValueChange={setParentId}
                    disabled={loadingParents}
                  >
                    <SelectTrigger id="parent-boundary">
                      <SelectValue placeholder={loadingParents ? 'Loading...' : 'Select parent boundary'} />
                    </SelectTrigger>
                    <SelectContent>
                      {parents.map((parent) => (
                        <SelectItem key={parent.id} value={parent.id}>
                          {parent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file-upload">GeoJSON File</Label>
                <div className="flex items-center gap-4">
                  <input
                    id="file-upload"
                    type="file"
                    accept=".json,.geojson"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="w-full"
                  >
                    <FileJson className="mr-2 h-4 w-4" />
                    {file ? file.name : 'Choose GeoJSON file'}
                  </Button>
                </div>
                {file && (
                  <p className="text-sm text-muted-foreground">
                    File size: {(file.size / 1024).toFixed(2)} KB
                  </p>
                )}
              </div>

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!file || uploading || (boundaryLevel !== 'regions' && !parentId)}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload GeoJSON
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Instructions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">GeoJSON Format Requirements:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>File must be valid GeoJSON format</li>
                  <li>Each feature should have a "name" property</li>
                  <li>Optional "code" property for administrative codes</li>
                  <li>Geometry can be Polygon or MultiPolygon</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Upload Order:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Upload Regions first (top level)</li>
                  <li>Upload Districts (select parent region)</li>
                  <li>Upload Wards (select parent district)</li>
                  <li>Upload Streets/Villages (select parent ward)</li>
                </ol>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2 text-sm">Example GeoJSON Structure:</h4>
                <pre className="text-xs overflow-x-auto">
{`{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Dar es Salaam",
        "code": "DSM"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      }
    }
  ]
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
