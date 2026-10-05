"use client";

import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api/parse";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

export function ErrorState({
  error,
  onRetry,
  title = "دریافت اطلاعات انجام نشد",
}: ErrorStateProps) {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{getErrorMessage(error)}</p>
        {onRetry && (
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            تلاش دوباره
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
