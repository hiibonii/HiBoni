"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError("Login gagal. Periksa email dan password Anda.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (err: any) {
      setError("Login dengan Google gagal. Coba lagi.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-paper px-6">
      <h1 className="text-3xl font-bold tracking-widest mb-1">Hi Boni</h1>
      <p className="text-xs uppercase tracking-widest text-black/50 mb-8">
        Writing Workspace
      </p>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white border border-black/10 p-8"
      >
        <h2 className="text-2xl font-bold mb-1">Sign In</h2>
        <p className="text-black/60 mb-6">Access your dashboard.</p>

        <label htmlFor="email" className="text-xs uppercase tracking-wide font-medium">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="editor@hiboni.io"
          className="w-full border border-black/10 bg-paper px-3 py-3 mt-2 mb-4"
        />

        <label htmlFor="password" className="text-xs uppercase tracking-wide font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full border border-black/10 bg-paper px-3 py-3 mt-2 mb-4"
        />

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Signing in..." : "Enter Workspace →"}
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px bg-black/10 flex-1" />
          <span className="text-xs uppercase tracking-wide text-black/40">or</span>
          <div className="h-px bg-black/10 flex-1" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="btn-outline w-full"
        >
          {googleLoading ? "Signing in..." : "Continue with Google"}
        </button>

        <p className="text-xs text-black/40 mt-4">
          Already leveled up to Creator or Super Admin? Just log in with the same Google account you used to drop a comment!
        </p>
      </form>
    </div>
  );
}