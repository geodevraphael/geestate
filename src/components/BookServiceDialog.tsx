import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar as CalendarIcon, Clock, Home, Send, CheckCircle2, 
  AlertCircle, Loader2 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format, addDays, isBefore, startOfDay } from 'date-fns';

interface ProviderService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_type: string;
  duration_hours: number | null;
}

interface UserListing {
  id: string;
  title: string;
  location_label: string;
}

interface ProviderAvailability {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface BlockedDate {
  date: string;
  reason: string | null;
}

interface BookServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: {
    id: string;
    user_id: string;
    company_name: string;
  };
  providerServices: ProviderService[];
  trigger?: React.ReactNode;
}

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30'
];

export function BookServiceDialog({
  open,
  onOpenChange,
  provider,
  providerServices,
  trigger
}: BookServiceDialogProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<'service' | 'datetime' | 'confirm'>('service');
  const [submitting, setSubmitting] = useState(false);
  const [userListings, setUserListings] = useState<UserListing[]>([]);
  const [availability, setAvailability] = useState<ProviderAvailability[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(false);

  const [bookingForm, setBookingForm] = useState({
    service_id: '',
    service_name: '',
    service_price: 0,
    listing_id: '',
    booking_date: null as Date | null,
    booking_time: '',
    notes: '',
  });

  useEffect(() => {
    if (open && user) {
      fetchUserListings();
      fetchProviderAvailability();
      fetchBlockedDates();
    }
  }, [open, user, provider.user_id]);

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setStep('service');
      setBookingForm({
        service_id: '',
        service_name: '',
        service_price: 0,
        listing_id: '',
        booking_date: null,
        booking_time: '',
        notes: '',
      });
    }
  }, [open]);

  const fetchUserListings = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('listings')
        .select('id, title, location_label')
        .eq('owner_id', user.id)
        .in('status', ['published', 'draft'])
        .order('created_at', { ascending: false });
      setUserListings(data || []);
    } catch (error) {
      console.error('Error fetching user listings:', error);
    }
  };

  const fetchProviderAvailability = async () => {
    try {
      const { data } = await supabase
        .from('provider_availability')
        .select('day_of_week, start_time, end_time, is_available')
        .eq('provider_id', provider.user_id);
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const fetchBlockedDates = async () => {
    try {
      const { data } = await supabase
        .from('provider_blocked_dates')
        .select('date, reason')
        .eq('provider_id', provider.user_id)
        .gte('date', format(new Date(), 'yyyy-MM-dd'));
      setBlockedDates(data || []);
    } catch (error) {
      console.error('Error fetching blocked dates:', error);
    }
  };

  const isDateDisabled = (date: Date) => {
    // Disable past dates
    if (isBefore(date, startOfDay(new Date()))) {
      return true;
    }
    
    // Check if date is blocked
    const dateStr = format(date, 'yyyy-MM-dd');
    if (blockedDates.some(bd => bd.date === dateStr)) {
      return true;
    }
    
    // Check day of week availability
    const dayOfWeek = date.getDay();
    const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek);
    if (dayAvailability && !dayAvailability.is_available) {
      return true;
    }
    
    return false;
  };

  const getAvailableTimeSlots = () => {
    if (!bookingForm.booking_date) return TIME_SLOTS;
    
    const dayOfWeek = bookingForm.booking_date.getDay();
    const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek);
    
    if (!dayAvailability) return TIME_SLOTS;
    
    // Filter time slots based on provider's working hours
    return TIME_SLOTS.filter(slot => {
      const slotTime = slot.replace(':', '');
      const startTime = dayAvailability.start_time.replace(':', '').slice(0, 4);
      const endTime = dayAvailability.end_time.replace(':', '').slice(0, 4);
      return slotTime >= startTime && slotTime < endTime;
    });
  };

  const handleSelectService = (service: ProviderService) => {
    setBookingForm({
      ...bookingForm,
      service_id: service.id,
      service_name: service.name,
      service_price: service.price,
    });
  };

  const handleSubmitBooking = async () => {
    if (!user) {
      navigate('/auth', { state: { returnTo: `/service-providers/${provider.id}` } });
      return;
    }

    if (!bookingForm.service_id || !bookingForm.booking_date || !bookingForm.booking_time) {
      toast({
        title: i18n.language === 'sw' ? 'Kosa' : 'Error',
        description: i18n.language === 'sw' 
          ? 'Tafadhali chagua huduma, tarehe na wakati'
          : 'Please select a service, date and time',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('service_bookings').insert({
        provider_id: provider.user_id,
        client_id: user.id,
        service_id: bookingForm.service_id,
        listing_id: bookingForm.listing_id || null,
        booking_date: format(bookingForm.booking_date, 'yyyy-MM-dd'),
        booking_time: bookingForm.booking_time,
        total_price: bookingForm.service_price,
        notes: bookingForm.notes,
        status: 'pending',
      });

      if (error) throw error;

      // Notify the provider
      await supabase.from('notifications').insert({
        user_id: provider.user_id,
        type: 'new_message' as const,
        title: i18n.language === 'sw' ? 'Miadi Mpya' : 'New Booking',
        message: i18n.language === 'sw'
          ? `Una miadi mpya ya ${bookingForm.service_name} tarehe ${format(bookingForm.booking_date, 'dd MMM yyyy')} saa ${bookingForm.booking_time}`
          : `You have a new booking for ${bookingForm.service_name} on ${format(bookingForm.booking_date, 'dd MMM yyyy')} at ${bookingForm.booking_time}`,
        link_url: '/dashboard',
      });

      toast({
        title: i18n.language === 'sw' ? 'Miadi Imetumwa!' : 'Booking Submitted!',
        description: i18n.language === 'sw'
          ? 'Mtoa huduma atakuthibitishia hivi karibuni'
          : 'The provider will confirm your appointment soon',
      });

      onOpenChange(false);
      navigate('/my-bookings');
    } catch (error: any) {
      console.error('Error submitting booking:', error);
      toast({
        title: i18n.language === 'sw' ? 'Kosa' : 'Error',
        description: error.message || 'Failed to submit booking',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getPriceTypeLabel = (priceType: string) => {
    const types: Record<string, { en: string; sw: string }> = {
      fixed: { en: 'Fixed Price', sw: 'Bei Kamili' },
      hourly: { en: 'Per Hour', sw: 'Kwa Saa' },
      per_sqm: { en: 'Per m²', sw: 'Kwa m²' },
      negotiable: { en: 'Negotiable', sw: 'Inajadiliwa' },
    };
    return types[priceType]?.[i18n.language === 'sw' ? 'sw' : 'en'] || priceType;
  };

  const availableTimeSlots = getAvailableTimeSlots();

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={
        step === 'service' 
          ? (i18n.language === 'sw' ? 'Chagua Huduma' : 'Select Service')
          : step === 'datetime'
          ? (i18n.language === 'sw' ? 'Chagua Tarehe & Wakati' : 'Select Date & Time')
          : (i18n.language === 'sw' ? 'Thibitisha Miadi' : 'Confirm Booking')
      }
      description={
        i18n.language === 'sw'
          ? `Panga miadi na ${provider.company_name}`
          : `Book an appointment with ${provider.company_name}`
      }
      trigger={trigger}
    >
      <div className="space-y-4 pt-4">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {['service', 'datetime', 'confirm'].map((s, idx) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step === s 
                  ? 'bg-primary text-primary-foreground' 
                  : idx < ['service', 'datetime', 'confirm'].indexOf(step)
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {idx < ['service', 'datetime', 'confirm'].indexOf(step) ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  idx + 1
                )}
              </div>
              {idx < 2 && (
                <div className={`w-8 h-0.5 mx-1 ${
                  idx < ['service', 'datetime', 'confirm'].indexOf(step)
                    ? 'bg-primary'
                    : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Service */}
        {step === 'service' && (
          <div className="space-y-4">
            {/* Property Selection (Optional) */}
            {userListings.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  {i18n.language === 'sw' ? 'Mali (Hiari)' : 'Property (Optional)'}
                </Label>
                <Select
                  value={bookingForm.listing_id || 'none'}
                  onValueChange={(v) => setBookingForm({ ...bookingForm, listing_id: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={i18n.language === 'sw' ? 'Chagua mali' : 'Select property'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {i18n.language === 'sw' ? 'Bila mali' : 'No property'}
                    </SelectItem>
                    {userListings.map(listing => (
                      <SelectItem key={listing.id} value={listing.id}>
                        {listing.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Service Selection */}
            <div className="space-y-2">
              <Label>{i18n.language === 'sw' ? 'Chagua Huduma' : 'Select Service'}</Label>
              {providerServices.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {providerServices.map((service) => (
                    <div
                      key={service.id}
                      onClick={() => handleSelectService(service)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        bookingForm.service_id === service.id
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold">{service.name}</p>
                          {service.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {service.description}
                            </p>
                          )}
                          {service.duration_hours && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {service.duration_hours} {i18n.language === 'sw' ? 'saa' : 'hours'}
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-bold text-primary text-lg">
                            TZS {service.price.toLocaleString()}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {getPriceTypeLabel(service.price_type)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center border rounded-xl border-dashed">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {i18n.language === 'sw' 
                      ? 'Mtoa huduma hajaongeza huduma bado'
                      : 'This provider has not added any services yet'}
                  </p>
                </div>
              )}
            </div>

            <Button
              onClick={() => setStep('datetime')}
              disabled={!bookingForm.service_id}
              className="w-full"
            >
              {i18n.language === 'sw' ? 'Endelea' : 'Continue'}
            </Button>
          </div>
        )}

        {/* Step 2: Select Date & Time */}
        {step === 'datetime' && (
          <div className="space-y-4">
            {/* Selected Service Summary */}
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex justify-between items-center">
                <span className="font-medium">{bookingForm.service_name}</span>
                <span className="font-bold text-primary">
                  TZS {bookingForm.service_price.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {i18n.language === 'sw' ? 'Chagua Tarehe' : 'Select Date'}
              </Label>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={bookingForm.booking_date || undefined}
                  onSelect={(date) => setBookingForm({ ...bookingForm, booking_date: date || null, booking_time: '' })}
                  disabled={isDateDisabled}
                  fromDate={new Date()}
                  toDate={addDays(new Date(), 60)}
                  className="rounded-xl border"
                />
              </div>
            </div>

            {/* Time Selection */}
            {bookingForm.booking_date && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {i18n.language === 'sw' ? 'Chagua Wakati' : 'Select Time'}
                </Label>
                <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                  {availableTimeSlots.map((time) => (
                    <Button
                      key={time}
                      variant={bookingForm.booking_time === time ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBookingForm({ ...bookingForm, booking_time: time })}
                      className="text-sm"
                    >
                      {time}
                    </Button>
                  ))}
                </div>
                {availableTimeSlots.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {i18n.language === 'sw' 
                      ? 'Hakuna wakati unapatikana siku hii'
                      : 'No time slots available on this day'}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('service')}
                className="flex-1"
              >
                {i18n.language === 'sw' ? 'Rudi' : 'Back'}
              </Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={!bookingForm.booking_date || !bookingForm.booking_time}
                className="flex-1"
              >
                {i18n.language === 'sw' ? 'Endelea' : 'Continue'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm Booking */}
        {step === 'confirm' && (
          <div className="space-y-4">
            {/* Booking Summary */}
            <div className="p-4 bg-muted/50 rounded-xl space-y-3">
              <h4 className="font-semibold">
                {i18n.language === 'sw' ? 'Muhtasari wa Miadi' : 'Booking Summary'}
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {i18n.language === 'sw' ? 'Huduma:' : 'Service:'}
                  </span>
                  <span className="font-medium">{bookingForm.service_name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {i18n.language === 'sw' ? 'Tarehe:' : 'Date:'}
                  </span>
                  <span className="font-medium">
                    {bookingForm.booking_date && format(bookingForm.booking_date, 'EEEE, dd MMM yyyy')}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {i18n.language === 'sw' ? 'Wakati:' : 'Time:'}
                  </span>
                  <span className="font-medium">{bookingForm.booking_time}</span>
                </div>
                
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">
                    {i18n.language === 'sw' ? 'Jumla:' : 'Total:'}
                  </span>
                  <span className="font-bold text-primary text-lg">
                    TZS {bookingForm.service_price.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label>{i18n.language === 'sw' ? 'Maelezo Zaidi (Hiari)' : 'Additional Notes (Optional)'}</Label>
              <Textarea
                value={bookingForm.notes}
                onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                placeholder={i18n.language === 'sw' 
                  ? 'Ongeza maelezo yoyote...'
                  : 'Add any additional details...'}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('datetime')}
                className="flex-1"
              >
                {i18n.language === 'sw' ? 'Rudi' : 'Back'}
              </Button>
              <Button
                onClick={handleSubmitBooking}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {i18n.language === 'sw' ? 'Inatuma...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {i18n.language === 'sw' ? 'Thibitisha Miadi' : 'Confirm Booking'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
}
