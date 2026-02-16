"use client";

import Link from "next/link";

export default function LoginPage() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Prototype only — Supabase auth coming next.
    // Later we’ll call supabase.auth.signInWithPassword(...)
    alert("Prototype: login not wired up yet.");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Title */}
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
          Nurse Login
        </h1>

        {/* Subtitle */}
        <p className="text-center text-gray-600 mb-6">
          Sign in to access the HomeHealth dashboard.
        </p>

        {/* Login Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="nurse@example.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 caret-black focus:ring-2 focus:ring-black focus:outline-none"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>

              {/* Forgot password link */}
              <Link
                href="/forgot-password"
                className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4"
              >
                Forgot?
              </Link>
            </div>

            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 caret-black focus:ring-2 focus:ring-black focus:outline-none"
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-black text-white font-medium hover:bg-gray-800 transition"
          >
            Sign In
          </button>
        </form>

        {/* Create account link */}
        <p className="text-center text-sm text-gray-600 mt-4">
          New nurse?{" "}
          <Link
            href="/signup"
            className="text-gray-900 font-medium underline underline-offset-4"
          >
            Create an account
          </Link>
        </p>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-4">
          Prototype login — Supabase authentication coming next.
        </p>
      </div>
    </main>
  );
}
I