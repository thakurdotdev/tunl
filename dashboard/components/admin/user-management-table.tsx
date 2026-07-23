import { useState } from "react";
import type { AdminUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Search, Sliders, Shield, ShieldOff, Key, Globe, Loader2 } from "lucide-react";

interface UserManagementTableProps {
  users: AdminUser[] | undefined;
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectUserForPlan: (user: AdminUser) => void;
  onToggleUserRole: (userId: string, newRole: "user" | "admin") => void;
  isRolePending?: boolean;
}

export function UserManagementTable({
  users,
  isLoading,
  search,
  onSearchChange,
  onSelectUserForPlan,
  onToggleUserRole,
  isRolePending = false,
}: UserManagementTableProps) {
  const [roleChangeTarget, setRoleChangeTarget] = useState<{
    user: AdminUser;
    targetRole: "user" | "admin";
  } | null>(null);

  const handleConfirmRoleChange = () => {
    if (roleChangeTarget) {
      onToggleUserRole(roleChangeTarget.user.id, roleChangeTarget.targetRole);
      setRoleChangeTarget(null);
    }
  };

  return (
    <>
      <div className="bg-card border-border/80 rounded-lg border p-5 font-mono">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold">User Account Directory</h2>
            <p className="text-muted-foreground text-xs">
              Manage subscription plans, administrative roles, and inspect registered subdomains.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-3.5 w-3.5" />
            <Input
              type="text"
              placeholder="Filter by email..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 pl-8 font-mono text-xs"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-border/60 bg-muted/30 text-muted-foreground border-b">
              <tr>
                <th className="px-3 py-2.5 font-medium">User Email</th>
                <th className="px-3 py-2.5 font-medium">Role</th>
                <th className="px-3 py-2.5 font-medium">Assigned Plan</th>
                <th className="px-3 py-2.5 font-medium">SSH Keys</th>
                <th className="px-3 py-2.5 font-medium">Registered Subdomains</th>
                <th className="px-3 py-2.5 font-medium">Joined</th>
                <th className="px-3 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-border/40 divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-muted-foreground py-8 text-center">
                    <Loader2 className="text-primary mx-auto mb-2 h-4 w-4 animate-spin" />
                    Querying user directory...
                  </td>
                </tr>
              ) : users?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted-foreground py-6 text-center">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                users?.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/20">
                    <td className="text-foreground px-3 py-3 font-semibold">{u.email}</td>
                    <td className="px-3 py-3">
                      {u.role === "admin" ? (
                        <span className="rounded border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-400">
                          ADMIN
                        </span>
                      ) : (
                        <span className="border-border bg-muted/40 text-muted-foreground rounded border px-2 py-0.5 text-[10px]">
                          USER
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="border-primary/40 bg-primary/10 text-primary rounded border px-2 py-0.5 text-[10px] font-bold">
                        {u.planName.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-muted-foreground px-3 py-3">
                      <span className="inline-flex items-center gap-1 font-mono text-xs">
                        <Key className="h-3 w-3 opacity-60" /> {u.sshKeyCount}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {u.reservedSubdomains && u.reservedSubdomains.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {u.reservedSubdomains.map((sub) => (
                            <span
                              key={sub}
                              className="flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[11px] text-cyan-400"
                            >
                              <Globe className="h-2.5 w-2.5" />
                              {sub}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 font-mono text-[11px]">None</span>
                      )}
                    </td>
                    <td className="text-muted-foreground px-3 py-3">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSelectUserForPlan(u)}
                          className="border-border h-7 px-2 text-[11px]"
                        >
                          <Sliders className="text-muted-foreground mr-1.5 h-3 w-3" /> Assign Plan
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
                              <Shield className="mr-1 h-3 w-3 text-purple-400" /> Promote Admin
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
