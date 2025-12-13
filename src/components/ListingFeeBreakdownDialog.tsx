import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { MapPin } from 'lucide-react';

interface ListingFeeBreakdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  totalFee: number;
  currency: string;
}

interface ListingBreakdown {
  id: string;
  title: string;
  price: number;
  currency: string;
  fee: number;
  location_label: string;
}

export function ListingFeeBreakdownDialog({
  open,
  onOpenChange,
  userId,
  totalFee,
  currency
}: ListingFeeBreakdownDialogProps) {
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<ListingBreakdown[]>([]);
  const [feeRate, setFeeRate] = useState(0.001);

  useEffect(() => {
    if (open) {
      fetchListingsBreakdown();
    }
  }, [open, userId]);

  const fetchListingsBreakdown = async () => {
    try {
      setLoading(true);
      
      // Get fee rate
      const { data: feeData } = await supabase
        .from('geoinsight_fee_definitions')
        .select('percentage_rate')
        .eq('code', 'LISTING_FEE')
        .eq('is_active', true)
        .maybeSingle();
      
      if (feeData?.percentage_rate) {
        setFeeRate(feeData.percentage_rate);
      }

      // Get user's published listings
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, price, currency, location_label')
        .eq('owner_id', userId)
        .eq('status', 'published')
        .not('price', 'is', null)
        .gt('price', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const breakdowns: ListingBreakdown[] = (data || []).map(listing => ({
        id: listing.id,
        title: listing.title,
        price: listing.price,
        currency: listing.currency || 'TZS',
        fee: listing.price * (feeData?.percentage_rate || 0.001),
        location_label: listing.location_label
      }));

      setListings(breakdowns);
    } catch (error) {
      console.error('Error fetching listings breakdown:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, curr: string = 'TZS') => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalValue = listings.reduce((sum, l) => sum + l.price, 0);
  const calculatedTotalFee = listings.reduce((sum, l) => sum + l.fee, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Listing Fee Breakdown</DialogTitle>
          <DialogDescription>
            Detailed breakdown of fees for each of your published properties (0.1% of selling price)
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No published listings found</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="text-right">Fee (0.1%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium line-clamp-1">{listing.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {listing.location_label}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(listing.price, listing.currency)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(listing.fee, listing.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Summary */}
            <div className="border-t pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Properties</span>
                <Badge variant="secondary">{listings.length}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Combined Selling Value</span>
                <span>{formatCurrency(totalValue, currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total Fee Due</span>
                <span className="text-primary">{formatCurrency(calculatedTotalFee, currency)}</span>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
