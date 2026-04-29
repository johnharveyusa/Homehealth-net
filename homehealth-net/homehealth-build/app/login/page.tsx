"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Demo PIN roster — replace with Supabase lookup in production
const NURSES: Record<string, { name: string; role: string; territory: string }> = {
  "1234": { name: "Taylor Smith",  role: "Skilled Nurse", territory: "Memphis" },
  "5678": { name: "Jordan Lee",    role: "Therapist",     territory: "Memphis" },
  "9012": { name: "Marcus Webb",   role: "Skilled Nurse", territory: "Memphis" },
};

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin]       = useState("");
  const [status, setStatus] = useState<{ msg: string; color: string } | null>(null);
  const [shake, setShake]   = useState(false);

  function pressDigit(d: string) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => attempt(next), 120);
    }
  }

  function attempt(code: string) {
    const nurse = NURSES[code];
    if (nurse) {
      setStatus({ msg: `✓ Welcome, ${nurse.name}`, color: "text-emerald-400" });
      // Store nurse in sessionStorage for dashboard to read
      sessionStorage.setItem("nurse", JSON.stringify(nurse));
      setTimeout(() => router.push("/dashboard"), 600);
    } else {
      setStatus({ msg: "Incorrect PIN — try again", color: "text-rose-400" });
      setShake(true);
      setTimeout(() => { setShake(false); setPin(""); setStatus(null); }, 700);
    }
  }

  function backspace() {
    setPin(p => p.slice(0, -1));
    setStatus(null);
  }

  function clear() {
    setPin("");
    setStatus(null);
  }

  const digits = ["1","2","3","4","5","6","7","8","9","CLR","0","⌫"];

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className={`w-full max-w-xs text-center transition-transform ${shake ? "translate-x-2" : ""}`}>

        {/* Logo */}
        <div className="h-14 w-14 rounded-2xl bg-blue-600/20 border border-blue-700/40 grid place-items-center mx-auto mb-4">
          <span className="text-2xl">🏥</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-100">Bloodhound Home Health</h1>
        <p className="text-sm text-slate-400 mt-1">Enter your assigned PIN</p>

        {/* PIN dots */}
        <div className="mt-6 flex justify-center gap-4">
          {[0,1,2,3].map(i => (
            <div key={i} className={`h-4 w-4 rounded-full border-2 transition-all ${
              i < pin.length
                ? "bg-blue-400 border-blue-400"
                : "bg-transparent border-slate-600"
            }`} />
          ))}
        </div>

        {/* Status */}
        <div className={`mt-2 text-xs h-5 ${status?.color ?? "text-slate-400"}`}>
          {status?.msg ?? ""}
        </div>

        {/* Keypad */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {digits.map((d) => {
            const isCLR = d === "CLR";
            const isBK  = d === "⌫";
            return (
              <button
                key={d}
                onClick={() => isCLR ? clear() : isBK ? backspace() : pressDigit(d)}
                className={`rounded-2xl border py-4 text-xl font-semibold transition-all active:scale-95
                  ${isCLR || isBK
                    ? "border-slate-700 bg-slate-950/40 text-slate-400 hover:bg-slate-800 text-sm"
                    : "border-slate-700 bg-slate-950/30 text-slate-100 hover:bg-slate-800"
                  }`}
              >
                {d}
              </button>
            );
          })}
        </div>

        {/* Demo hint */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-left">
          <div className="text-xs text-slate-500 font-semibold mb-1">Demo PINs</div>
          <div className="text-xs text-slate-400">Taylor Smith (Nurse) — <span className="font-mono text-slate-300">1234</span></div>
          <div className="text-xs text-slate-400">Jordan Lee (Therapist) — <span className="font-mono text-slate-300">5678</span></div>
        </div>

      </div>
    </main>
  );
}
