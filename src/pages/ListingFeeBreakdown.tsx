import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ListingBreakdown {
  id: string;
  title: string;
  location_label: string;
  price: number;
  currency: string;
  fee: number;
}

export default function ListingFeeBreakdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recordId = searchParams.get('recordId');
  
  const [listings, setListings] = useState<ListingBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const [totalFee, setTotalFee] = useState(0);

  useEffect(() => {
    if (user) {
      fetchListingBreakdown();
    }
  }, [user, recordId]);

  const fetchListingBreakdown = async () => {
    try {
      const { data: userListings, error } = await supabase
        .from('listings')
        .select('id, title, location_label, price, currency')
        .eq('owner_id', user?.id)
        .eq('status', 'published')
        .not('price', 'is', null);

      if (error) throw error;

      const breakdowns: ListingBreakdown[] = (userListings || []).map(listing => ({
        id: listing.id,
        title: listing.title,
        location_label: listing.location_label,
        price: listing.price || 0,
        currency: listing.currency || 'TZS',
        fee: (listing.price || 0) * 0.001,
      }));

      setListings(breakdowns);
      setTotalValue(breakdowns.reduce((sum, l) => sum + l.price, 0));
      setTotalFee(breakdowns.reduce((sum, l) => sum + l.fee, 0));
    } catch (error) {
      console.error('Failed to fetch listing breakdown:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'TZS') => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <DollarSign className="h-5 w-5 flex-shrink-0" />
              <span>Listing Fee Breakdown</span>
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Monthly listing fee is 0.1% of your total property selling prices
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No published listings found
              </p>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="space-y-3 md:hidden">
                  {listings.map((listing) => (
                    <Card key={listing.id} className="p-4">
                      <div className="space-y-2">
                        <p className="font-medium line-clamp-2">{listing.title}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="line-clamp-1">{listing.location_label}</span>
                        </p>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Price</p>
                            <p className="font-mono text-sm">{formatCurrency(listing.price, listing.currency)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Fee (0.1%)</p>
                            <p className="font-mono text-sm text-primary font-semibold">
                              {formatCurrency(listing.fee, listing.currency)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium">Property</th>
                        <th className="text-right py-3 px-2 font-medium">Selling Price</th>
                        <th className="text-right py-3 px-2 font-medium">Fee (0.1%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.map((listing) => (
                        <tr key={listing.id} className="border-b">
                          <td className="py-3 px-2">
                            <div>
                              <p className="font-medium">{listing.title}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {listing.location_label}
                              </p>
                            </div>
                          </td>
                          <td className="text-right py-3 px-2 font-mono">
                            {formatCurrency(listing.price, listing.currency)}
                          </td>
                          <td className="text-right py-3 px-2 font-mono text-primary font-semibold">
                            {formatCurrency(listing.fee, listing.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="mt-6 pt-4 border-t space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Property Value:</span>
                    <span className="font-mono">{formatCurrency(totalValue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Monthly Fee:</span>
                    <span className="text-lg sm:text-xl font-bold text-primary">
                      {formatCurrency(totalFee)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
