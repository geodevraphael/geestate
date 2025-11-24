import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layouts/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Maximize2, Calendar, Edit, Plus, Building, Tag, ListPlus, CheckCircle2, Share2, Eye, TrendingUp } from 'lucide-react';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { Checkbox } from '@/components/ui/checkbox';
import { PropertyMapThumbnail } from '@/components/PropertyMapThumbnail';
import { toast } from 'sonner';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [unassignedListings, setUnassignedListings] = useState<any[]>([]);
  const [selectedListings, setSelectedListings] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

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
        toast.error('Project Not Found', {
          description: 'The project you are looking for does not exist',
        });
        navigate('/projects');
        return;
      }

      setProject(projectData);

      // Check if current user is the project owner
      const isOwner = profile?.id === projectData.owner_id;

      // Build the query - only fetch published listings for non-owners (buyers)
      let query = supabase
        .from('listings')
        .select(`
          *,
          valuation:valuation_estimates(estimated_value, estimation_currency),
          polygon:listing_polygons(area_m2)
        `)
        .eq('project_id', id);

      // If not the owner, only show published listings
      if (!isOwner) {
        query = query.eq('status', 'published');
      }

      const { data: listingsData, error: listingsError } = await query
        .order('created_at', { ascending: false });

      if (listingsError) throw listingsError;
      setListings(listingsData || []);
    } catch (error) {
      console.error('Error fetching project details:', error);
      toast.error('Error', {
        description: 'Failed to load project details',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUnassignedListings = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          polygon:listing_polygons(area_m2)
        `)
        .eq('owner_id', profile!.id)
        .is('project_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUnassignedListings(data || []);
    } catch (error) {
      console.error('Error fetching unassigned listings:', error);
      toast.error('Error', {
        description: 'Failed to load unassigned listings',
      });
    }
  };

  const handleAssignListings = async () => {
    if (selectedListings.length === 0) {
      toast.error('No Listings Selected', {
        description: 'Please select at least one listing to assign',
      });
      return;
    }

    setAssigning(true);
    try {
      const { error } = await supabase
        .from('listings')
        .update({ project_id: id })
        .in('id', selectedListings);

      if (error) throw error;

      toast.success('Listings Assigned', {
        description: `${selectedListings.length} listing(s) have been assigned to this project`,
      });

      setShowAssignDialog(false);
      setSelectedListings([]);
      fetchProjectDetails();
    } catch (error) {
      console.error('Error assigning listings:', error);
      toast.error('Error', {
        description: 'Failed to assign listings',
      });
    } finally {
      setAssigning(false);
    }
  };

  const toggleListingSelection = (listingId: string) => {
    setSelectedListings(prev =>
      prev.includes(listingId)
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId]
    );
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

  const handleShareListing = (listingId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const listingUrl = `${window.location.origin}/listings/${listingId}`;
    navigator.clipboard.writeText(listingUrl);
    toast.success('Listing link copied to clipboard!');
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

  const isOwner = profile?.id === project?.owner_id;

  return (
    <MainLayout>
      <div className="w-full">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
          <div className="w-full px-4 md:px-8 lg:px-12 py-6 md:py-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate(isOwner ? '/projects' : '/listings')} 
                  className="mb-4 -ml-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {isOwner ? 'Back to My Projects' : 'Back to Marketplace'}
                </Button>
                <h1 className="text-3xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {project.name}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  {project.location && (
                    <p className="text-sm md:text-lg text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {project.location}
                    </p>
                  )}
                  <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="text-sm">
                    {project.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              {isOwner && (
                <Button onClick={() => navigate(`/projects/edit/${project.id}`)} size="lg" className="gap-2 shadow-lg">
                  <Edit className="h-4 w-4" />
                  Edit Project
                </Button>
              )}
            </div>

            {/* Cover Image */}
            {project.image_url && (
              <div className="w-full h-64 md:h-96 overflow-hidden rounded-2xl shadow-2xl border border-border/50">
                <img 
                  src={project.image_url} 
                  alt={project.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Project Stats */}
            <div className="mt-6">
              <Card className="shadow-lg border-border/50 rounded-2xl overflow-hidden backdrop-blur-sm bg-background/95">
                <CardContent className="p-6">
                  {project.description && (
                    <p className="text-muted-foreground leading-relaxed mb-6">{project.description}</p>
                  )}
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                      <p className="text-sm text-muted-foreground mb-1">Project Type</p>
                      <p className="text-lg font-semibold capitalize">{project.project_type || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
                      <p className="text-sm text-muted-foreground mb-1">Total Plots</p>
                      <p className="text-lg font-semibold">{listings.length}</p>
                    </div>
                    {project.total_area_m2 && (
                      <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20">
                        <p className="text-sm text-muted-foreground mb-1">Total Area</p>
                        <p className="text-lg font-semibold flex items-center gap-1">
                          <Maximize2 className="h-4 w-4" />
                          {project.total_area_m2.toLocaleString()} m²
                        </p>
                      </div>
                    )}
                    {project.start_date && (
                      <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg border border-purple-500/20">
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
            </div>
          </div>
        </div>

        {/* Listings Section */}
        <div className="w-full px-4 md:px-8 lg:px-12 py-6 md:py-8">
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <p className="text-lg font-medium">
                {listings.length} {listings.length === 1 ? 'Property' : 'Properties'} Available
              </p>
            </div>
            {isOwner && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    fetchUnassignedListings();
                    setShowAssignDialog(true);
                  }}
                >
                  <ListPlus className="h-4 w-4 mr-2" />
                  Assign Existing
                </Button>
                <Link to={`/listings/new?project=${project.id}`}>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Listing
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {listings.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="text-center py-16">
                <Building className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">
                  {isOwner ? 'No listings yet' : 'No available plots'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {isOwner 
                    ? 'Add your first listing to this project to get started' 
                    : 'This project currently has no available plots for sale'}
                </p>
                {isOwner && (
                  <Link to={`/listings/new?project=${project.id}`}>
                    <Button size="lg">
                      <Plus className="h-5 w-5 mr-2" />
                      Create First Listing
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {listings.map((listing) => (
                <Card key={listing.id} className="group overflow-hidden hover:shadow-2xl transition-all duration-300 h-full rounded-2xl border-border/50 hover:border-primary/20">
                  <div className="relative">
                    {/* Map or Image */}
                    <Link to={`/listings/${listing.id}`}>
                      <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
                        {(listing as any).polygon?.geojson ? (
                          <PropertyMapThumbnail 
                            geojson={(listing as any).polygon.geojson}
                            className="w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="h-16 w-16 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                    
                    {/* Badges Overlay */}
                    <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2">
                      <div className="flex flex-col gap-1.5">
                        <Badge variant="secondary" className="capitalize text-xs shadow-lg backdrop-blur-sm bg-background/90">
                          {listing.listing_type}
                        </Badge>
                        {isOwner && (
                          <Badge variant="outline" className="capitalize text-xs shadow-lg backdrop-blur-sm bg-background/90">
                            {listing.status}
                          </Badge>
                        )}
                      </div>
                      {listing.verification_status === 'verified' && (
                        <Badge className="bg-success/90 text-success-foreground shadow-lg backdrop-blur-sm">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <Link to={`/listings/${listing.id}`}>
                      <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {listing.title}
                      </h3>
                    </Link>
                    
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0 text-primary/60" />
                      <span className="line-clamp-1">{listing.location_label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-xs">
                        {listing.property_type}
                      </Badge>
                      {(listing as any).polygon?.area_m2 && (
                        <Badge variant="outline" className="text-xs">
                          <Maximize2 className="h-3 w-3 mr-1" />
                          {(listing as any).polygon.area_m2.toLocaleString()} m²
                        </Badge>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/50">
                      <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-4">
                        {listing.price 
                          ? `${listing.price.toLocaleString()} ${listing.currency}` 
                          : (listing as any).valuation?.[0]?.estimated_value
                            ? `${(listing as any).valuation[0].estimated_value.toLocaleString()} ${(listing as any).valuation[0].estimation_currency || 'TZS'}`
                            : 'Contact for price'
                        }
                      </div>
                      
                      <div className="flex gap-2">
                        <Link to={`/listings/${listing.id}`} className="flex-1">
                          <Button variant="default" size="sm" className="w-full gap-2">
                            <Eye className="h-4 w-4" />
                            View Details
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => handleShareListing(listing.id, e)}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Assign Existing Listings Dialog - Only for owners */}
        {isOwner && (
          <ResponsiveModal
            open={showAssignDialog}
            onOpenChange={setShowAssignDialog}
            title="Assign Existing Listings"
            description="Select listings to assign to this project"
          >
            <div className="space-y-4">
              {unassignedListings.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No unassigned listings found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    All your listings are already assigned to projects
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {unassignedListings.map((listing) => (
                      <div
                        key={listing.id}
                        className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => toggleListingSelection(listing.id)}
                      >
                        <Checkbox
                          checked={selectedListings.includes(listing.id)}
                          onCheckedChange={() => toggleListingSelection(listing.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium line-clamp-1">{listing.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="line-clamp-1">{listing.location_label}</span>
                            </div>
                            {listing.polygon?.area_m2 && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <Maximize2 className="h-3 w-3" />
                                  <span>{listing.polygon.area_m2.toLocaleString()} m²</span>
                                </div>
                              </>
                            )}
                          </div>
                          <div className="mt-2">
                            {getStatusBadge(listing.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAssignListings} 
                      disabled={assigning || selectedListings.length === 0}
                    >
                      {assigning ? 'Assigning...' : `Assign ${selectedListings.length} Listing(s)`}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </ResponsiveModal>
        )}
      </div>
    </MainLayout>
  );
}