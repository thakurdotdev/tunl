"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

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
    .max(20, "Password cannot exceed 20 characters"),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [lastUsedProvider, setLastUsedProvider] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("tunl_last_used_provider");
      if (stored) setLastUsedProvider(stored);
    }
  }, []);

  const saveLastUsed = (provider: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("tunl_last_used_provider", provider);
    }
  };

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

  const onSubmit = async (values: SignupFormValues) => {
    setIsSubmitting(true);
    saveLastUsed("email");
    try {
      const redirectUrl =
        typeof window !== "undefined" ? `${window.location.origin}/dashboard` : "/dashboard";

      const res = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name || values.email.split("@")[0],
        callbackURL: redirectUrl,
      });

      if (res.error) {
        toast.error(res.error.message || "Failed to create account");
        return;
      }

      toast.success("Account created successfully!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Failed to sign up. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialSignup = async (provider: "github" | "google") => {
    setIsSocialLoading(provider);
    saveLastUsed(provider);
    try {
      const redirectUrl =
        typeof window !== "undefined" ? `${window.location.origin}/dashboard` : "/dashboard";
      await authClient.signIn.social({
        provider,
        callbackURL: redirectUrl,
      });
    } catch (err: any) {
      toast.error(err?.message || `Failed to sign up with ${provider}`);
      setIsSocialLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="flex flex-col gap-1.5 text-left">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Create an account</h1>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Sign up with GitHub, Google, or enter your details below.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialSignup("github")}
          disabled={isSubmitting || !!isSocialLoading}
          className="relative h-9 w-full justify-center gap-2 font-sans text-xs font-semibold"
        >
          {isSocialLoading === "github" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          )}
          <span>Sign up with GitHub</span>
          {lastUsedProvider === "github" && (
            <span className="absolute right-3 rounded border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
              Last used
            </span>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialSignup("google")}
          disabled={isSubmitting || !!isSocialLoading}
          className="relative h-9 w-full justify-center gap-2 font-sans text-xs font-semibold"
        >
          {isSocialLoading === "google" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>Sign up with Google</span>
          {lastUsedProvider === "google" && (
            <span className="absolute right-3 rounded border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
              Last used
            </span>
          )}
        </Button>
      </div>

      <div className="relative flex items-center justify-center">
        <div className="border-border/60 w-full border-t" />
        <span className="bg-background text-muted-foreground absolute flex items-center gap-1 px-2 font-sans text-[11px] font-medium tracking-wider uppercase">
          Or with email
          {lastUsedProvider === "email" && (
            <span className="py-0.2 rounded border-emerald-500/30 bg-emerald-500/10 px-1 text-[9px] font-semibold text-emerald-400">
              Last used
            </span>
          )}
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name" className="text-foreground text-xs font-medium">
            Full name (optional)
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Alex Developer"
            disabled={isSubmitting || !!isSocialLoading}
            {...register("name")}
            className="border-border/60 bg-background h-9 font-sans text-xs"
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-foreground text-xs font-medium">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            disabled={isSubmitting || !!isSocialLoading}
            {...register("email")}
            className="border-border/60 bg-background h-9 font-sans text-xs"
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password" className="text-foreground text-xs font-medium">
            Password
          </Label>
          <div className="relative flex items-center">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              disabled={isSubmitting || !!isSocialLoading}
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

        <Button
          type="submit"
          disabled={isSubmitting || !!isSocialLoading}
          className="mt-1 h-9 w-full text-xs font-semibold"
        >
          {isSubmitting ? "Creating account..." : "Sign up"}
        </Button>
      </form>

      <div className="text-muted-foreground text-left font-sans text-xs">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground font-semibold hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
