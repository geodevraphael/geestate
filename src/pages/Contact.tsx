import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000),
});

export default function Contact() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data
      contactSchema.parse(formData);

      // In a real implementation, this would send to an API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: 'Message Sent',
        description: 'We\'ll get back to you as soon as possible!',
      });

      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to send message. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto p-6 space-y-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-12">
          <h1 className="text-5xl font-bold">Contact Us</h1>
          <p className="text-xl text-muted-foreground">
            Get in touch with our team - we're here to help
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="p-6 text-center space-y-2">
              <Mail className="h-8 w-8 mx-auto text-primary" />
              <h3 className="font-semibold">Email</h3>
              <p className="text-sm text-muted-foreground">support@geoestate.co.tz</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center space-y-2">
              <Phone className="h-8 w-8 mx-auto text-primary" />
              <h3 className="font-semibold">Phone</h3>
              <p className="text-sm text-muted-foreground">+255 XXX XXX XXX</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center space-y-2">
              <MapPin className="h-8 w-8 mx-auto text-primary" />
              <h3 className="font-semibold">Office</h3>
              <p className="text-sm text-muted-foreground">Dar es Salaam, Tanzania</p>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle>Send us a Message</CardTitle>
            <CardDescription>Fill out the form below and we'll respond within 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Your Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  rows={6}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                {loading ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">How do I list my property?</h3>
              <p className="text-sm text-muted-foreground">
                Sign up for an account, navigate to your dashboard, and click "Create New Listing". For land parcels, you'll need to upload GeoJSON or TopoJSON files.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How long does verification take?</h3>
              <p className="text-sm text-muted-foreground">
                Most listings are verified within 2-5 business days, depending on document completeness and field verification requirements.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Is my data secure?</h3>
              <p className="text-sm text-muted-foreground">
                Yes, we use industry-standard encryption and security measures to protect all user data and property information.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
