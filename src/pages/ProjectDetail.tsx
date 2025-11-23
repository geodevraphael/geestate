import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layouts/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MapPin, Maximize2, Calendar, Edit, Plus, Building, Tag } from 'lucide-react';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && profile) {
      fetchProjectDetails();
    }
  }, [id, profile]);

  const fetchProjectDetails = async () => {
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (projectError) throw projectError;
      
      if (!projectData) {
        toast({
          title: 'Project Not Found',
          description: 'The project you are looking for does not exist',
          variant: 'destructive',
        });
        navigate('/projects');
        return;
      }

      setProject(projectData);

      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select(`
          *,
          valuation:valuation_estimates(estimated_value, estimation_currency),
          polygon:listing_polygons(area_m2)
        `)
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (listingsError) throw listingsError;
      setListings(listingsData || []);
    } catch (error) {
      console.error('Error fetching project details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      published: 'default',
      draft: 'secondary',
      archived: 'outline',
      closed: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/projects')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>

        {/* Project Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-3xl">{project.name}</CardTitle>
                  <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                    {project.status.replace('_', ' ')}
                  </Badge>
                </div>
                {project.location && (
                  <CardDescription className="flex items-center gap-1.5 text-base">
                    <MapPin className="h-4 w-4" />
                    {project.location}
                  </CardDescription>
                )}
              </div>
              <Button onClick={() => navigate(`/projects/edit/${project.id}`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Project
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.description && (
              <p className="text-muted-foreground">{project.description}</p>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Type</p>
                <p className="text-lg font-semibold capitalize">{project.project_type || 'N/A'}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Plots</p>
                <p className="text-lg font-semibold">{project.total_plots}</p>
              </div>
              {project.total_area_m2 && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Area</p>
                  <p className="text-lg font-semibold flex items-center gap-1">
                    <Maximize2 className="h-4 w-4" />
                    {project.total_area_m2.toLocaleString()} m²
                  </p>
                </div>
              )}
              {project.start_date && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Start Date</p>
                  <p className="text-lg font-semibold flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(project.start_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Listings */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Listings in this Project</h2>
          <Link to={`/listings/new?project=${project.id}`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Listing
            </Button>
          </Link>
        </div>

        {listings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
              <p className="text-muted-foreground mb-4">Add your first listing to this project</p>
              <Link to={`/listings/new?project=${project.id}`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Listing
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {listings.map((listing) => (
              <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <Link to={`/listings/${listing.id}`} className="block">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-xl mb-2">{listing.title}</h3>
                        <p className="text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {listing.location_label}
                        </p>
                      </div>
                      {getStatusBadge(listing.status)}
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1.5">
                        <Building className="h-4 w-4" />
                        <span className="capitalize">{listing.property_type}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-4 w-4" />
                        <span className="capitalize">{listing.listing_type}</span>
                      </div>
                      {listing.polygon?.area_m2 && (
                        <div className="flex items-center gap-1.5">
                          <Maximize2 className="h-4 w-4" />
                          <span className="font-medium">{listing.polygon.area_m2.toLocaleString()} m²</span>
                        </div>
                      )}
                    </div>

                    {(listing.price || listing.valuation?.[0]?.estimated_value) && (
                      <div className="pt-3 border-t">
                        <p className="text-2xl font-bold text-primary">
                          {listing.price 
                            ? `${listing.price.toLocaleString()} ${listing.currency}` 
                            : `${(listing.valuation[0].estimated_value).toLocaleString()} ${listing.valuation[0].estimation_currency || 'TZS'}`
                          }
                          {!listing.price && (
                            <span className="text-sm font-normal text-muted-foreground ml-2">(Estimated)</span>
                          )}
                        </p>
                      </div>
                    )}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}