"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [growth, setGrowth] = useState(50);
  const [value, setValue] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const total = Number(growth) + Number(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (total !== 100) {
      setError("Archetype percentages must sum to 100%");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Create the user
      const userRes = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const user = await userRes.json();

      if (!userRes.ok) throw new Error(user.error || "Failed to create user");

      // 2. Save the investor archetype profile
      const profileRes = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          weightings: [
            { archetype: "GROWTH", percentage: Number(growth) },
            { archetype: "VALUE", percentage: Number(value) },
          ],
        }),
      });

      if (!profileRes.ok) throw new Error("Failed to save investor profile");

      // Redirect to dashboard on success
      router.push(`/dashboard?userId=${user.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded-xl shadow-md border border-slate-200">
      <h1 className="text-2xl font-bold mb-4 text-slate-800">New Investor Setup</h1>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input
            type="text"
            required
            className="w-full border p-2 rounded-lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email Address</label>
          <input
            type="email"
            required
            className="w-full border p-2 rounded-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
          />
        </div>

        <div className="border-t pt-4">
          <label className="block text-sm font-semibold mb-2">
            Strategy Allocation (Total: {total}%)
          </label>

          <div className="space-y-3">
            <div>
              <span className="text-sm">Growth Archetype: {growth}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={growth}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setGrowth(val);
                  setValue(100 - val);
                }}
                className="w-full"
              />
            </div>

            <div>
              <span className="text-sm">Value Archetype: {value}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setValue(val);
                  setGrowth(100 - val);
                }}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Save & View Dashboard"}
        </button>
      </form>
    </div>
  );
}