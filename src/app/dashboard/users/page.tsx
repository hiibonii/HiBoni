"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import CmsSidebar from "@/components/CmsSidebar";
import { getAllUsers, updateUserRole } from "@/lib/usersStore";
import { useAuth } from "@/lib/useAuth";
import { UserDoc, UserRole } from "@/types";

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  creator: "Creator",
  user: "User (reader)",
};

function UsersInner() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleRoleChange = async (uid: string, role: UserRole) => {
    setUpdatingUid(uid);
    try {
      await updateUserRole(uid, role);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)));
    } catch {
      alert("Gagal mengubah role. Coba lagi.");
    } finally {
      setUpdatingUid(null);
    }
  };

  return (
    <ProtectedRoute requireSuperAdmin>
      <div className="flex">
        <CmsSidebar />
        <main className="flex-1 p-8">
          <h1 className="text-3xl font-bold mb-1">Users</h1>
          <p className="text-black/60 mb-8">
            Assign your crew! Set who can write (Creator) or run the show (Super Admin). Everyone who logs in via Google or email starts as a 'User'—level them up below!
          </p>

          <div className="bg-white border border-black/10">
            {loading ? (
              <p className="p-6 text-black/50">Loading...</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-paper text-left text-xs uppercase text-black/50">
                  <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Joined</th>
                    <th className="p-4">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = u.uid === currentUser?.uid;
                    return (
                      <tr key={u.uid} className="border-t border-black/5">
                        <td className="p-4 font-medium flex items-center gap-3">
                          {u.photoURL ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={u.photoURL}
                              alt={u.displayName || "User"}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-black/10" />
                          )}
                          {u.displayName || "(no name)"}
                          {isSelf && (
                            <span className="text-[10px] uppercase tracking-wide bg-black/5 px-1.5 py-0.5">
                              You
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-black/60">{u.email || "—"}</td>
                        <td className="p-4 text-black/60">
                          {new Date(u.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="p-4">
                          <select
                            id={`role-select-${u.uid}`}
                            name={`role-${u.uid}`}
                            value={u.role}
                            disabled={isSelf || updatingUid === u.uid}
                            onChange={(e) =>
                              handleRoleChange(u.uid, e.target.value as UserRole)
                            }
                            title={
                              isSelf
                                ? "Kamu tidak bisa mengubah role sendiri di sini."
                                : undefined
                            }
                            className="border border-black/10 px-2 py-1.5 text-sm disabled:opacity-40 disabled:bg-black/5"
                          >
                            {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-black/50">
                        It's a bit quiet here—no users have logged in yet!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default function UsersPage() {
  return <UsersInner />;
}