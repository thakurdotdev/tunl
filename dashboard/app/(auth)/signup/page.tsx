"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSignupMutation, useResendVerificationMutation } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api-client";
import { Eye, EyeOff } from "lucide-react";

const signupSchema = z.object({
  email: z.email("Please enter a valid email address").max(320),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(20, "Password cannot exceed 20 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const signupMutation = useSignupMutation();
  const resendMutation = useResendVerificationMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: SignupFormValues) => {
    signupMutation.mutate(
      { email: values.email, password: values.password },
      {
        onSuccess: () => {
          setRegisteredEmail(values.email);
          setIsSuccess(true);
          toast.success("Account created successfully!");
        },
        onError: (err) => {
          if (err instanceof ApiClientError) {
            toast.error(err.message);
          } else {
            toast.error("Failed to sign up. Please try again.");
          }
        },
      }
    );
  };

  const handleResend = () => {
    resendMutation.mutate(registeredEmail, {
      onSuccess: () => {
        toast.success("Verification email resent!");
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

  const isSubmitting = signupMutation.isPending;

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight font-sans">
            Verify your email
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We&apos;ve sent a verification link to <span className="font-medium text-foreground">{registeredEmail}</span>.
            Please check your inbox and click the link to activate your account.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleResend} variant="outline" className="w-full" disabled={resendMutation.isPending}>
            {resendMutation.isPending ? "Resending..." : "Resend email"}
          </Button>
          <Link href="/login" className="w-full">
            <Button className="w-full">Back to sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight font-sans">
          Create an account
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and password to register a new account.
        </p>
      </div>

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
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
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
              className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full mt-2">
          {isSubmitting ? "Creating account..." : "Sign up"}
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground mt-4">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground hover:underline underline-offset-4"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
