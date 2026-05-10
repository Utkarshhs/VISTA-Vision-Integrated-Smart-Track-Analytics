import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Local credential store — no backend required
const CREDENTIALS: Record<string, { password: string; role: "engineer"; engineerName?: string }> = {
  // Majestic Hub
  priya:    { password: "eng123", role: "engineer", engineerName: "Priya Menon" },
  kavitha:  { password: "eng123", role: "engineer", engineerName: "Kavitha Reddy" },
  raj:      { password: "eng123", role: "engineer", engineerName: "Raj Kumar" },
  ananya:   { password: "eng123", role: "engineer", engineerName: "Ananya Krishnan" },
  rohan:    { password: "eng123", role: "engineer", engineerName: "Rohan Pillai" },
  // Yeshwantpur Hub
  suresh:   { password: "eng123", role: "engineer", engineerName: "Suresh Babu" },
  deepak:   { password: "eng123", role: "engineer", engineerName: "Deepak Rao" },
  meena:    { password: "eng123", role: "engineer", engineerName: "Meena Iyer" },
  // KR Puram Hub
  kiran:    { password: "eng123", role: "engineer", engineerName: "Kiran Reddy" },
  aditya:   { password: "eng123", role: "engineer", engineerName: "Aditya Shetty" },
};

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [, navigate] = useLocation();

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    const key = username.trim().toLowerCase();
    const cred = CREDENTIALS[key];

    if (!cred) {
      setError("Invalid username.");
      setLoading(false);
      return;
    }
    if (cred.password !== password) {
      setError("Incorrect password.");
      setLoading(false);
      return;
    }

    await login({
      id: 1,
      username: key,
      role: cred.role,
      engineerId: 1,
      engineerName: cred.engineerName ?? key,
    });
    navigate("/engineer");
    setLoading(false);
  };

  const fillDemo = () => {
    setUsername("priya"); setPassword("eng123");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_40%,_rgba(220,38,38,0.08),_transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_50%_40%,_rgba(139,0,0,0.05),_transparent)]" />
      </div>

      <div className="w-full max-w-sm px-6 relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-display font-black tracking-widest mb-2"
            style={{ color: "hsl(0 82% 58%)", textShadow: "0 0 30px hsl(0 82% 58% / 0.7), 0 0 60px hsl(0 82% 58% / 0.3)" }}>
            VISTA
          </h1>
          <p className="text-[10px] text-muted-foreground font-mono tracking-[0.2em] uppercase">
            Field Engineer Access
          </p>
        </div>

        <div className="bg-white/3 border border-white/8 rounded-xl p-6 backdrop-blur-sm">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider block mb-1.5">Engineer ID</label>
              <Input value={username} onChange={e => setUsername(e.target.value)}
                placeholder="e.g. priya, suresh, kiran"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary"
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider block mb-1.5">Password</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary"
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>

            {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

            <Button onClick={handleLogin} disabled={loading} className="w-full font-display tracking-widest uppercase"
              style={{ background: "hsl(0 82% 58%)", color: "white" }}>
              {loading ? "Authenticating..." : "Access System"}
            </Button>

            <button onClick={fillDemo} className="w-full text-xs text-muted-foreground hover:text-white/50 font-mono transition-colors text-center">
              Fill demo credentials
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/40 font-mono mt-6 tracking-wider">
          Majestic: priya, kavitha, raj, ananya, rohan · Yeshwantpur: suresh, deepak, meena · KR Puram: kiran, aditya<br/>pass: eng123
        </p>
      </div>
    </div>
  );
}
