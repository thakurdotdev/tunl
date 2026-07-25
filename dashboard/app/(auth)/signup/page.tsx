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
  name: z.string().trim().max(100, "Name must be at most 100 characters").optional(),
  email: z
    .string()
    .min(1, "Email is required")
    .pipe(z.email("Please enter a valid email address").max(320)),
  password: z
    .string()
    .min(1, "Password is required")
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
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: SignupFormValues) => {
    signupMutation.mutate(
      { name: values.name, email: values.email, password: values.password },
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
      },
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
      <div className="flex flex-col gap-6 font-sans">
        <div className="flex flex-col gap-1.5 text-left">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Verify your email</h1>
          <p className="text-muted-foreground text-xs leading-relaxed">
            We&apos;ve sent a verification link to{" "}
            <span className="text-foreground font-semibold">{registeredEmail}</span>. Please check
            your inbox and click the link to activate your account.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleResend}
            variant="outline"
            className="h-9 w-full text-xs"
            disabled={resendMutation.isPending}
          >
            {resendMutation.isPending ? "Resending..." : "Resend email"}
          </Button>
          <Link href="/login" className="w-full">
            <Button className="h-9 w-full text-xs font-semibold">Back to sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="flex flex-col gap-1.5 text-left">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h1>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Enter your email and password to register a new account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name" className="text-foreground text-xs font-medium">Full name (optional)</Label>
          <Input
            id="name"
            type="text"
            placeholder="Alex Developer"
            disabled={isSubmitting}
            {...register("name")}
            className="h-9 font-sans text-xs border-border/60 bg-background"
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-foreground text-xs font-medium">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            disabled={isSubmitting}
            {...register("email")}
            className="h-9 font-sans text-xs border-border/60 bg-background"
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password" className="text-foreground text-xs font-medium">Password</Label>
          <div className="relative flex items-center">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              disabled={isSubmitting}
              className="h-9 pr-10 font-sans text-xs border-border/60 bg-background"
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

        <Button type="submit" disabled={isSubmitting} className="mt-1 h-9 w-full text-xs font-semibold">
          {isSubmitting ? "Creating account..." : "Sign up"}
        </Button>
      </form>

      <div className="text-muted-foreground text-left text-xs font-sans">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-foreground font-semibold hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
