"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPasswordMutation, useVerifyTokenQuery } from "@/hooks/use-auth";
import { ApiClientError } from "@/lib/api-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .max(20, "Password cannot exceed 20 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const tokenQuery = useVerifyTokenQuery(token, "password_reset");
  const resetMutation = useResetPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (values: ResetPasswordFormValues) => {
    if (!token) {
      toast.error("Invalid token. Please check your reset link.");
      return;
    }

    resetMutation.mutate(
      { token, password: values.password },
      {
        onSuccess: () => {
          setIsSuccess(true);
          toast.success("Password reset successfully!");
        },
        onError: (err) => {
          if (err instanceof ApiClientError) {
            toast.error(err.message);
          } else {
            toast.error(
              "Failed to reset password. The link may have expired or already been used.",
            );
          }
        },
      },
    );
  };

  const isSubmitting = resetMutation.isPending;

  if (!token || tokenQuery.isError) {
    return (
      <div className="flex flex-col gap-6 font-sans">
        <div className="flex flex-col gap-1.5 text-left">
          <h1 className="text-destructive font-sans text-2xl font-bold tracking-tight">
            Link expired or invalid
          </h1>
          <p className="text-muted-foreground text-xs leading-relaxed">
            This password reset link is invalid or has expired. Password reset links are single-use
            and valid for 15 minutes.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link href="/forgot-password" className="w-full">
            <Button className="h-9 w-full text-xs font-semibold">Request a new link</Button>
          </Link>
          <Link href="/login" className="w-full">
            <Button variant="outline" className="h-9 w-full text-xs">
              Back to sign in
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (tokenQuery.isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 font-sans">
        <div className="border-primary/20 border-t-primary h-6 w-6 animate-spin rounded-full border-2" />
        <p className="text-muted-foreground text-xs">Verifying reset link...</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-6 font-sans">
        <div className="flex flex-col gap-1.5 text-left">
          <h1 className="text-foreground text-2xl font-bold tracking-tight">Password updated</h1>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Your password has been successfully reset. You can now sign in using your new password.
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
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Reset password</h1>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Enter a new secure password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password" className="text-foreground text-xs font-medium">
            New Password
          </Label>
          <div className="relative flex items-center">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              disabled={isSubmitting}
              className="border-border/60 bg-background h-9 pr-10 font-sans text-xs"
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
          {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword" className="text-foreground text-xs font-medium">
            Confirm Password
          </Label>
          <div className="relative flex items-center">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••••••"
              disabled={isSubmitting}
              className="border-border/60 bg-background h-9 pr-10 font-sans text-xs"
              {...register("confirmPassword")}
              aria-invalid={!!errors.confirmPassword}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-muted-foreground hover:text-foreground absolute right-3 transition-colors focus:outline-none"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !token}
          className="mt-1 h-9 w-full text-xs font-semibold"
        >
          {isSubmitting ? "Updating password..." : "Update password"}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center gap-4 py-8 font-sans">
          <div className="border-primary/20 border-t-primary h-6 w-6 animate-spin rounded-full border-2" />
          <p className="text-muted-foreground text-xs">Loading...</p>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
