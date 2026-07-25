"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { ApiClientError } from "@/lib/api-client";
import { useResendVerificationMutation } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

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
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    setUnverifiedEmail(null);
    try {
      const res = await login(values.email, values.password, totpCode || undefined);
      if (res.requires2FA) {
        setRequires2FA(true);
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

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="flex flex-col gap-1.5 text-left">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          Sign in to your account
        </h1>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Enter your credentials below to access your tunnels
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-foreground text-xs font-medium">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isSubmitting || requires2FA}
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
              disabled={isSubmitting || requires2FA}
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

        {/* 2FA Prompt Step */}
        {requires2FA && (
          <div className="border-border/60 bg-muted/40 flex flex-col gap-2 rounded-md border p-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-emerald-400" />
              <Label htmlFor="totpCode" className="text-xs font-semibold">
                Two-Factor Code (2FA)
              </Label>
            </div>
            <p className="text-muted-foreground text-xs">
              Enter the 6-digit code from your authenticator app.
            </p>
            <Input
              id="totpCode"
              type="text"
              maxLength={6}
              placeholder="123456"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
              className="border-border/60 bg-background h-9 text-center font-mono text-sm font-semibold tracking-widest"
            />
          </div>
        )}

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
          disabled={isSubmitting || (requires2FA && totpCode.length !== 6)}
          className="mt-1 h-9 w-full text-xs font-semibold"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Verifying...
            </>
          ) : requires2FA ? (
            "Verify & Sign In"
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
