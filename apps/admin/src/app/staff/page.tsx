"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Shield, UserPlus } from "lucide-react";
import { apiClient } from "@/lib/api";
import type { Role, User } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { ColumnLoader } from "@/components/ui/ColumnLoader";
import { Input, selectClass } from "@/components/ui/Input";
import { AdminPageTitle } from "@/components/admin/AdminPageTitle";
import { AdminCardList, AdminTable } from "@/components/admin/AdminTable";
import { toast } from "@/components/ui/Toast";

type StaffUser = User & {
  createdAt?: string;
};

function formatJoined(iso?: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function roleLabel(role: Role) {
  if (role === "SUPER_ADMIN") return "Super admin";
  if (role === "STAFF") return "Admin";
  return "Customer";
}

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"STAFF" | "SUPER_ADMIN">("STAFF");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await apiClient.get<{ items: StaffUser[]; total: number } | StaffUser[]>(
        "/admin/staff",
        { limit: 200 },
      );
      const items = Array.isArray(res) ? res : res.items ?? [];
      setStaff(items);
      setState("ready");
    } catch (e) {
      setStaff([]);
      setState("error");
      toast(e instanceof Error ? e.message : "Could not load staff");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const invite = async () => {
    const contact = email.trim().toLowerCase();
    if (!contact.includes("@")) {
      toast("Enter a valid email");
      return;
    }
    setInviting(true);
    try {
      await apiClient.post("/admin/staff/invite", {
        email: contact,
        fullName: fullName.trim() || undefined,
        role,
      });
      toast(`Invite sent to ${contact}`);
      setEmail("");
      setFullName("");
      setRole("STAFF");
      void load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  };

  const rows = useMemo(
    () =>
      staff.map((u) => ({
        id: u.id,
        cells: [
          <div key="name">
            <p className="font-semibold text-deep">{u.fullName || "Unnamed"}</p>
            <p className="text-xs text-deep/50">{u.email || "No email"}</p>
          </div>,
          <span key="role">{roleLabel(u.role)}</span>,
          <span key="joined" className="whitespace-nowrap text-deep/70">
            {formatJoined(u.createdAt)}
          </span>,
        ],
      })),
    [staff],
  );

  return (
    <>
      <AdminPageTitle title="Staff" />
      <p className="mb-4 max-w-2xl text-sm text-deep/60">
        Admins who can access this dashboard. Invite teammates by email — they’ll use email OTP to sign in.
      </p>

      <div className="mb-6 rounded-2xl border border-deep/10 bg-white p-4 md:p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blush-soft text-deep">
            <UserPlus size={18} />
          </span>
          <div>
            <h2 className="font-semibold text-deep">Invite admin</h2>
            <p className="text-xs text-deep/50">Creates or upgrades their account to dashboard access.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            label="Work email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@drippinghoneytreats.com"
          />
          <Input
            label="Full name (optional)"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ada Lovelace"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-deep/70">
            <span className="font-medium text-deep">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "STAFF" | "SUPER_ADMIN")}
              className={selectClass}
            >
              <option value="STAFF">Admin</option>
              <option value="SUPER_ADMIN">Super admin</option>
            </select>
          </label>
          <Button loading={inviting} onClick={() => void invite()} className="sm:ml-auto">
            Send invite
          </Button>
        </div>
      </div>

      {state === "error" ? (
        <div className="mb-4">
          <OfflineState compact onRetry={() => void load()} />
        </div>
      ) : null}

      {state === "loading" ? (
        <ColumnLoader columns={1} count={4} aspect="aspect-[6/1]" />
      ) : state === "ready" && staff.length === 0 ? (
        <EmptyState
          icon={<Shield size={48} strokeWidth={1.4} />}
          title="No staff yet"
          message="Invite the first admin above to open the dashboard for your team."
        />
      ) : (
        <>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-deep/45">
            {staff.length} on the team
          </p>

          <div className="hidden md:block">
            <AdminTable
              columns={[
                { key: "member", label: "Member" },
                { key: "role", label: "Role" },
                { key: "joined", label: "Added" },
              ]}
              rows={rows}
              empty="No staff."
            />
          </div>

          <div className="md:hidden">
            <AdminCardList
              items={staff.map((u) => ({
                id: u.id,
                content: (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-deep">{u.fullName || "Unnamed"}</p>
                      <p className="truncate text-sm text-deep/55">{u.email}</p>
                      <p className="mt-1 text-xs text-deep/45">Added {formatJoined(u.createdAt)}</p>
                    </div>
                    <Badge status="pre_order">{roleLabel(u.role)}</Badge>
                  </div>
                ),
              }))}
            />
          </div>
        </>
      )}
    </>
  );
}
