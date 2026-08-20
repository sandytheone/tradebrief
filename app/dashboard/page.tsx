"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  TrendingUp, 
  PieChart, 
  Briefcase, 
  BellRing, 
  ShieldCheck, 
  ArrowUpRight, 
  RefreshCw,
  Building2,
  CheckCircle2,
  AlertCircle,
  X
} from "lucide-react";

interface ArchetypeWeighting {
  archetype: string;
  percentage: number;
}

interface Holding {
  id: string;
  ticker: string;
  shares: number;
  avgCostBasis: number;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  profile: {
    weightings: ArchetypeWeighting[];
  };
  holdings: Holding[];
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const userId = searchParams.get("userId");
  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");

  const [data, setData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Banner state
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchDashboard = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/profile?userId=${userId}`);
      if (!res.ok) return;
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [userId]);

  // Handle URL Notification Parameters
  useEffect(() => {
    if (connectedParam === "true") {
      setBanner({
        type: "success",
        message: "Charles Schwab account successfully connected and holdings synced!",
      });
      cleanUrlParams();
    } else if (errorParam) {
      const errorMessages: Record<string, string> = {
        missing_user: "Authentication error: Missing User ID.",
        no_connection: "No active brokerage connection was found.",
        sync_failed: "Failed to sync holdings with Charles Schwab. Please try again.",
      };
      setBanner({
        type: "error",
        message: errorMessages[errorParam] || "An unexpected error occurred during authorization.",
      });
      cleanUrlParams();
    }
  }, [connectedParam, errorParam]);

  const cleanUrlParams = () => {
    if (!userId) return;
    // Clean status flags from URL while retaining active userId
    const newUrl = `/dashboard?userId=${userId}`;
    window.history.replaceState({ path: newUrl }, "", newUrl);
  };

  const handleConnectSchwab = async () => {
    setConnecting(true);
    setBanner(null);
    try {
      const res = await fetch("/api/brokerage/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId || "demo-user-123" }),
      });

      const text = await res.text();

      if (!res.ok) {
        let errorMessage = text;
        try {
          const parsed = JSON.parse(text);
          errorMessage = parsed.error || JSON.stringify(parsed);
        } catch {
          // Body was plain text or HTML
        }
        setBanner({
          type: "error",
          message: `Connection Error (${res.status}): ${errorMessage}`,
        });
        return;
      }

      const responseData = JSON.parse(text);
      const redirect = responseData.redirectUrl || responseData.redirectURI;
      if (redirect) {
        window.location.href = redirect;
      }
    } catch (err) {
      console.error("Connection error:", err);
      setBanner({
        type: "error",
        message: "Failed to start connection process. Check network connectivity.",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncHoldings = async () => {
    if (!userId) {
      setBanner({
        type: "error",
        message: "No active User ID found in session.",
      });
      return;
    }

    setSyncing(true);
    setBanner(null);
    try {
      const res = await fetch("/api/brokerage/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      
      const result = await res.json();
      if (result.success) {
        await fetchDashboard();
        setBanner({
          type: "success",
          message: "Holdings refreshed successfully.",
        });
      } else {
        setBanner({
          type: "error",
          message: result.error || "Failed to sync holdings.",
        });
      }
    } catch (err) {
      console.error("Sync error:", err);
      setBanner({
        type: "error",
        message: "Network error encountered while syncing positions.",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-400">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading your portfolio digest...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              TradeBrief AI
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800">
              <BellRing className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-slate-800" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                {data?.name ? data.name[0].toUpperCase() : "U"}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-white">{data?.name || "Investor"}</p>
                <p className="text-[10px] text-slate-400">{data?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Dynamic Status Notification Banner */}
        {banner && (
          <div
            className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
              banner.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-3">
              {banner.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <p className="text-sm font-medium">{banner.message}</p>
            </div>
            <button
              onClick={() => setBanner(null)}
              className="p-1 hover:bg-white/10 rounded-lg transition text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Welcome Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Portfolio Overview</h1>
            <p className="text-sm text-slate-400 mt-1">
              Real-time digest tailored to your investor archetype allocations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncHoldings}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Schwab"}
            </button>

            <button
              onClick={handleConnectSchwab}
              disabled={connecting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition shadow-lg shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              {connecting ? "Redirecting..." : "Connect Charles Schwab"}
            </button>
          </div>
        </div>

        {/* Top Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Total Positions</span>
              <Briefcase className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">{data?.holdings?.length || 0} Assets</p>
            <p className="text-xs text-slate-400">Active holdings in account</p>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Primary Strategy</span>
              <PieChart className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {data?.profile?.weightings?.[0]?.archetype || "GROWTH"}
            </p>
            <p className="text-xs text-slate-400">Weighted allocation model</p>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Brokerage Sync</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400">
              {data?.holdings && data.holdings.length > 0 ? "Connected" : "Pending Connection"}
            </p>
            <p className="text-xs text-slate-400">Charles Schwab via SnapTrade</p>
          </div>
        </div>

        {/* Strategy Matrix & Archetype Allocation */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <h2 className="text-lg font-semibold text-white">Investor Archetype Weighting</h2>
          <div className="space-y-4">
            {data?.profile?.weightings?.map((w, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-300">{w.archetype}</span>
                  <span className="text-blue-400 font-bold">{w.percentage}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${w.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Holdings Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Live Portfolio Holdings</h2>
            <span className="text-xs text-slate-400">{data?.holdings?.length || 0} Assets</span>
          </div>

          <div className="overflow-x-auto">
            {data?.holdings && data.holdings.length > 0 ? (
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/50 text-xs uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3 font-medium">Ticker</th>
                    <th className="px-6 py-3 font-medium">Shares</th>
                    <th className="px-6 py-3 font-medium">Avg Cost</th>
                    <th className="px-6 py-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.holdings.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-bold text-white">{h.ticker}</td>
                      <td className="px-6 py-4">{h.shares}</td>
                      <td className="px-6 py-4">${h.avgCostBasis.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ArrowUpRight className="w-3 h-3" /> Synced
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center space-y-3">
                <p className="text-sm text-slate-400">
                  No Schwab holdings linked yet. Click "Connect Charles Schwab" above to authorize.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}