"use client";

import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { RouteGuard } from "@/components/route-guard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { LogOut, Shield, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./dashboard.css";

const getInitial = (name?: string | null, email?: string | null) => {
  if (name && name.trim()) {
    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return trimmed[0].toUpperCase();
  }
  if (email && email.trim()) {
    return email.trim()[0].toUpperCase();
  }
  return "U";
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Tunnels", pathMatch: "/dashboard" },
    { href: "/keys", label: "SSH Keys", pathMatch: "/keys" },
    { href: "/inspect", label: "Inspect", pathMatch: "/inspect" },
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin", pathMatch: "/admin" }] : []),
  ];

  const isProfileActive = pathname.startsWith("/profile");
  const displayName = user?.name || null;
  const userInitial = getInitial(displayName, user?.email);

  return (
    <RouteGuard>
      <div className="bg-background flex min-h-screen flex-col font-sans">
        <header className="border-border/60 bg-card/90 sticky top-0 z-50 border-b backdrop-blur-xs">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
            <div className="flex items-center gap-2 overflow-hidden sm:gap-6">
              <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
                <Logo />
              </Link>
              <div className="bg-border/60 hidden h-4 w-px shrink-0 sm:block" />
              <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto py-1 sm:gap-1.5">
                {navItems.map((item) => {
                  const isActive = pathname.startsWith(item.pathMatch);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors sm:px-3 sm:py-1.5 ${
                        isActive
                          ? "bg-secondary text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs">
              <ModeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="User profile menu"
                      className={
                        isProfileActive
                          ? "bg-secondary text-foreground border-border overflow-hidden font-semibold"
                          : "overflow-hidden font-semibold"
                      }
                    >
                      {user?.image ? (
                        <img
                          src={user.image}
                          alt={displayName || user?.email || "User Avatar"}
                          className="h-full w-full rounded-md object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold tracking-tight">{userInitial}</span>
                      )}
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-56 p-1">
                  <div className="flex items-center gap-2.5 px-2.5 py-2 text-xs">
                    {user?.image ? (
                      <img
                        src={user.image}
                        alt={displayName || user?.email || "Avatar"}
                        className="border-border/60 h-8 w-8 shrink-0 rounded-full border object-cover"
                      />
                    ) : (
                      <div className="bg-secondary text-foreground border-border/60 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                        {userInitial}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {displayName ? (
                        <>
                          <p className="text-foreground truncate font-semibold">{displayName}</p>
                          <p className="text-muted-foreground truncate text-[11px]">
                            {user?.email}
                          </p>
                        </>
                      ) : (
                        <p className="text-foreground truncate font-semibold">{user?.email}</p>
                      )}
                      <p className="text-muted-foreground mt-0.5 text-[10px] capitalize">
                        {user?.role || "user"} {user?.plan?.name ? `• ${user.plan.name}` : ""}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    render={
                      <Link
                        href="/profile"
                        className="flex w-full cursor-pointer items-center gap-2 text-xs font-medium"
                      >
                        <User className="text-muted-foreground h-3.5 w-3.5" />
                        <span>Account & Security</span>
                      </Link>
                    }
                  />
                  {user?.role === "admin" && (
                    <DropdownMenuItem
                      render={
                        <Link
                          href="/admin"
                          className="flex w-full cursor-pointer items-center gap-2 text-xs font-medium"
                        >
                          <Shield className="text-muted-foreground h-3.5 w-3.5" />
                          <span>Admin Dashboard</span>
                        </Link>
                      }
                    />
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={logout}
                    className="flex cursor-pointer items-center gap-2 text-xs font-medium"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      </div>
    </RouteGuard>
  );
}
