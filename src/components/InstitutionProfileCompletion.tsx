import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { InstitutionalSellerWithDetails } from '@/types/database';

interface ProfileCompletionProps {
  institution: InstitutionalSellerWithDetails;
}

interface ProfileField {
  name: string;
  label: string;
  isComplete: boolean;
  importance: 'required' | 'recommended' | 'optional';
}

export function InstitutionProfileCompletion({ institution }: ProfileCompletionProps) {
  const fields: ProfileField[] = [
    {
      name: 'logo',
      label: 'Institution Logo',
      isComplete: !!institution.logo_url,
      importance: 'required',
    },
    {
      name: 'cover',
      label: 'Cover Image',
      isComplete: !!institution.cover_image_url,
      importance: 'recommended',
    },
    {
      name: 'about',
      label: 'About Company',
      isComplete: !!institution.about_company && institution.about_company.length > 50,
      importance: 'required',
    },
    {
      name: 'mission',
      label: 'Mission Statement',
      isComplete: !!institution.mission_statement && institution.mission_statement.length > 20,
      importance: 'recommended',
    },
    {
      name: 'contact',
      label: 'Contact Information',
      isComplete: !!(institution.contact_person && institution.contact_email && institution.contact_phone),
      importance: 'required',
    },
    {
      name: 'service_areas',
      label: 'Service Areas',
      isComplete: !!(institution.service_areas && institution.service_areas.length > 0),
      importance: 'recommended',
    },
    {
      name: 'certifications',
      label: 'Certifications',
      isComplete: !!(institution.certifications && institution.certifications.length > 0),
      importance: 'optional',
    },
    {
      name: 'website',
      label: 'Website URL',
      isComplete: !!institution.website_url,
      importance: 'recommended',
    },
    {
      name: 'details',
      label: 'Company Details (Year, Employees)',
      isComplete: !!(institution.year_established && institution.total_employees),
      importance: 'optional',
    },
    {
      name: 'social',
      label: 'Social Media Links',
      isComplete: !!institution.social_media && Object.values(institution.social_media as any || {}).some(v => v),
      importance: 'optional',
    },
  ];

  const requiredFields = fields.filter(f => f.importance === 'required');
  const recommendedFields = fields.filter(f => f.importance === 'recommended');
  const optionalFields = fields.filter(f => f.importance === 'optional');

  const completedFields = fields.filter(f => f.isComplete).length;
  const totalFields = fields.length;
  const completionPercentage = Math.round((completedFields / totalFields) * 100);

  const requiredComplete = requiredFields.every(f => f.isComplete);
  const recommendedComplete = recommendedFields.every(f => f.isComplete);

  const getCompletionStatus = () => {
    if (completionPercentage === 100) return { color: 'text-success', icon: CheckCircle2, message: 'Excellent! Profile is complete' };
    if (completionPercentage >= 70) return { color: 'text-primary', icon: CheckCircle2, message: 'Great progress! Almost there' };
    if (completionPercentage >= 40) return { color: 'text-warning', icon: AlertCircle, message: 'Keep going! Add more details' };
    return { color: 'text-destructive', icon: AlertCircle, message: 'Let\'s complete your profile' };
  };

  const status = getCompletionStatus();
  const StatusIcon = status.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon className={`h-5 w-5 ${status.color}`} />
              Profile Completion
            </CardTitle>
            <CardDescription>{status.message}</CardDescription>
          </div>
          <Badge variant={completionPercentage === 100 ? 'default' : completionPercentage >= 70 ? 'secondary' : 'outline'}>
            {completionPercentage}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={completionPercentage} className="h-3" />
          <p className="text-xs text-muted-foreground text-center">
            {completedFields} of {totalFields} items completed
          </p>
        </div>

        {/* Required Fields */}
        {!requiredComplete && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">Required</Badge>
              <p className="text-sm font-medium">Essential for approval</p>
            </div>
            <ul className="space-y-2">
              {requiredFields.map((field) => (
                <li key={field.name} className="flex items-center gap-2 text-sm">
                  {field.isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={field.isComplete ? 'text-muted-foreground line-through' : ''}>
                    {field.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Fields */}
        {requiredComplete && !recommendedComplete && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">Recommended</Badge>
              <p className="text-sm font-medium">Enhance your profile</p>
            </div>
            <ul className="space-y-2">
              {recommendedFields.map((field) => (
                <li key={field.name} className="flex items-center gap-2 text-sm">
                  {field.isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={field.isComplete ? 'text-muted-foreground line-through' : ''}>
                    {field.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Optional Fields */}
        {requiredComplete && recommendedComplete && completionPercentage < 100 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Optional</Badge>
              <p className="text-sm font-medium">Stand out from the crowd</p>
            </div>
            <ul className="space-y-2">
              {optionalFields.map((field) => (
                <li key={field.name} className="flex items-center gap-2 text-sm">
                  {field.isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={field.isComplete ? 'text-muted-foreground line-through' : ''}>
                    {field.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* All Complete Message */}
        {completionPercentage === 100 && (
          <div className="text-center py-4 space-y-2">
            <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
            <p className="font-semibold text-success">Profile Complete! 🎉</p>
            <p className="text-sm text-muted-foreground">
              Your institutional profile has all the information needed to attract buyers.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}