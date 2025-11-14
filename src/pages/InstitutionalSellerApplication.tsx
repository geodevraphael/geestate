import { Navbar } from '@/components/Navbar';
import { InstitutionalSellerForm } from '@/components/InstitutionalSellerForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function InstitutionalSellerApplication() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Institutional Seller Application</h1>
          <p className="text-muted-foreground">
            Apply to list properties on behalf of your government agency, municipality, or company
          </p>
        </div>

        <InstitutionalSellerForm />
      </div>
    </div>
  );
}
