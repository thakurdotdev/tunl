"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const hasExecutedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No token provided. Please check your verification link.");
      return;
    }

    if (hasExecutedRef.current) return;
    hasExecutedRef.current = true;

    authClient
      .verifyEmail({ query: { token } })
      .then((res) => {
        if (res.error) {
          setStatus("error");
          setErrorMessage(res.error.message || "Failed to verify email. Token may be expired.");
        } else {
          setStatus("success");
          toast.success("Email verified successfully!");
        }
      })
      .catch((err: any) => {
        setStatus("error");
        setErrorMessage(err?.message || "Failed to verify email.");
      });
  }, [token]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 font-sans">
        <div className="border-primary/20 border-t-primary h-6 w-6 animate-spin rounded-full border-2" />
        <p className="text-muted-foreground text-xs">Verifying your email address...</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col gap-6 font-sans">
        <div className="flex flex-col gap-1.5 text-left">
          <h1 className="text-foreground text-2xl font-bold tracking-tight">Email verified</h1>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Your email has been successfully verified. You can now sign in to your dashboard.
          </p>
        </div>
        <Link href="/login" className="w-full">
          <Button className="h-9 w-full text-xs font-semibold">Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="flex flex-col gap-1.5 text-left">
        <h1 className="text-destructive text-2xl font-bold tracking-tight">Verification failed</h1>
        <p className="text-muted-foreground text-xs leading-relaxed">{errorMessage}</p>
      </div>
      <div className="flex flex-col gap-3">
        <Link href="/signup" className="w-full">
          <Button variant="outline" className="h-9 w-full text-xs">
            Back to sign up
          </Button>
        </Link>
        <Link href="/login" className="w-full">
          <Button className="h-9 w-full text-xs font-semibold">Go to login</Button>
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center gap-4 py-8 font-sans">
          <div className="border-primary/20 border-t-primary h-6 w-6 animate-spin rounded-full border-2" />
          <p className="text-muted-foreground text-xs">Loading...</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
