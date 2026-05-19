"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ProFeatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel?: () => void;
}

export function ProFeatureModal({ open, onOpenChange, onCancel }: ProFeatureModalProps) {
  const handleBookDemo = () => {
    window.open("https://cal.com/team/potpie", "_blank");
  };

  const handleClose = (open: boolean) => {
    if (!open && onCancel) {
      // Modal is being closed, call onCancel callback
      onCancel();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>You&apos;ve discovered a Pro feature!</DialogTitle>
          <DialogDescription>
            This feature is available for Pro users. Book a demo to learn more
            about upgrading.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={handleBookDemo}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Book a demo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
