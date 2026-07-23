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
  email: z.email("Please enter a valid email address").max(320),
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
    <div className="space-y-6 font-mono">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Sign in to your account</h1>
        <p className="text-muted-foreground text-xs">
          Enter your credentials below to access your tunnels
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isSubmitting || requires2FA}
            {...register("email")}
            className="h-9 font-mono text-xs"
          />
          {errors.email && <p className="text-destructive text-[11px]">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-primary text-[11px] font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isSubmitting || requires2FA}
              {...register("password")}
              className="h-9 pr-10 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground absolute top-2.5 right-3"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-destructive text-[11px]">{errors.password.message}</p>
          )}
        </div>

        {/* 2FA Prompt Step */}
        {requires2FA && (
          <div className="border-primary/30 bg-primary/5 space-y-2 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-purple-400" />
              <Label htmlFor="totpCode" className="text-xs font-bold">
                Two-Factor Code (2FA)
              </Label>
            </div>
            <p className="text-muted-foreground text-[11px]">
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
              className="h-10 text-center font-mono text-base font-bold tracking-widest"
            />
          </div>
        )}

        {unverifiedEmail && (
          <div className="border-destructive/30 bg-destructive/10 rounded-lg border p-3 text-xs">
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
          className="w-full text-xs font-semibold"
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

      <p className="text-muted-foreground text-center text-xs">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary font-bold hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
