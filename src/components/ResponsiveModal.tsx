import { ReactNode, cloneElement, isValidElement } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  trigger?: ReactNode;
}

export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();

  // Extract the actual trigger element from DialogTrigger if wrapped
  const getTriggerElement = () => {
    if (!trigger) return null;
    
    // If trigger is a DialogTrigger, extract its child
    if (isValidElement(trigger) && trigger.type === DialogTrigger) {
      const child = (trigger.props as { children?: ReactNode }).children;
      return child;
    }
    return trigger;
  };

  const triggerElement = getTriggerElement();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {triggerElement && (
          <DrawerTrigger asChild>
            {triggerElement}
          </DrawerTrigger>
        )}
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {triggerElement && (
        <DialogTrigger asChild>
          {triggerElement}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl sm:max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
