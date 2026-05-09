import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, MapPin, AlertTriangle, CheckCircle2, Camera, Upload, Brain, ShieldAlert, Wrench, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { analyzeImage, type GeminiAnalysis } from "@/lib/gemini";

const priorityColor: Record<string, string> = {
  EMERGENCY: "text-red-400",
  PRIORITY: "text-orange-400",
  ROUTINE: "text-purple-400",
};

interface Assignment {
  id: string;
  component: string;
  componentId: string;
  componentType: string;
  componentCII: string;
  componentStatus: string;
  engineer: string;
  deadline: string;
  status: string;
  assignedBy: string;
  timestamp: string;
  broadcastTo?: string[];
  acceptedBy?: string | null;
  declinedBy?: string[];
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
  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [myAssignments, setMyAssignments] = useState<Assignment[]>([]);
  const [pendingBroadcasts, setPendingBroadcasts] = useState<Assignment[]>([]);

  useEffect(() => {
    if (!user) return;
    const engineerName = user.engineerName ?? user.username;
    
    const unsubscribe = onSnapshot(collection(db, "assignments"), (snapshot) => {
      const assignments: Assignment[] = [];
      snapshot.forEach((doc) => {
        assignments.push({ id: doc.id, ...doc.data() } as Assignment);
      });
      
      // Filter for accepted tasks assigned to this engineer
      setMyAssignments(assignments.filter(a => 
        a.engineer === engineerName && a.status === "In Progress"
      ));
      
      // Filter for pending broadcast tasks that this engineer can accept
      setPendingBroadcasts(assignments.filter(a => 
        a.status === "Pending Acceptance" && 
        a.broadcastTo?.includes(engineerName) &&
        !a.declinedBy?.includes(engineerName)
      ));
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Active task that was accepted
  const activeTask = myAssignments.find(a => a.status === "In Progress");
  // Pending broadcast task that can be accepted or declined
  const pendingTask = pendingBroadcasts[0]; // Show first available broadcast

  // Extract component ID from the VISTA label format "TRK-BNG-MJ-001 (ERC Clip)"
  const getComponentId = (label: string) => {
    if (!label) return "Unknown";
    return label.split(" ")[0];
  };

  const getComponentType = (label: string) => {
    if (!label || !label.includes("(")) return "Component";
    return label.substring(label.indexOf("(") + 1, label.indexOf(")"));
  };

  const taskComp = activeTask ? {
    componentId: getComponentId(activeTask.component),
    type: getComponentType(activeTask.component),
    location: "Unknown Location",
    ciiScore: 60
  } : null;

  const handleAccept = async (broadcastId: string) => {
    if (!user) return;
    const engineerName = user.engineerName ?? user.username;
    
    try {
      await updateDoc(doc(db, "assignments", broadcastId), {
        status: "In Progress",
        engineer: engineerName,
        acceptedBy: engineerName,
        acceptedAt: new Date().toISOString()
      });
      toast({ title: "Task accepted! You can now complete it." });
    } catch (err) {
      toast({ title: "Failed to accept task", variant: "destructive" });
    }
  };
  
  const handleDecline = async (broadcastId: string) => {
    if (!user) return;
    const engineerName = user.engineerName ?? user.username;
    
    try {
      const broadcastDoc = doc(db, "assignments", broadcastId);
      await updateDoc(broadcastDoc, {
        declinedBy: [...(pendingBroadcasts.find(b => b.id === broadcastId)?.declinedBy || []), engineerName]
      });
      toast({ title: "Task declined. Next task will be shown." });
    } catch (err) {
      toast({ title: "Failed to decline task", variant: "destructive" });
    }
  };

  const analyzeSteps = [
    "Uploading field photo to VISTA AI...",
    "Scanning for surface defects & wear patterns...",
    "Running Gemini Vision analysis...",
    "Calculating safety risk & lifespan...",
  ];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPhoto(dataUrl);
      setAnalysis(null);
      setAnalyzing(true);
      setAnalyzeStep(0);

      // Step-through the loading messages
      const stepInterval = setInterval(() => {
        setAnalyzeStep(prev => {
          if (prev >= analyzeSteps.length - 1) {
            clearInterval(stepInterval);
            return prev;
          }
          return prev + 1;
        });
      }, 850);

      // Wait 3.5 seconds before actually calling the API
      await new Promise(resolve => setTimeout(resolve, 3500));
      clearInterval(stepInterval);

      try {
        const context = activeTask
          ? `Component: ${activeTask.componentId}, Type: ${activeTask.componentType}, CII: ${activeTask.componentCII}, Status: ${activeTask.componentStatus}`
          : undefined;
        const result = await analyzeImage(dataUrl, context);
        setAnalysis(result);
        toast({ title: "AI Analysis Complete", description: result.summary });
      } catch (err) {
        toast({ title: "AI Analysis Failed", description: String(err), variant: "destructive" });
      } finally {
        setAnalyzing(false);
        setAnalyzeStep(0);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!activeTask) return;
    setSubmitting(true);
    
    try {
      await updateDoc(doc(db, "assignments", activeTask.id), {
        status: "Completed",
        engineerFeedback: feedback,
        ...(photo ? { photoData: photo } : {}),
        ...(analysis ? { aiAnalysis: { condition: analysis.condition, confidence: analysis.confidence, summary: analysis.summary, defects: analysis.defects, recommendations: analysis.recommendations, safetyRisk: analysis.safetyRisk } } : {})
      });
      setCompleted(true);
      toast({ title: "Task completed successfully!" });
    } catch (err) {
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
                    <AlertTriangle className={cn("w-5 h-5", pendingTask.componentStatus?.includes('CRITICAL') ? "text-red-400" : "text-orange-400")} />
                    <span className={cn("text-sm font-display font-black tracking-wider uppercase", pendingTask.componentStatus?.includes('CRITICAL') ? "text-red-400" : "text-orange-400")}>
                      {pendingTask.componentStatus || "PRIORITY"}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground border border-white/10 px-2 py-1 rounded">
                    {new Date(pendingTask.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <h3 className="text-xl font-display font-black text-white mb-1">
                  {pendingTask.componentId || pendingTask.component}
                </h3>
                <p className="text-sm text-muted-foreground">{pendingTask.componentType || "Component"}</p>
                <div className="flex items-center gap-1.5 mt-3 text-sm text-white/70">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  Location: See dispatch details
                </div>
                <div className="mt-3 bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Deadline: {pendingTask.deadline}</p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="text-xs font-mono">CII Score:</div>
                  <span className="text-sm font-display font-bold"
                    style={{ color: Number(pendingTask.componentCII ?? 0) <= 30 ? "hsl(0 79% 50%)" : "hsl(25 95% 53%)" }}>
                    {pendingTask.componentCII || "N/A"}
                  </span>
                </div>
              </div>
              <div className="flex">
                <button onClick={() => handleDecline(pendingTask.id)}
                  className="flex-1 py-4 text-sm font-display font-bold uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-all border-r border-white/8">
                  Decline
                </button>
                <button onClick={() => handleAccept(pendingTask.id)}
                  className="flex-1 py-4 text-sm font-display font-bold uppercase tracking-widest text-white transition-all"
                  style={{ background: "hsl(0 82% 58% / 0.2)" }}>
                  <span style={{ color: "hsl(0 82% 58%)" }}>Accept Task</span>
                </button>
              </div>
            </div>
            {pendingBroadcasts.length > 1 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                +{pendingBroadcasts.length - 1} more task(s) available after response
              </p>
            )}
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

              {/* AI Analysis Section — only shown after photo is uploaded */}
              {analyzing && (
                <div className="mt-4 border border-purple-500/30 rounded-xl p-5 bg-purple-500/5">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin flex-shrink-0" />
                    <span className="text-sm font-display font-bold text-purple-400 uppercase tracking-widest">Analyzing with Gemini AI</span>
                  </div>
                  {/* Animated step progress */}
                  <div className="space-y-2">
                    {analyzeSteps.map((step, i) => (
                      <div key={i} className={`flex items-center gap-2 transition-all duration-500 ${
                        i < analyzeStep ? "opacity-100" : i === analyzeStep ? "opacity-100" : "opacity-25"
                      }`}>
                        {i < analyzeStep ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        ) : i === analyzeStep ? (
                          <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin flex-shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0" />
                        )}
                        <p className={`text-xs font-mono ${
                          i <= analyzeStep ? "text-white/80" : "text-white/30"
                        }`}>{step}</p>
                      </div>
                    ))}
                  </div>
                  {/* Scanning bar animation */}
                  <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{ width: `${((analyzeStep + 1) / analyzeSteps.length) * 100}%`, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              )}

              {analysis && !analyzing && (
                <div className="mt-4 border rounded-xl overflow-hidden" style={{ borderColor: analysis.condition === 'CRITICAL' ? 'hsl(0 79% 50% / 0.5)' : analysis.condition === 'DAMAGED' ? 'hsl(25 95% 53% / 0.5)' : analysis.condition === 'WORN' ? 'hsl(45 93% 47% / 0.5)' : 'hsl(142 71% 45% / 0.5)', background: 'linear-gradient(135deg, hsl(270 28% 6%), hsl(250 28% 8%))' }}>
                  <div className="p-4 border-b border-white/8">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-display font-bold text-purple-400 uppercase tracking-widest">VISTA AI Analysis</span>
                      </div>
                      <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: analysis.condition === 'CRITICAL' ? 'hsl(0 79% 50% / 0.2)' : analysis.condition === 'DAMAGED' ? 'hsl(25 95% 53% / 0.2)' : analysis.condition === 'WORN' ? 'hsl(45 93% 47% / 0.2)' : 'hsl(142 71% 45% / 0.2)', color: analysis.condition === 'CRITICAL' ? 'hsl(0 79% 63%)' : analysis.condition === 'DAMAGED' ? 'hsl(25 95% 63%)' : analysis.condition === 'WORN' ? 'hsl(45 93% 60%)' : 'hsl(142 71% 55%)' }}>
                        {analysis.condition} — {analysis.confidence}%
                      </span>
                    </div>
                    <p className="text-sm text-white/80">{analysis.summary}</p>
                  </div>

                  {analysis.defects.length > 0 && (
                    <div className="p-4 border-b border-white/8">
                      <p className="text-xs font-display font-semibold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" />Defects Found</p>
                      <ul className="space-y-1">{analysis.defects.map((d, i) => <li key={i} className="text-xs text-white/70 flex items-start gap-1.5"><span className="text-red-400 mt-0.5">•</span>{d}</li>)}</ul>
                    </div>
                  )}

                  {analysis.recommendations.length > 0 && (
                    <div className="p-4 border-b border-white/8">
                      <p className="text-xs font-display font-semibold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Wrench className="w-3 h-3" />Recommendations</p>
                      <ul className="space-y-1">{analysis.recommendations.map((r, i) => <li key={i} className="text-xs text-white/70 flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">›</span>{r}</li>)}</ul>
                    </div>
                  )}

                  <div className="p-4 flex items-center gap-2">
                    <ShieldAlert className={cn("w-4 h-4", analysis.safetyRisk === 'HIGH' ? 'text-red-400' : analysis.safetyRisk === 'MEDIUM' ? 'text-orange-400' : 'text-green-400')} />
                    <span className="text-xs font-display font-bold uppercase tracking-wider" style={{ color: analysis.safetyRisk === 'HIGH' ? 'hsl(0 79% 63%)' : analysis.safetyRisk === 'MEDIUM' ? 'hsl(25 95% 63%)' : 'hsl(142 71% 55%)' }}>Safety Risk: {analysis.safetyRisk}</span>
                  </div>
                </div>
              )}
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
