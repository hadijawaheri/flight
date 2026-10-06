"use client";

import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError, getErrorMessage } from "@/lib/api/parse";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

// Retrying a rejected request (past date, sales not open yet) returns the same answer; only
// network, server, timeout and rate-limit failures can succeed on a second try.
function isRetryable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  return error.status >= 500 || error.status === 408 || error.status === 429;
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
        {onRetry && isRetryable(error) && (
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            تلاش دوباره
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
