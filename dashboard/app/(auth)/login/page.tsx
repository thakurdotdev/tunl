"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResendVerificationMutation } from "@/hooks/use-auth";
import { ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .pipe(z.email("Please enter a valid email address").max(320)),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  const resendMutation = useResendVerificationMutation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const currentEmail = watch("email");

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    setUnverifiedEmail(null);
    try {
      const res = await login(values.email, values.password, totpCode || undefined);
      if (res.requires2FA) {
        setRequires2FA(true);
        setTotpCode("");
        toast.info("Two-Factor Authentication required.");
        return;
      }
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (
          err.code === "email_not_verified" ||
          (err.status === 403 && err.message.toLowerCase().includes("verification"))
        ) {
          setUnverifiedEmail(values.email);
          toast.error("Email verification is required before signing in.");
          return;
        }
        toast.error(err.message);
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = () => {
    if (!unverifiedEmail) return;
    resendMutation.mutate(unverifiedEmail, {
      onSuccess: () => {
        toast.success("Verification email sent! Check your inbox.");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to resend verification email.");
      },
    });
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6) return;
    setIsSubmitting(true);
    try {
      await login(currentEmail, watch("password"), totpCode);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error("Invalid verification code.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (requires2FA) {
    return (
      <div key="2fa-view" className="flex flex-col gap-6 font-sans">
        <div className="flex flex-col gap-1.5 text-left">
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Two-Factor Authentication
          </h1>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Enter the 6-digit verification code from your authenticator app to complete sign in for{" "}
            <strong className="text-foreground font-mono">{currentEmail}</strong>.
          </p>
        </div>

        <form
          key="2fa-form"
          onSubmit={handle2FASubmit}
          className="flex flex-col gap-4"
          autoComplete="off"
        >
          <input
            type="text"
            name="username"
            value={currentEmail || ""}
            readOnly
            tabIndex={-1}
            className="sr-only"
            aria-hidden="true"
            autoComplete="username"
          />
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="totpCode" className="text-foreground text-xs font-medium">
                6-Digit Authentication Code
              </Label>
            </div>
            <Input
              key="totp-input"
              id="totpCode"
              name="one-time-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
              data-1p-ignore
              data-lpignore="true"
              data-bwignore="true"
              className="border-border/60 bg-background h-10 text-center font-mono text-base font-bold tracking-widest"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || totpCode.length !== 6}
            className="mt-1 h-9 w-full text-xs font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Verifying...
              </>
            ) : (
              "Verify & Sign In"
            )}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setRequires2FA(false);
            setTotpCode("");
          }}
          className="text-muted-foreground hover:text-foreground text-left font-sans text-xs transition-colors"
        >
          ← Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div key="login-view" className="flex flex-col gap-6 font-sans">
      <div className="flex flex-col gap-1.5 text-left">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          Sign in to your account
        </h1>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Enter your credentials below to access your tunnels
        </p>
      </div>

      <form key="login-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-foreground text-xs font-medium">
            Email address
          </Label>
          <Input
            key="email-input"
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isSubmitting}
            {...register("email")}
            className="border-border/60 bg-background h-9 font-sans text-xs"
          />
          {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-foreground text-xs font-medium">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative flex items-center">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              autoComplete="current-password"
              disabled={isSubmitting}
              {...register("password")}
              className="border-border/60 bg-background h-9 pr-10 font-sans text-xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground absolute right-3 transition-colors focus:outline-none"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
        </div>

        {unverifiedEmail && (
          <div className="border-destructive/30 bg-destructive/10 rounded-md border p-3 text-xs">
            <p className="text-destructive font-medium">Your email is not verified yet.</p>
            <Button
              type="button"
              variant="link"
              onClick={handleResendVerification}
              disabled={resendMutation.isPending}
              className="text-primary h-auto p-0 text-xs hover:underline"
            >
              {resendMutation.isPending ? "Sending..." : "Click here to resend verification email"}
            </Button>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 h-9 w-full text-xs font-semibold"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Verifying...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <div className="text-muted-foreground text-left font-sans text-xs">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-foreground font-semibold hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}
