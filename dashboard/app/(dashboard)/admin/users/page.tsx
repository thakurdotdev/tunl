"use client";

import { useState, useEffect } from "react";
import {
  useAdminPlans,
  useAdminUsers,
  useUpdateUserPlan,
  useUpdateUserRole,
} from "@/hooks/use-admin";
import type { AdminUser } from "@/lib/types";
import { UserManagementTable } from "@/components/admin/user-management-table";
import { AssignPlanModal } from "@/components/admin/assign-plan-modal";
import { toast } from "sonner";
import { Shield, Users, UserCheck } from "lucide-react";

export default function AdminUsersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedUserForPlan, setSelectedUserForPlan] = useState<AdminUser | null>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const {
    data: usersResponse,
    isLoading: isUsersLoading,
    isFetching: isUsersFetching,
  } = useAdminUsers({
    page,
    pageSize,
    search: debouncedSearch,
    role: roleFilter,
    planId: planFilter,
  });

  const { data: plansList } = useAdminPlans();

  const updateUserPlan = useUpdateUserPlan();
  const updateUserRole = useUpdateUserRole();

  const users = usersResponse?.users ?? [];
  const pagination = usersResponse?.pagination;
  const totalUsersCount = pagination?.total ?? users.length;

  const handleClearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setRoleFilter("all");
    setPlanFilter("all");
    setPage(1);
  };

  const handleRoleToggle = (userId: string, newRole: "user" | "admin") => {
    updateUserRole.mutate(
      { userId, role: newRole },
      {
        onSuccess: () => {
          toast.success(
            `User account successfully ${newRole === "admin" ? "promoted to Admin" : "demoted to User"}`,
          );
        },
        onError: (err: any) => {
          toast.error(err?.message || "Failed to update user role");
        },
      },
    );
  };

  const handlePlanAssign = (planId: string) => {
    if (!selectedUserForPlan) return;
    const targetEmail = selectedUserForPlan.email;
    updateUserPlan.mutate(
      { userId: selectedUserForPlan.id, planId },
      {
        onSuccess: () => {
          toast.success(`Subscription plan updated for ${targetEmail}`);
          setSelectedUserForPlan(null);
        },
        onError: (err: any) => {
          toast.error(err?.message || "Failed to update subscription plan");
        },
      },
    );
  };

  return (
    <div className="space-y-6 font-sans">
      {/* KPI Metric Summary Strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-card border-border/60 flex items-center justify-between rounded-lg border p-4 shadow-2xs">
          <div>
            <span className="text-muted-foreground block text-xs font-medium">
              Total Directory Users
            </span>
            <span className="text-foreground mt-1 text-2xl font-bold tracking-tight">
              {isUsersLoading ? "..." : totalUsersCount.toLocaleString()}
            </span>
          </div>
          <div className="bg-secondary text-foreground border-border/60 flex h-9 w-9 items-center justify-center rounded-lg border">
            <Users className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="bg-card border-border/60 flex items-center justify-between rounded-lg border p-4 shadow-2xs">
          <div>
            <span className="text-muted-foreground block text-xs font-medium">
              Role Filter Status
            </span>
            <span className="text-foreground mt-1 text-sm font-semibold capitalize">
              {roleFilter === "all" ? "All Accounts" : `${roleFilter} Accounts`}
            </span>
          </div>
          <div className="border-border/60 flex h-9 w-9 items-center justify-center rounded-lg border bg-purple-500/10 text-purple-400">
            <Shield className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="bg-card border-border/60 flex items-center justify-between rounded-lg border p-4 shadow-2xs">
          <div>
            <span className="text-muted-foreground block text-xs font-medium">
              Active Plan Tiers
            </span>
            <span className="text-foreground mt-1 text-2xl font-bold tracking-tight">
              {plansList?.length ?? 0}
            </span>
          </div>
          <div className="bg-secondary text-foreground border-border/60 flex h-9 w-9 items-center justify-center rounded-lg border">
            <UserCheck className="h-4.5 w-4.5" />
          </div>
        </div>
      </div>

      {/* Main Directory Table */}
      <UserManagementTable
        users={users}
        pagination={pagination}
        isLoading={isUsersLoading}
        isFetching={isUsersFetching}
        search={searchInput}
        onSearchChange={setSearchInput}
        roleFilter={roleFilter}
        onRoleFilterChange={(role) => {
          setRoleFilter(role);
          setPage(1);
        }}
        planFilter={planFilter}
        onPlanFilterChange={(plan) => {
          setPlanFilter(plan);
          setPage(1);
        }}
        availablePlans={plansList}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onSelectUserForPlan={setSelectedUserForPlan}
        onToggleUserRole={handleRoleToggle}
        isRolePending={updateUserRole.isPending}
        onClearFilters={handleClearFilters}
      />

      {/* Plan Assignment Modal */}
      <AssignPlanModal
        user={selectedUserForPlan}
        plans={plansList}
        onClose={() => setSelectedUserForPlan(null)}
        onSelectPlan={handlePlanAssign}
        isPending={updateUserPlan.isPending}
      />
    </div>
  );
}
