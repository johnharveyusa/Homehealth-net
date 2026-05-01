"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const VALID_CREDENTIALS: Record<string, { agencyCode: string; name: string; agency: string }> = {
  "TEST01": { agencyCode: "COMPASSION", name: "Nurse Demo 1", agency: "Compassion Home Health" },
  "TEST02": { agencyCode: "COMPASSION", name: "Nurse Demo 2", agency: "Compassion Home Health" },
  "X7K2M9": { agencyCode: "COMPASSION", name: "Jane Morales", agency: "Compassion Home Health" },
  "B4QR8T": { agencyCode: "HARMONY",   name: "Rosa Fleming", agency: "Harmony Care Services"  },
};

export default function LoginPage() {
  const router = useRouter();
  const [agencyCode, setAgencyCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      sessionStorage.setItem("hh_nurse", JSON.stringify({
        name: match.name,
        agency: match.agency,
        agencyCode: agency,
        code,
        loginTime: new Date().toISOString(),
      }));
      router.push("/dashboard");
    } else {
      setError("Agency code or access code not recognized.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6">

      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/40">
          <span className="text-3xl">🏥</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Bloodhound</h1>
        <p className="text-slate-400 text-sm mt-1">Home Health Field Safety</p>
      </div>

      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl"
      >
        <h2 className="text-slate-300 text-sm font-semibold mb-5 uppercase tracking-widest text-center">
          Nurse Sign In
        </h2>

        <div className="space-y-4">

          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">
              Agency Code
            </label>
            <input
              type="text"
              value={agencyCode}
              onChange={(e) => setAgencyCode(e.target.value.replace(/\s/g, "").toUpperCase())}
              placeholder="e.g. COMPASSION"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm tracking-widest uppercase focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">
              Access Code
            </label>
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\s/g, "").toUpperCase())}
              placeholder="e.g. X7K2M9"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={8}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm tracking-widest uppercase focus:outline-none focus:border-blue-500 transition-colors"
            />
            <p className="text-slate-600 text-xs mt-1.5">
              Letters and numbers · provided by your agency
            </p>
          </div>

          {error && (
            <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !agencyCode.trim() || !pin.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold rounded-xl py-3 mt-2 transition-all text-sm tracking-wide"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in…
              </span>
            ) : (
              "Sign In"
            )}
          </button>

        </div>
      </form>

      <p className="text-slate-700 text-xs mt-8 text-center">
        Powered by U.S. Crime Centers · homehealth.chat
      </p>

    </div>
  );
}
