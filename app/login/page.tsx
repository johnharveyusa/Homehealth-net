"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const VALID_CREDENTIALS: Record<string, { agencyCode: string; name: string; agency: string }> = {
  "TEST01": { agencyCode: "COMPASSION", name: "Nurse Demo 1",  agency: "Compassion Home Health" },
  "TEST02": { agencyCode: "COMPASSION", name: "Nurse Demo 2",  agency: "Compassion Home Health" },
  "X7K2M9": { agencyCode: "COMPASSION", name: "Jane Morales",  agency: "Compassion Home Health" },
  "B4QR8T": { agencyCode: "HARMONY",   name: "Rosa Fleming",  agency: "Harmony Care Services"  },
};

export default function LoginPage() {
  const router = useRouter();
  const [agencyCode, setAgencyCode] = useState("");
  const [pin, setPin]               = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    const agency = agencyCode.replace(/\s/g, "").trim().toUpperCase();
    const code   = pin.replace(/\s/g, "").trim().toUpperCase();

    await new Promise((r) => setTimeout(r, 400));

    const match = VALID_CREDENTIALS[code];
    if (match && match.agencyCode === agency) {
      sessionStorage.setItem(
        "hh_nurse",
        JSON.stringify({
          name:       match.name,
          agency:     match.agency,
          agencyCode: agency,
          code,
          loginTime:  new Date().toISOString(),
        })
      );
      router.push("/dashboard");
    } else {
      setError("Agency code or access code not recognized. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">

        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Bloodhound</h1>
          <p className="text-sm text-gray-500 mt-1">Home Health Field Safety</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleLogin} autoComplete="off" noValidate>

            {/* Agency Code */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agency Code
              </label>
              <input
                type="text"
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                inputMode="text"
                name="agency-code-field"
                value={agencyCode}
                onChange={(e) => setAgencyCode(e.target.value.replace(/\s/g, "").toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === " ") e.preventDefault();
                }}
                placeholder="e.g. COMPASSION"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           tracking-widest uppercase font-mono"
              />
            </div>

            {/* Access Code */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Access Code
              </label>
              <input
                type="text"
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                inputMode="text"
                name="access-code-field"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\s/g, "").toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === " ") e.preventDefault();
                }}
                placeholder="e.g. TEST01"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           tracking-widest uppercase font-mono"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !agencyCode.trim() || !pin.trim()}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                         text-white text-sm font-medium rounded-lg transition-colors
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>

          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          USCrimeCenters, LLC &mdash; Field Safety Platform
        </p>

      </div>
    </main>
  );
}
