"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { apiClient } from "@/lib/api";
import type { Role, User } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { ColumnLoader } from "@/components/ui/ColumnLoader";
import { Input } from "@/components/ui/Input";
import { AdminPageTitle } from "@/components/admin/AdminPageTitle";
import { AdminCardList, AdminTable } from "@/components/admin/AdminTable";
import { toast } from "@/components/ui/Toast";

type AdminUser = User & {
  createdAt?: string;
  consentAt?: string | null;
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

function contactLine(user: AdminUser) {
  return user.email || user.phone || "No contact";
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await apiClient.get<{ items: AdminUser[]; total: number } | AdminUser[]>(
        "/admin/users",
        {
          role: "CUSTOMER",
          q: appliedQuery || undefined,
          limit: 200,
        },
      );
      const items = Array.isArray(res) ? res : res.items ?? [];
      setUsers(items);
      setState("ready");
    } catch (e) {
      setUsers([]);
      setState("error");
      toast(e instanceof Error ? e.message : "Could not load users");
    }
  }, [appliedQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(
    () =>
      users.map((u) => ({
        id: u.id,
        cells: [
          <div key="name">
            <p className="font-semibold text-deep">{u.fullName || "Unnamed"}</p>
            <p className="text-xs text-deep/50">{contactLine(u)}</p>
          </div>,
          <span key="role" className="text-deep/80">
            {roleLabel(u.role)}
          </span>,
          <div key="verify" className="flex flex-wrap gap-1">
            {u.emailVerified ? (
              <span className="rounded-full bg-tea/15 px-2 py-0.5 text-[10px] font-semibold text-deep">
                Email ✓
              </span>
            ) : null}
            {u.phoneVerified ? (
              <span className="rounded-full bg-sage/35 px-2 py-0.5 text-[10px] font-semibold text-deep">
                Phone ✓
              </span>
            ) : null}
            {!u.emailVerified && !u.phoneVerified ? (
              <span className="text-xs text-deep/40">Unverified</span>
            ) : null}
          </div>,
          <span key="joined" className="whitespace-nowrap text-deep/70">
            {formatJoined(u.createdAt)}
          </span>,
        ],
      })),
    [users],
  );

  return (
    <>
      <AdminPageTitle title="Users" />
      <p className="mb-4 max-w-2xl text-sm text-deep/60">
        Customers who signed up on the app. Team access lives under Staff.
      </p>

      <form
        className="mb-4 flex w-full max-w-md items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setAppliedQuery(query.trim());
        }}
      >
        <div className="min-w-0 flex-1">
          <Input
            label="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email, phone…"
          />
        </div>
        <Button type="submit" className="shrink-0">
          <Search size={16} />
        </Button>
      </form>

      {state === "error" ? (
        <div className="mb-4">
          <OfflineState compact onRetry={() => void load()} />
        </div>
      ) : null}

      {state === "loading" ? (
        <ColumnLoader columns={1} count={6} aspect="aspect-[6/1]" />
      ) : state === "ready" && users.length === 0 ? (
        <EmptyState
          icon={<Users size={48} strokeWidth={1.4} />}
          title="No sign-ups yet"
          message={
            appliedQuery
              ? `Nothing matched “${appliedQuery}”.`
              : "When customers create accounts, they’ll show up here."
          }
        />
      ) : (
        <>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-deep/45">
            {users.length} {users.length === 1 ? "person" : "people"}
          </p>

          <div className="hidden md:block">
            <AdminTable
              columns={[
                { key: "user", label: "User" },
                { key: "role", label: "Role" },
                { key: "verified", label: "Verified" },
                { key: "joined", label: "Joined" },
              ]}
              rows={rows}
              empty="No users."
            />
          </div>

          <div className="md:hidden">
            <AdminCardList
              items={users.map((u) => ({
                id: u.id,
                content: (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-deep">{u.fullName || "Unnamed"}</p>
                        <p className="truncate text-sm text-deep/55">{contactLine(u)}</p>
                      </div>
                      <Badge status={u.role === "CUSTOMER" ? "available" : "pre_order"}>
                        {roleLabel(u.role)}
                      </Badge>
                    </div>
                    <p className="text-xs text-deep/45">Joined {formatJoined(u.createdAt)}</p>
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
