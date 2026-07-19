"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useVerifyEmailMutation } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api-client";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const verifyMutation = useVerifyEmailMutation();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No token provided. Please check your verification link.");
      return;
    }

    verifyMutation.mutate(token, {
      onSuccess: () => {
        setStatus("success");
        toast.success("Email verified successfully!");
      },
      onError: (err) => {
        setStatus("error");
        if (err instanceof ApiClientError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("Failed to verify email. The token may be expired or invalid.");
        }
      },
    });
  }, [token]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="border-foreground/20 border-t-foreground h-6 w-6 animate-spin rounded-full border-2" />
        <p className="text-muted-foreground text-sm">Verifying your email address...</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-sans text-2xl font-semibold tracking-tight">Email verified</h1>
          <p className="text-muted-foreground text-sm">
            Your email has been successfully verified. You can now sign in to your dashboard.
          </p>
        </div>
        <Link href="/login" className="w-full">
          <Button className="w-full">Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-destructive font-sans text-2xl font-semibold tracking-tight">
          Verification failed
        </h1>
        <p className="text-muted-foreground text-sm">{errorMessage}</p>
      </div>
      <div className="flex flex-col gap-3">
        <Link href="/signup" className="w-full">
          <Button variant="outline" className="w-full">
            Back to sign up
          </Button>
        </Link>
        <Link href="/login" className="w-full">
          <Button className="w-full">Go to login</Button>
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="border-foreground/20 border-t-foreground h-6 w-6 animate-spin rounded-full border-2" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
