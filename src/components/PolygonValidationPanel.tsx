import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { validatePolygon, formatArea, ValidationResult } from '@/lib/polygonValidation';

interface PolygonValidationPanelProps {
  geojson: any;
  showMetrics?: boolean;
}

export function PolygonValidationPanel({ geojson, showMetrics = true }: PolygonValidationPanelProps) {
  if (!geojson) {
    return null;
  }

  const validation: ValidationResult = validatePolygon(geojson);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Polygon Validation</CardTitle>
          <Badge variant={validation.isValid ? 'default' : 'destructive'}>
            {validation.isValid ? 'Valid' : 'Invalid'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Errors */}
        {validation.errors.length > 0 && (
          <div className="space-y-2">
            {validation.errors.map((error, index) => (
              <Alert key={index} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Warnings */}
        {validation.warnings.length > 0 && (
          <div className="space-y-2">
            {validation.warnings.map((warning, index) => (
              <Alert key={index}>
                <Info className="h-4 w-4" />
                <AlertDescription>{warning}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Success */}
        {validation.isValid && validation.errors.length === 0 && validation.warnings.length === 0 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>Polygon passes all validation checks</AlertDescription>
          </Alert>
        )}

        {/* Metrics */}
        {showMetrics && validation.metrics && (
          <div className="pt-4 border-t space-y-2">
            <h4 className="font-semibold text-sm">Polygon Metrics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Area</p>
                <p className="font-medium">{formatArea(validation.metrics.area_m2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Perimeter</p>
                <p className="font-medium">{validation.metrics.perimeter_m.toFixed(2)} m</p>
              </div>
              <div>
                <p className="text-muted-foreground">Vertices</p>
                <p className="font-medium">{validation.metrics.num_vertices}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Shape</p>
                <p className="font-medium">{validation.metrics.is_convex ? 'Convex' : 'Concave'}</p>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-muted-foreground text-xs">Centroid</p>
              <p className="font-mono text-xs">
                {validation.metrics.centroid[1].toFixed(6)}, {validation.metrics.centroid[0].toFixed(6)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
