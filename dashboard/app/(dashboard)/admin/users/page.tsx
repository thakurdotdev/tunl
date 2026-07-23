"use client";

import { useState } from "react";
import {
  useAdminPlans,
  useAdminUsers,
  useUpdateUserPlan,
  useUpdateUserRole,
} from "@/hooks/use-admin";
import type { AdminUser } from "@/lib/types";
import { UserManagementTable } from "@/components/admin/user-management-table";
import { AssignPlanModal } from "@/components/admin/assign-plan-modal";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [selectedUserForPlan, setSelectedUserForPlan] = useState<AdminUser | null>(null);

  const { data: usersList, isLoading: isUsersLoading } = useAdminUsers(search);
  const { data: plansList } = useAdminPlans();

  const updateUserPlan = useUpdateUserPlan();
  const updateUserRole = useUpdateUserRole();

  return (
    <div className="space-y-6">
      <UserManagementTable
        users={usersList}
        isLoading={isUsersLoading}
        search={search}
        onSearchChange={setSearch}
        onSelectUserForPlan={setSelectedUserForPlan}
        onToggleUserRole={(userId, role) => updateUserRole.mutate({ userId, role })}
      />

      <AssignPlanModal
        user={selectedUserForPlan}
        plans={plansList}
        onClose={() => setSelectedUserForPlan(null)}
        onSelectPlan={(planName) => {
          if (selectedUserForPlan) {
            updateUserPlan.mutate(
              { userId: selectedUserForPlan.id, planName },
              { onSuccess: () => setSelectedUserForPlan(null) },
            );
          }
        }}
        isPending={updateUserPlan.isPending}
      />
    </div>
  );
}
