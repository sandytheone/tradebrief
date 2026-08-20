"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [weightings, setWeightings] = useState<{ archetype: string; percentage: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.weightings) setWeightings(data.weightings);
        setLoading(false);
      });
  }, []);

  const handleUpdateWeight = (archetype: string, percentage: number) => {
    setWeightings((prev) =>
      prev.map((w) => (w.archetype === archetype ? { ...w, percentage } : w))
    );
  };

  const totalWeight = weightings.reduce((sum, w) => sum + w.percentage, 0);

  const handleSave = async () => {
    if (totalWeight !== 100) {
      setStatus(`Error: Weightings must sum to 100%. Current total: ${totalWeight}%`);
      return;
    }
    setSaving(true);
    setStatus(null);

    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weightings }),
    });

    setSaving(false);
    if (res.ok) {
      setStatus("Investor Profile updated successfully!");
    } else {
      setStatus("Failed to update profile.");
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Settings & Investor Strategy</h1>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">Adjust Archetype Allocation</h2>
        {status && (
          <div className={`p-3 mb-4 rounded text-sm ${status.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {status}
          </div>
        )}

        {weightings.map((w) => (
          <div key={w.archetype} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
            <span className="font-medium text-slate-700">{w.archetype}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={w.percentage}
                onChange={(e) => handleUpdateWeight(w.archetype, parseInt(e.target.value) || 0)}
                className="w-20 p-2 border rounded-md text-right font-mono text-sm"
              />
              <span className="text-slate-500">%</span>
            </div>
          </div>
        ))}

        <div className="flex justify-between items-center mt-6 pt-4 border-t font-semibold">
          <span>Total Weight:</span>
          <span className={totalWeight === 100 ? "text-emerald-600" : "text-amber-600"}>{totalWeight}%</span>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || totalWeight !== 100}
        className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Update Investor Strategy"}
      </button>
    </div>
  );
}