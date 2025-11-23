import { LayoutGrid, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MarketplaceViewToggleProps {
  view: 'individual' | 'projects';
  onViewChange: (view: 'individual' | 'projects') => void;
}

export function MarketplaceViewToggle({ view, onViewChange }: MarketplaceViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border bg-muted/30 p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('individual')}
        className={cn(
          "gap-2 transition-all",
          view === 'individual' 
            ? "bg-background shadow-sm" 
            : "hover:bg-background/50"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        <span>Individual Listings</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('projects')}
        className={cn(
          "gap-2 transition-all",
          view === 'projects' 
            ? "bg-background shadow-sm" 
            : "hover:bg-background/50"
        )}
      >
        <FolderOpen className="h-4 w-4" />
        <span>By Projects</span>
      </Button>
    </div>
  );
}