import { useState } from "react";
import { useListAlerts, useListComponents, useListEngineers, useUpdateAlert } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, MapPin, Clock, CheckCircle2, LogOut, Activity, Cpu, Zap, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const priorityColor: Record<string, string> = {
  EMERGENCY: "bg-red-900/40 border-red-600/60 text-red-300",
  PRIORITY: "bg-orange-900/30 border-orange-600/50 text-orange-300",
  ROUTINE: "bg-purple-900/30 border-purple-600/40 text-purple-300",
};
const statusColor: Record<string, string> = {
  PENDING: "bg-yellow-900/40 text-yellow-300 border-yellow-700/50",
  DISPATCHED: "bg-blue-900/40 text-blue-300 border-blue-700/50",
  IN_PROGRESS: "bg-purple-900/40 text-purple-300 border-purple-700/50",
  RESOLVED: "bg-green-900/40 text-green-300 border-green-700/50",
  CANCELLED: "bg-gray-900/40 text-gray-400 border-gray-700/50",
};

interface AnalysisResult {
  summary: string;
  estimatedNewCii: number;
  dangerReductionPct: number;
  repairQuality: string;
}

export default function RailwayDashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"active" | "resolved">("active");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [assignEngineerId, setAssignEngineerId] = useState<string>("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const { toast } = useToast();

  const { data: alerts = [], isLoading: loadingAlerts, refetch: refetchAlerts } = useListAlerts();
  const { data: components = [] } = useListComponents();
  const { data: engineers = [] } = useListEngineers();
  const updateAlert = useUpdateAlert();

  const activeAlerts = alerts.filter(a => a.status !== "RESOLVED" && a.status !== "CANCELLED");
  const resolvedAlerts = alerts.filter(a => a.status === "RESOLVED");
  const shown = activeTab === "active" ? activeAlerts : resolvedAlerts;
  const selected = alerts.find(a => a.id === selectedId);
  const selectedComp = selected ? components.find(c => c.id === selected.componentId) : null;
  const selectedEngineer = selected?.engineerId ? engineers.find(e => e.id === selected.engineerId) : null;

  const handleAssign = async () => {
    if (!selected || !assignEngineerId) return;
    setAssigning(true);
    updateAlert.mutate({ id: selected.id, data: { engineerId: parseInt(assignEngineerId), status: "DISPATCHED" } }, {
      onSuccess: () => { toast({ title: "Engineer dispatched" }); refetchAlerts(); setAssigning(false); },
      onError: () => { toast({ title: "Dispatch failed", variant: "destructive" }); setAssigning(false); },
    });
  };

  const handleAnalyze = async () => {
    if (!selected) return;
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch(`/api/alerts/${selected.id}/analyze-repair`, { method: "POST" });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json() as AnalysisResult;
      setAnalysis(data);
    } catch {
      toast({ title: "Analysis failed", variant: "destructive" });
    }
    setAnalyzing(false);
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-black/20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl font-display font-black tracking-widest"
            style={{ color: "hsl(0 82% 58%)", textShadow: "0 0 16px hsl(0 82% 58% / 0.7)" }}>VISTA</span>
          <span className="text-xs font-mono text-muted-foreground border border-white/10 px-2 py-0.5 rounded">RAILWAY CONTROL</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-mono">{user?.username}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-white">
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 flex-shrink-0 border-r border-white/5 flex flex-col bg-black/10">
          <div className="flex border-b border-white/5">
            {(["active", "resolved"] as const).map(t => (
              <button key={t} onClick={() => { setActiveTab(t); setSelectedId(null); setAnalysis(null); }}
                className={cn("flex-1 py-3 text-xs font-display font-semibold uppercase tracking-widest transition-all",
                  activeTab === t ? "text-white border-b-2 border-primary" : "text-muted-foreground hover:text-white")}>
                {t === "active" ? `Active (${activeAlerts.length})` : `Resolved (${resolvedAlerts.length})`}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingAlerts && [1,2,3].map(i => <Skeleton key={i} className="h-20 w-full bg-white/5" />)}
            {!loadingAlerts && shown.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-12 font-mono">No {activeTab} alerts</div>
            )}
            {shown.map(alert => {
              const comp = components.find(c => c.id === alert.componentId);
              return (
                <div key={alert.id} onClick={() => { setSelectedId(alert.id); setAnalysis(null); setAssignEngineerId(""); }}
                  className={cn("p-3 rounded-lg border cursor-pointer transition-all",
                    selectedId === alert.id ? "border-primary/60 bg-primary/10" : "border-white/8 bg-white/3 hover:bg-white/5",
                    priorityColor[alert.priority])}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-display font-bold tracking-wider">{alert.priority}</span>
                    <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border", statusColor[alert.status])}>{alert.status}</span>
                  </div>
                  <p className="text-sm font-medium text-white">{comp?.componentId ?? `#${alert.componentId}`}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{comp?.location ?? "Unknown location"}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          {!selected && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-display text-sm tracking-wider">Select an alert to view details</p>
              <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-lg">
                <div className="bg-white/3 border border-white/8 rounded-lg p-4 text-center">
                  <p className="text-2xl font-display font-bold text-red-400">{activeAlerts.filter(a => a.priority === "EMERGENCY").length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Emergency</p>
                </div>
                <div className="bg-white/3 border border-white/8 rounded-lg p-4 text-center">
                  <p className="text-2xl font-display font-bold text-yellow-400">{activeAlerts.filter(a => a.status === "PENDING").length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Pending</p>
                </div>
                <div className="bg-white/3 border border-white/8 rounded-lg p-4 text-center">
                  <p className="text-2xl font-display font-bold text-green-400">{resolvedAlerts.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Resolved</p>
                </div>
              </div>
            </div>
          )}

          {selected && selectedComp && (
            <div className="max-w-2xl space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-bold text-white">{selectedComp.componentId}</h2>
                <div className="flex gap-2">
                  <span className={cn("text-xs font-display font-bold px-3 py-1 rounded border", priorityColor[selected.priority])}>{selected.priority}</span>
                  <span className={cn("text-xs font-mono px-3 py-1 rounded border", statusColor[selected.status])}>{selected.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2"><Cpu className="w-3.5 h-3.5" /> Component</h3>
                  <div className="space-y-2">
                    <div><p className="text-[10px] text-muted-foreground">Type</p><p className="text-sm font-medium">{selectedComp.type}</p></div>
                    <div><p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</p><p className="text-sm font-medium">{selectedComp.location}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Age</p><p className="text-sm font-medium">{selectedComp.ageMonths} months</p></div>
                  </div>
                </div>
                <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> CII Score</h3>
                  <div className="text-center py-2">
                    <p className="text-4xl font-display font-black"
                      style={{ color: Number(selectedComp.ciiScore) <= 30 ? "hsl(0 79% 50%)" : Number(selectedComp.ciiScore) <= 55 ? "hsl(25 95% 53%)" : Number(selectedComp.ciiScore) <= 75 ? "hsl(38 92% 50%)" : "hsl(160 84% 39%)" }}>
                      {Number(selectedComp.ciiScore).toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">/ 100</p>
                    <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${Number(selectedComp.ciiScore)}%`,
                        background: Number(selectedComp.ciiScore) <= 30 ? "hsl(0 79% 50%)" : Number(selectedComp.ciiScore) <= 55 ? "hsl(25 95% 53%)" : Number(selectedComp.ciiScore) <= 75 ? "hsl(38 92% 50%)" : "hsl(160 84% 39%)"
                      }} />
                    </div>
                  </div>
                  <div><p className="text-[10px] text-muted-foreground">Status</p><p className="text-sm font-medium">{selectedComp.ciiStatus}</p></div>
                </div>
              </div>

              {selected.notes && (
                <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-display">Alert Notes</p>
                  <p className="text-sm text-white/80">{selected.notes}</p>
                </div>
              )}

              {selected.engineerId && (
                <div className="bg-white/3 border border-white/8 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary text-xs font-bold">{selectedEngineer?.name?.charAt(0) ?? "E"}</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Assigned Engineer</p>
                    <p className="text-sm font-medium text-white">{selectedEngineer?.name ?? `Engineer #${selected.engineerId}`}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedEngineer?.specialization}</p>
                  </div>
                  {selected.dispatchedAt && (
                    <div className="ml-auto text-right">
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end"><Clock className="w-3 h-3" /> Dispatched</p>
                      <p className="text-xs font-mono">{new Date(selected.dispatchedAt).toLocaleTimeString()}</p>
                    </div>
                  )}
                </div>
              )}

              {selected.status === "PENDING" && (
                <div className="bg-white/3 border border-primary/20 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> Assign Engineer</h3>
                  <div className="flex gap-3">
                    <Select value={assignEngineerId} onValueChange={setAssignEngineerId}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white flex-1">
                        <SelectValue placeholder="Select engineer..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-white/10 text-white">
                        {engineers.filter(e => e.status === "available").map(e => (
                          <SelectItem key={e.id} value={String(e.id)} className="focus:bg-white/10">
                            {e.name} — {e.specialization}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAssign} disabled={!assignEngineerId || assigning}
                      style={{ background: "hsl(0 82% 58%)" }} className="text-white font-display uppercase tracking-wider">
                      {assigning ? "Dispatching..." : "Dispatch"}
                    </Button>
                  </div>
                </div>
              )}

              {selected.status === "RESOLVED" && (
                <div className="bg-white/3 border border-green-600/30 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-display font-semibold text-green-400 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" /> Repair Analysis</h3>
                    <Button onClick={handleAnalyze} disabled={analyzing} size="sm" variant="outline"
                      className="border-green-600/40 text-green-400 hover:bg-green-900/20 text-xs font-display uppercase">
                      {analyzing ? <><RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />Analyzing...</> : "Run Gemini Analysis"}
                    </Button>
                  </div>
                  {analysis && (
                    <div className="space-y-4">
                      <p className="text-sm text-white/80 leading-relaxed">{analysis.summary}</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3 text-center">
                          <p className="text-2xl font-display font-black text-green-400">{analysis.dangerReductionPct}%</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Danger Reduced</p>
                        </div>
                        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 text-center">
                          <p className="text-2xl font-display font-black text-blue-400">{analysis.estimatedNewCii}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">New CII Score</p>
                        </div>
                        <div className={cn("rounded-lg p-3 text-center border",
                          analysis.repairQuality === "EXCELLENT" ? "bg-green-900/20 border-green-700/30" :
                          analysis.repairQuality === "GOOD" ? "bg-blue-900/20 border-blue-700/30" : "bg-yellow-900/20 border-yellow-700/30")}>
                          <p className={cn("text-sm font-display font-black",
                            analysis.repairQuality === "EXCELLENT" ? "text-green-400" :
                            analysis.repairQuality === "GOOD" ? "text-blue-400" : "text-yellow-400")}>{analysis.repairQuality}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Repair Quality</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
