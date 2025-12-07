import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Calendar, Clock, Plus, Trash2, Settings } from 'lucide-react';
import { format, addDays, startOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';

interface TimeSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface BlockedDate {
  id: string;
  date: string;
  reason: string;
}

interface CalendarManagementProps {
  providerId: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export function CalendarManagement({ providerId }: CalendarManagementProps) {
  const { user } = useAuth();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [slotForm, setSlotForm] = useState({
    days: [] as number[],
    start_time: '09:00',
    end_time: '17:00',
  });

  const [blockForm, setBlockForm] = useState({
    date: '',
    reason: '',
  });

  useEffect(() => {
    fetchCalendarData();
  }, [user]);

  const fetchCalendarData = async () => {
    try {
      const [slotsRes, blockedRes] = await Promise.all([
        (supabase
          .from('provider_availability' as any)
          .select('*')
          .eq('provider_id', user?.id)
          .order('day_of_week') as any),
        (supabase
          .from('provider_blocked_dates' as any)
          .select('*')
          .eq('provider_id', user?.id)
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date') as any),
      ]);

      if (slotsRes.error) throw slotsRes.error;
      if (blockedRes.error) throw blockedRes.error;

      setTimeSlots((slotsRes.data as TimeSlot[]) || []);
      setBlockedDates((blockedRes.data as BlockedDate[]) || []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const slotsToAdd = slotForm.days.map(day => ({
        provider_id: user?.id,
        day_of_week: day,
        start_time: slotForm.start_time,
        end_time: slotForm.end_time,
        is_available: true,
      }));

      const { error } = await (supabase
        .from('provider_availability' as any)
        .upsert(slotsToAdd, { 
          onConflict: 'provider_id,day_of_week',
          ignoreDuplicates: false 
        }) as any);

      if (error) throw error;
      
      toast.success('Availability updated');
      setSlotDialogOpen(false);
      setSlotForm({ days: [], start_time: '09:00', end_time: '17:00' });
      fetchCalendarData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update availability');
    }
  };

  const handleBlockDate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await (supabase
        .from('provider_blocked_dates' as any)
        .insert([{
          provider_id: user?.id,
          date: blockForm.date,
          reason: blockForm.reason,
        }]) as any);

      if (error) throw error;
      
      toast.success('Date blocked');
      setBlockDialogOpen(false);
      setBlockForm({ date: '', reason: '' });
      fetchCalendarData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to block date');
    }
  };

  const removeSlot = async (slotId: string) => {
    try {
      const { error } = await (supabase
        .from('provider_availability' as any)
        .delete()
        .eq('id', slotId) as any);

      if (error) throw error;
      fetchCalendarData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove slot');
    }
  };

  const unblockDate = async (blockId: string) => {
    try {
      const { error } = await (supabase
        .from('provider_blocked_dates' as any)
        .delete()
        .eq('id', blockId) as any);

      if (error) throw error;
      fetchCalendarData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to unblock date');
    }
  };

  const toggleDaySelection = (day: number) => {
    setSlotForm(prev => ({
      ...prev,
      days: prev.days.includes(day) 
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const weekStart = startOfWeek(selectedDate);
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6)
  });

  const isDateBlocked = (date: Date) => {
    return blockedDates.some(b => b.date === format(date, 'yyyy-MM-dd'));
  };

  const getSlotForDay = (dayOfWeek: number) => {
    return timeSlots.find(s => s.day_of_week === dayOfWeek);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Weekly Schedule
            </CardTitle>
            <CardDescription>Set your regular working hours</CardDescription>
          </div>
          <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Set Hours
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Working Hours</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSlots} className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Days</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={slotForm.days.includes(day.value)}
                          onCheckedChange={() => toggleDaySelection(day.value)}
                        />
                        <Label htmlFor={`day-${day.value}`} className="cursor-pointer">
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={slotForm.start_time}
                      onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={slotForm.end_time}
                      onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setSlotDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={slotForm.days.length === 0}>
                    Save Schedule
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const slot = getSlotForDay(day.value);
                return (
                  <div 
                    key={day.value} 
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <span className="font-medium w-24">{day.label}</span>
                    {slot ? (
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {slot.start_time} - {slot.end_time}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeSlot(slot.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="secondary">Not Available</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar Preview
            </CardTitle>
            <CardDescription>View and block specific dates</CardDescription>
          </div>
          <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Block Date
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Block a Date</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleBlockDate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="block_date">Date</Label>
                  <Input
                    id="block_date"
                    type="date"
                    value={blockForm.date}
                    onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (optional)</Label>
                  <Input
                    id="reason"
                    value={blockForm.reason}
                    onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                    placeholder="e.g., Holiday, Personal day"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setBlockDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Block Date</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
            >
              Previous Week
            </Button>
            <span className="font-medium">
              {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            >
              Next Week
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((date) => {
              const daySlot = getSlotForDay(date.getDay());
              const blocked = isDateBlocked(date);
              const isToday = isSameDay(date, new Date());
              
              return (
                <div
                  key={date.toISOString()}
                  className={`p-3 rounded-lg border text-center ${
                    blocked
                      ? 'bg-red-50 border-red-200 dark:bg-red-950/30'
                      : daySlot
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/30'
                      : 'bg-muted/50'
                  } ${isToday ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="text-xs text-muted-foreground">
                    {format(date, 'EEE')}
                  </div>
                  <div className="text-lg font-semibold">
                    {format(date, 'd')}
                  </div>
                  {blocked && (
                    <Badge variant="destructive" className="text-xs mt-1">
                      Blocked
                    </Badge>
                  )}
                  {!blocked && daySlot && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {daySlot.start_time?.slice(0, 5)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {blockedDates.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-2">Upcoming Blocked Dates</h4>
              <div className="space-y-2">
                {blockedDates.slice(0, 5).map((block) => (
                  <div 
                    key={block.id} 
                    className="flex items-center justify-between p-2 rounded bg-red-50 dark:bg-red-950/30"
                  >
                    <div>
                      <span className="font-medium">
                        {format(new Date(block.date), 'EEEE, MMM d, yyyy')}
                      </span>
                      {block.reason && (
                        <span className="text-muted-foreground ml-2">- {block.reason}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unblockDate(block.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
