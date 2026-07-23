"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function ProtectedRoute({
  children,
  requireSuperAdmin = false,
}: {
  children: React.ReactNode;
  // Set true for pages only a super_admin should reach (Settings, Users).
  // A signed-in creator gets redirected back to /dashboard instead of the
  // login loop that would happen if we sent them to /login.
  requireSuperAdmin?: boolean;
}) {
  const { user, loading, canWriteStories, isSuperAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!canWriteStories) {
      // Signed in, but not staff (still just a "user" role) — send them
      // back to the public site rather than bouncing to /login, which
      // would just send them right back here in a loop.
      router.push("/");
      return;
    }
    if (requireSuperAdmin && !isSuperAdmin) {
      router.push("/dashboard?denied=1");
    }
  }, [loading, user, canWriteStories, isSuperAdmin, requireSuperAdmin, router]);

  const allowed = user && canWriteStories && (!requireSuperAdmin || isSuperAdmin);
  if (loading || !allowed) return <p className="p-12">Loading...</p>;
  return <>{children}</>;
}