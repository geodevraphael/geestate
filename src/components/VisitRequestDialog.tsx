import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logAuditAction } from '@/lib/auditLog';

interface VisitRequestDialogProps {
  listingId: string;
  sellerId: string;
}

export function VisitRequestDialog({ listingId, sellerId }: VisitRequestDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requestedDate, setRequestedDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [buyerNotes, setBuyerNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to request a visit',
        variant: 'destructive',
      });
      return;
    }

    if (!requestedDate || !timeSlot) {
      toast({
        title: 'Error',
        description: 'Please select a date and time slot',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('visit_requests')
        .insert({
          listing_id: listingId,
          buyer_id: user.id,
          seller_id: sellerId,
          requested_date: requestedDate,
          requested_time_slot: timeSlot,
          buyer_notes: buyerNotes || null,
          status: 'pending',
        });

      if (error) throw error;

      await logAuditAction(
        'REQUEST_SITE_VISIT',
        user.id,
        listingId,
        { requested_date: requestedDate, time_slot: timeSlot }
      );

      toast({
        title: 'Visit Request Sent',
        description: 'The seller will be notified of your visit request',
      });

      setOpen(false);
      setRequestedDate('');
      setTimeSlot('');
      setBuyerNotes('');
    } catch (error) {
      console.error('Error creating visit request:', error);
      toast({
        title: 'Error',
        description: 'Failed to create visit request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={setOpen}
      title="Request Site Visit"
      description="Schedule a visit to view this property in person"
      trigger={
        <DialogTrigger asChild>
          <Button className="w-full sm:w-auto flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Request Site Visit
          </Button>
        </DialogTrigger>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Preferred Date</Label>
            <Input
              id="date"
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeSlot">Time Slot</Label>
            <Select value={timeSlot} onValueChange={setTimeSlot} required>
              <SelectTrigger id="timeSlot">
                <SelectValue placeholder="Select a time slot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="09:00-11:00">09:00 AM - 11:00 AM</SelectItem>
                <SelectItem value="11:00-13:00">11:00 AM - 01:00 PM</SelectItem>
                <SelectItem value="13:00-15:00">01:00 PM - 03:00 PM</SelectItem>
                <SelectItem value="15:00-17:00">03:00 PM - 05:00 PM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any specific requirements or questions..."
              value={buyerNotes}
              onChange={(e) => setBuyerNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
      </form>
    </ResponsiveModal>
  );
}
