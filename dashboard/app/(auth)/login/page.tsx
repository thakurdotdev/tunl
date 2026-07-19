"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResendVerificationMutation } from "@/hooks/use-auth";
import { ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

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
      await login(values.email, values.password);
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
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error("Failed to sign in. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = () => {
    if (!unverifiedEmail) return;
    resendMutation.mutate(unverifiedEmail, {
      onSuccess: () => {
        toast.success("Verification link sent! Please check your inbox.");
      },
      onError: (err) => {
        if (err instanceof ApiClientError) {
          toast.error(err.message);
        } else {
          toast.error("Failed to resend verification email.");
        }
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">Sign in to your account</h1>
        <p className="text-muted-foreground text-sm">
          Enter your email and password to access your dashboard.
        </p>
      </div>

      {unverifiedEmail && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-amber-900 dark:text-amber-200">
            Your email address (<strong>{unverifiedEmail}</strong>) is not verified. Please check
            your inbox or resend the verification link.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={resendMutation.isPending}
            className="w-full border-amber-300 bg-white text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-900"
          >
            {resendMutation.isPending ? "Sending link..." : "Resend verification email"}
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            disabled={isSubmitting}
            {...register("email")}
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative flex items-center">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              disabled={isSubmitting}
              className="pr-10"
              {...register("password")}
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground absolute right-3 transition-colors focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex items-center justify-between">
            {errors.password ? (
              <p className="text-destructive text-xs">{errors.password.message}</p>
            ) : (
              <span />
            )}
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-foreground ml-auto text-xs transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="text-muted-foreground mt-4 text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
