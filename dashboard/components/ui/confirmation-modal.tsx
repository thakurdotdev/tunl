"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  variant?: "default" | "destructive";
  isPending?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  variant = "default",
  isPending = false,
}: ConfirmationModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !isPending && onClose()}>
      <AlertDialogContent className="font-mono sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={`h-4 w-4 ${variant === "destructive" ? "text-destructive" : "text-amber-400"}`}
            />
            <AlertDialogTitle className="text-sm font-bold">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-foreground mt-2 text-xs leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 flex items-center justify-end gap-2">
          <AlertDialogCancel onClick={onClose} disabled={isPending} className="h-8 text-xs">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            onClick={(e) => {
              e.preventDefault();
              if (!isPending) onConfirm();
            }}
            disabled={isPending}
            className="h-8 text-xs font-semibold"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
