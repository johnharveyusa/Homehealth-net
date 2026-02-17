"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

//import { supabase } from "@/lib/supabaseClient";
import { supabase } from "../lib/supabaseClient";
export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-10">
        {/* Title */}
        <h1 className="text-5xl font-bold text-center text-gray-900">
          Nurse Login
        </h1>

        <p className="text-center text-gray-600 mt-4 text-lg">
          Sign in to access the HomeHealth dashboard.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email Address
            </label>

            <input
              type="email"
              placeholder="nurse@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-black text-white text-lg font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Signup Link */}
        <p className="text-center text-gray-700 mt-8 text-lg">
          New nurse?{" "}
          <Link href="/signup" className="underline font-semibold">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
