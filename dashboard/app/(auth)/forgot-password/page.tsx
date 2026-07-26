"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .pipe(z.email("Please enter a valid email address").max(320)),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : "/reset-password";
      await authClient.requestPasswordReset({
        email: values.email,
        redirectTo: redirectUrl,
      });
      setIsSuccess(true);
      toast.success("Reset link sent if email exists.");
    } catch {
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-6 font-sans">
        <div className="flex flex-col gap-1.5 text-left">
          <h1 className="text-foreground text-2xl font-bold tracking-tight">Check your email</h1>
          <p className="text-muted-foreground text-xs leading-relaxed">
            If the account is eligible, a password reset link will arrive shortly. Please check your
            spam folder if you do not receive it.
          </p>
        </div>
        <Link href="/login" className="w-full">
          <Button className="h-9 w-full text-xs font-semibold">Back to login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="flex flex-col gap-1.5 text-left">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Reset your password</h1>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Enter your email address and we&apos;ll send you a link to reset your password.
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
            placeholder="name@example.com"
            disabled={isSubmitting}
            {...register("email")}
            className="border-border/60 bg-background h-9 font-sans text-xs"
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 h-9 w-full text-xs font-semibold"
        >
          {isSubmitting ? "Sending link..." : "Send reset link"}
        </Button>
      </form>

      <div className="text-muted-foreground text-left font-sans text-xs">
        Remember your password?{" "}
        <Link href="/login" className="text-foreground font-semibold hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
