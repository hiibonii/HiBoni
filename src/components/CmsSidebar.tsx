"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiGrid, FiSettings, FiUsers, FiUser, FiExternalLink } from "react-icons/fi";
import { useAuth } from "@/lib/useAuth";

export default function CmsSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, isSuperAdmin, role } = useAuth();

  // Settings and Users management are super_admin-only areas — a creator
  // never even sees the links (in addition to firestore.rules blocking the
  // underlying writes, and ProtectedRoute blocking the pages directly).
  const items = [
    { href: "/dashboard", label: "Dashboard", icon: FiGrid },
    { href: "/dashboard/profile", label: "My Profile", icon: FiUser },
    ...(isSuperAdmin
      ? [
          { href: "/dashboard/users", label: "Users", icon: FiUsers },
          { href: "/dashboard/settings", label: "Settings", icon: FiSettings },
        ]
      : []),
  ];

  const roleLabel =
    role === "super_admin" ? "Super Admin" : role === "creator" ? "Creator" : "Reader";

  return (
    <aside className="w-64 shrink-0 border-r border-black/10 bg-white min-h-screen flex flex-col justify-between p-6">
      <div>
        <p className="font-bold text-lg">HiBoni CMS</p>
        <p className="text-xs text-black/50 mb-1">Writing Workspace</p>
        <span className="inline-block text-[10px] uppercase tracking-wide bg-black/5 px-2 py-0.5 mb-8">
          {roleLabel}
        </span>
        <nav className="flex flex-col gap-1">
          {items.map((it) => {
            const isActive = pathname === it.href;
            const classes = `flex items-center gap-3 px-3 py-2 text-sm rounded-sm ${
              isActive ? "bg-ink text-white" : "hover:bg-black/5"
            }`;
            // The current page is shown as a plain (non-clickable) indicator
            // instead of a link back to itself.
            if (isActive) {
              return (
                <div key={it.label} className={classes} aria-current="page">
                  <it.icon /> {it.label}
                </div>
              );
            }
            return (
              <Link key={it.label} href={it.href} className={classes}>
                <it.icon /> {it.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex flex-col gap-2">
        <Link href="/" target="_blank" className="btn-outline text-center flex items-center justify-center gap-2">
          <FiExternalLink size={14} /> View Site
        </Link>
        <Link href="/dashboard/create" className="btn-primary text-center">
          Create Story
        </Link>
        <button
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
          className="btn-outline"
        >
          Log Out
        </button>
      </div>
    </aside>
  );
}