"use client";

import { useState } from "react";
import type { AdminPlan, AdminUser, PaginationMetadata } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { toast } from "sonner";
import {
  Search,
  Sliders,
  Shield,
  ShieldOff,
  Key,
  Globe,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Check,
  Users,
} from "lucide-react";

interface UserManagementTableProps {
  users: AdminUser[] | undefined;
  pagination?: PaginationMetadata;
  isLoading: boolean;
  isFetching?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: "all" | "admin" | "user";
  onRoleFilterChange: (role: "all" | "admin" | "user") => void;
  planFilter: string;
  onPlanFilterChange: (planId: string) => void;
  availablePlans?: AdminPlan[];
  page: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onSelectUserForPlan: (user: AdminUser) => void;
  onToggleUserRole: (userId: string, newRole: "user" | "admin") => void;
  isRolePending?: boolean;
  onClearFilters: () => void;
}

export function UserManagementTable({
  users,
  pagination,
  isLoading,
  isFetching = false,
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  planFilter,
  onPlanFilterChange,
  availablePlans,
  page,
  onPageChange,
  pageSize,
  onPageSizeChange,
  onSelectUserForPlan,
  onToggleUserRole,
  isRolePending = false,
  onClearFilters,
}: UserManagementTableProps) {
  const [roleChangeTarget, setRoleChangeTarget] = useState<{
    user: AdminUser;
    targetRole: "user" | "admin";
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const total = pagination?.total ?? users?.length ?? 0;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const currentPage = Math.min(page, totalPages);

  const handleCopy = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleConfirmRoleChange = () => {
    if (roleChangeTarget) {
      onToggleUserRole(roleChangeTarget.user.id, roleChangeTarget.targetRole);
      setRoleChangeTarget(null);
    }
  };

  const hasActiveFilters = Boolean(search || roleFilter !== "all" || planFilter !== "all");

  return (
    <>
      <div className="bg-card border-border/70 flex flex-col overflow-hidden rounded-xl border shadow-2xs">
        {/* Controls: Header, Search & Dynamic Filters */}
        <div className="border-border/60 bg-muted/20 flex flex-col gap-3.5 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-foreground text-sm font-bold">User Account Directory</h2>
            <p className="text-muted-foreground text-xs">
              Manage subscription plans, administrative roles, and inspect registered subdomains.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Bar */}
            <div className="relative w-full sm:w-60">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-3.5 w-3.5" />
              <Input
                type="text"
                placeholder="Search email or name..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="bg-background/80 border-border/60 h-8.5 pr-8 pl-8 font-mono text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="text-muted-foreground hover:text-foreground absolute top-2.5 right-2.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => onRoleFilterChange(e.target.value as "all" | "admin" | "user")}
              className="border-border/60 bg-background text-foreground focus:ring-primary/40 h-8.5 rounded-lg border px-2.5 font-mono text-xs"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="user">Standard Users</option>
            </select>

            {/* Plan Filter */}
            <select
              value={planFilter}
              onChange={(e) => onPlanFilterChange(e.target.value)}
              className="border-border/60 bg-background text-foreground focus:ring-primary/40 h-8.5 rounded-lg border px-2.5 font-mono text-xs"
            >
              <option value="all">All Plans</option>
              {availablePlans?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name.toUpperCase()} Plan
                </option>
              ))}
            </select>

            {/* Page Size */}
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="border-border/60 bg-background text-foreground focus:ring-primary/40 h-8.5 rounded-lg border px-2 font-mono text-xs"
            >
              <option value={10}>10 / page</option>
              <option value={15}>15 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-border/60 bg-muted/30 text-muted-foreground border-b text-[10px] font-semibold tracking-wider uppercase">
              <tr>
                <th className="px-4 py-3">User Account</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Assigned Plan</th>
                <th className="px-4 py-3">SSH Keys</th>
                <th className="px-4 py-3">Registered Subdomains</th>
                <th className="px-4 py-3">Joined Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-border/30 divide-y">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`user-skel-${i}`} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="bg-muted h-4 w-36 rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="bg-muted h-5 w-14 rounded-full" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="bg-muted h-5 w-20 rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="bg-muted h-4 w-8 rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="bg-muted h-4 w-28 rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="bg-muted h-4 w-20 rounded" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="bg-muted ml-auto h-7 w-24 rounded" />
                    </td>
                  </tr>
                ))
              ) : users?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <div className="text-muted-foreground flex flex-col items-center justify-center gap-1.5">
                      <Users className="text-muted-foreground/40 mb-1 h-7 w-7" />
                      <span className="text-foreground text-xs font-semibold">
                        No users matching criteria
                      </span>
                      <p className="text-muted-foreground text-xs">
                        {hasActiveFilters
                          ? "Try clearing filters to see all user accounts."
                          : "User accounts will appear here once registered."}
                      </p>
                      {hasActiveFilters && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={onClearFilters}
                          className="mt-2 text-xs"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                users?.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/20 group transition-colors">
                    <td className="px-4 py-3 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-foreground font-semibold">{u.email}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(u.email, "email", `user-${u.id}`)}
                          className="text-muted-foreground/50 hover:text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                          title="Copy email"
                        >
                          {copiedKey === `user-${u.id}` ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      {u.name && (
                        <p className="text-muted-foreground font-sans text-[11px]">{u.name}</p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {u.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 rounded border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-400">
                          <Shield className="h-2.5 w-2.5" /> ADMIN
                        </span>
                      ) : (
                        <span className="border-border bg-muted/40 text-muted-foreground rounded border px-2 py-0.5 text-[10px]">
                          USER
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className="border-primary/30 bg-primary/10 text-primary rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold">
                        {u.planName?.toUpperCase() ?? "DEFAULT"}
                      </span>
                    </td>

                    <td className="text-muted-foreground px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-mono text-xs">
                        <Key className="h-3 w-3 opacity-60" /> {u.sshKeyCount}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {u.reservedSubdomains && u.reservedSubdomains.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {u.reservedSubdomains.slice(0, 3).map((sub) => (
                            <span
                              key={sub}
                              className="flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[11px] text-cyan-400"
                            >
                              <Globe className="h-2.5 w-2.5" />
                              {sub}
                            </span>
                          ))}
                          {u.reservedSubdomains.length > 3 && (
                            <span
                              className="border-border/60 bg-muted text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]"
                              title={u.reservedSubdomains.slice(3).join(", ")}
                            >
                              +{u.reservedSubdomains.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50 font-mono text-[11px]">None</span>
                      )}
                    </td>

                    <td className="text-muted-foreground px-4 py-3 font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString([], {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSelectUserForPlan(u)}
                          className="border-border/70 h-7 px-2.5 text-[11px]"
                        >
                          <Sliders className="text-muted-foreground mr-1 h-3 w-3" /> Assign Plan
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setRoleChangeTarget({
                              user: u,
                              targetRole: u.role === "admin" ? "user" : "admin",
                            })
                          }
                          disabled={isRolePending}
                          className="text-muted-foreground hover:text-foreground h-7 px-2 text-[11px]"
                        >
                          {u.role === "admin" ? (
                            <>
                              <ShieldOff className="text-destructive mr-1 h-3 w-3" /> Demote
                            </>
                          ) : (
                            <>
                              <Shield className="mr-1 h-3 w-3 text-purple-400" /> Make Admin
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Bar */}
        <div className="border-border/60 bg-muted/10 flex flex-col gap-3 border-t p-4 font-mono text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="text-muted-foreground text-xs">
            {total > 0 ? (
              <>
                Showing{" "}
                <span className="text-foreground font-semibold">
                  {(currentPage - 1) * pageSize + 1}
                </span>{" "}
                –{" "}
                <span className="text-foreground font-semibold">
                  {Math.min(currentPage * pageSize, total)}
                </span>{" "}
                of <span className="text-foreground font-semibold">{total.toLocaleString()}</span>{" "}
                users
                {isFetching && (
                  <span className="text-primary ml-2 inline-flex items-center gap-1 text-[11px]">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Updating...
                  </span>
                )}
              </>
            ) : (
              <span>0 users found</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {/* First Page */}
            <Button
              size="icon"
              variant="outline"
              onClick={() => onPageChange(1)}
              disabled={currentPage <= 1 || isLoading}
              className="border-border/60 h-8 w-8"
              title="First Page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>

            {/* Prev Page */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="border-border/60 h-8 px-2.5 font-mono text-xs"
            >
              <ChevronLeft className="mr-0.5 h-3.5 w-3.5" /> Prev
            </Button>

            <span className="text-muted-foreground px-2 font-medium">
              {currentPage} / {totalPages}
            </span>

            {/* Next Page */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className="border-border/60 h-8 px-2.5 font-mono text-xs"
            >
              Next <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </Button>

            {/* Last Page */}
            <Button
              size="icon"
              variant="outline"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage >= totalPages || isLoading}
              className="border-border/60 h-8 w-8"
              title="Last Page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal before Role Update */}
      <ConfirmationModal
        isOpen={Boolean(roleChangeTarget)}
        onClose={() => setRoleChangeTarget(null)}
        onConfirm={handleConfirmRoleChange}
        title={
          roleChangeTarget?.targetRole === "admin"
            ? "Promote Account to Admin"
            : "Demote Admin Account"
        }
        description={`Are you sure you want to change the role of '${roleChangeTarget?.user.email}' to ${roleChangeTarget?.targetRole.toUpperCase()}?`}
        confirmText={
          roleChangeTarget?.targetRole === "admin" ? "Promote to Admin" : "Demote to User"
        }
        variant={roleChangeTarget?.targetRole === "admin" ? "default" : "destructive"}
        isPending={isRolePending}
      />
    </>
  );
}
