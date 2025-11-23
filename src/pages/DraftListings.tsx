import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Edit, Eye, AlertCircle, MapPin, Tag, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DraftListing {
  id: string;
  title: string;
  location_label: string;
  property_type: string;
  listing_type: string;
  price: number | null;
  currency: string;
  created_at: string;
  verification_status: string;
  description: string | null;
}

export default function DraftListings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<DraftListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingIds, setPublishingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDrafts();
  }, [profile]);

  const fetchDrafts = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('owner_id', profile.id)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load draft listings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (listingId: string) => {
    setPublishingIds(prev => new Set(prev).add(listingId));
    
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'published' as 'published' })
        .eq('id', listingId);

      if (error) throw error;

      toast({
        title: 'Listing Published',
        description: 'Your property is now visible to buyers',
      });

      // Remove from drafts list
      setDrafts(prev => prev.filter(d => d.id !== listingId));
    } catch (error: any) {
      console.error('Error publishing listing:', error);
      toast({
        title: 'Publishing Failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setPublishingIds(prev => {
        const next = new Set(prev);
        next.delete(listingId);
        return next;
      });
    }
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

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Draft Listings</h1>
          <p className="text-muted-foreground">
            Manage your unpublished property listings
          </p>
        </div>

        {/* Info Alert */}
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Draft listings are saved but not visible to buyers. Click "Publish" to make them live on the marketplace.
          </AlertDescription>
        </Alert>

        {/* Empty State */}
        {drafts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Draft Listings</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                All your listings are published! Create a new listing to add more properties.
              </p>
              <Link to="/listings/new">
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Create New Listing
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="mb-6">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {drafts.length} Draft{drafts.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Draft Listings Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {drafts.map((draft) => (
                <Card key={draft.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">{draft.title}</CardTitle>
                      <Badge variant="outline" className="flex-shrink-0">
                        {draft.verification_status}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-start gap-1">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{draft.location_label}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Property Details */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Tag className="h-4 w-4" />
                        <span>{draft.property_type} • {draft.listing_type}</span>
                      </div>

                      {draft.price && (
                        <div className="text-xl font-bold">
                          {draft.price.toLocaleString()} {draft.currency}
                        </div>
                      )}

                      {draft.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {draft.description}
                        </p>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Created {new Date(draft.created_at).toLocaleDateString()}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => handlePublish(draft.id)}
                          disabled={publishingIds.has(draft.id)}
                          className="flex-1"
                          size="sm"
                        >
                          {publishingIds.has(draft.id) ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                              Publishing...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Publish
                            </>
                          )}
                        </Button>
                        <Link to={`/listings/${draft.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </Link>
                        <Link to={`/listings/${draft.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
