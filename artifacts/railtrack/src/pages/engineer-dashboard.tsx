import { useState, useRef } from "react";
import { useListAlerts, useListComponents } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, MapPin, AlertTriangle, CheckCircle2, Camera, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const priorityColor: Record<string, string> = {
  EMERGENCY: "text-red-400",
  PRIORITY: "text-orange-400",
  ROUTINE: "text-purple-400",
};

interface Alert {
  id: number;
  componentId: number;
  hubId: number;
  engineerId?: number | null;
  priority: string;
  status: string;
  notes?: string | null;
  createdAt: string;
}

export default function EngineerDashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const { data: allAlerts = [], isLoading, refetch } = useListAlerts();
  const { data: components = [] } = useListComponents();

  const myAlerts = allAlerts.filter((a: Alert) => a.engineerId === user?.engineerId);
  const pendingTask = myAlerts.find((a: Alert) => a.status === "DISPATCHED") as Alert | undefined;
  const activeTask = myAlerts.find((a: Alert) => a.status === "IN_PROGRESS") as Alert | undefined;

  const taskComp = activeTask
    ? components.find(c => c.id === activeTask.componentId)
    : pendingTask
    ? components.find(c => c.id === pendingTask.componentId)
    : null;

  const handleAccept = async () => {
    if (!pendingTask) return;
    const res = await fetch(`/api/alerts/${pendingTask.id}/accept`, { method: "POST" });
    if (res.ok) { refetch(); toast({ title: "Task accepted! Head to the location." }); }
    else toast({ title: "Failed to accept", variant: "destructive" });
  };

  const handleDecline = async () => {
    if (!pendingTask) return;
    const res = await fetch(`/api/alerts/${pendingTask.id}/decline`, { method: "POST" });
    if (res.ok) { refetch(); toast({ title: "Task declined." }); }
    else toast({ title: "Failed to decline", variant: "destructive" });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!activeTask || !user?.engineerId) return;
    setSubmitting(true);
    const res = await fetch(`/api/alerts/${activeTask.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ engineerId: user.engineerId, feedback, photoBase64: photo }),
    });
    if (res.ok) {
      setCompleted(true);
      refetch();
    } else {
      toast({ title: "Submission failed", variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-black/20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl font-display font-black tracking-widest"
            style={{ color: "hsl(0 82% 58%)", textShadow: "0 0 16px hsl(0 82% 58% / 0.7)" }}>VISTA</span>
          <span className="text-xs font-mono text-muted-foreground border border-white/10 px-2 py-0.5 rounded">FIELD ENGINEER</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-white">{user?.engineerName ?? user?.username}</p>
            <p className="text-[10px] text-muted-foreground font-mono">ID: {user?.username}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-white">
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        {isLoading && (
          <div className="w-full max-w-md space-y-4">
            <Skeleton className="h-48 w-full bg-white/5" />
          </div>
        )}

        {!isLoading && completed && (
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 rounded-full bg-green-900/30 border border-green-600/50 flex items-center justify-center mx-auto mb-6"
              style={{ boxShadow: "0 0 30px hsl(160 84% 39% / 0.3)" }}>
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-display font-black text-green-400 tracking-wider mb-2">TASK COMPLETED</h2>
            <p className="text-muted-foreground text-sm mb-6">Your repair has been logged. The railway control team will review the analysis.</p>
            <Button onClick={() => { setCompleted(false); setPhoto(null); setFeedback(""); }}
              variant="outline" className="border-white/10 text-white hover:bg-white/5 font-display uppercase tracking-wider text-sm">
              Back to Dashboard
            </Button>
          </div>
        )}

        {!isLoading && !completed && !pendingTask && !activeTask && (
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-display font-bold text-white tracking-wider mb-2">All Clear</h2>
            <p className="text-muted-foreground text-sm">No tasks assigned to you right now. You're on standby.</p>
          </div>
        )}

        {!isLoading && !completed && pendingTask && !activeTask && (
          <div className="w-full max-w-md">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest text-center mb-4">Incoming Task Request</p>
            <div className="border rounded-2xl overflow-hidden" style={{ borderColor: "hsl(0 82% 58% / 0.4)", background: "linear-gradient(135deg, hsl(0 28% 8%), hsl(270 28% 7%))", boxShadow: "0 0 40px hsl(0 82% 58% / 0.1)" }}>
              <div className="p-5 border-b border-white/8">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={cn("w-5 h-5", priorityColor[pendingTask.priority])} />
                    <span className={cn("text-sm font-display font-black tracking-wider uppercase", priorityColor[pendingTask.priority])}>
                      {pendingTask.priority}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground border border-white/10 px-2 py-1 rounded">
                    {new Date(pendingTask.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <h3 className="text-xl font-display font-black text-white mb-1">
                  {taskComp?.componentId ?? `Component #${pendingTask.componentId}`}
                </h3>
                <p className="text-sm text-muted-foreground">{taskComp?.type}</p>
                {taskComp?.location && (
                  <div className="flex items-center gap-1.5 mt-3 text-sm text-white/70">
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                    {taskComp.location}
                  </div>
                )}
                {pendingTask.notes && (
                  <div className="mt-3 bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{pendingTask.notes}</p>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <div className="text-xs font-mono">CII Score:</div>
                  <span className="text-sm font-display font-bold"
                    style={{ color: Number(taskComp?.ciiScore ?? 0) <= 30 ? "hsl(0 79% 50%)" : "hsl(25 95% 53%)" }}>
                    {Number(taskComp?.ciiScore ?? 0).toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="flex">
                <button onClick={handleDecline}
                  className="flex-1 py-4 text-sm font-display font-bold uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-all border-r border-white/8">
                  Decline
                </button>
                <button onClick={handleAccept}
                  className="flex-1 py-4 text-sm font-display font-bold uppercase tracking-widest text-white transition-all"
                  style={{ background: "hsl(0 82% 58% / 0.2)" }}>
                  <span style={{ color: "hsl(0 82% 58%)" }}>Accept Task</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !completed && activeTask && (
          <div className="w-full max-w-md space-y-5">
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-1">Active Task</p>
              <h2 className="text-xl font-display font-black text-white">{taskComp?.componentId ?? `#${activeTask.componentId}`}</h2>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                {taskComp?.location ?? "Location unknown"}
              </div>
            </div>

            <div className="bg-white/3 border border-white/8 rounded-xl p-4">
              <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <Camera className="w-3.5 h-3.5" /> Upload Repair Photo
              </p>
              {photo ? (
                <div className="relative">
                  <img src={photo} alt="Repair" className="w-full h-48 object-cover rounded-lg" />
                  <button onClick={() => setPhoto(null)}
                    className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">Remove</button>
                </div>
              ) : (
                <div onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-white/15 rounded-xl h-36 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
                  <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Tap to upload photo</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">JPG, PNG up to 10MB</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>

            <div className="bg-white/3 border border-white/8 rounded-xl p-4">
              <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-widest mb-3">Engineer Feedback</p>
              <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
                placeholder="Describe what was wrong and how it was fixed..."
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-primary/50 h-28" />
            </div>

            <Button onClick={handleSubmit} disabled={submitting || !feedback.trim()}
              className="w-full font-display uppercase tracking-widest h-12"
              style={{ background: "hsl(0 82% 58%)" }}>
              {submitting ? "Submitting..." : "Submit Completion"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
