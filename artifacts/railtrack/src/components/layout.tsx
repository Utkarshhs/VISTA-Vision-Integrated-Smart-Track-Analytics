import { useState, createContext, useContext } from "react";
import { Link, useLocation } from "wouter";
import { Activity, AlertTriangle, LayoutDashboard, Cpu, Search, Menu, User, Briefcase, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type Role = "Regional Controller" | "Hub Supervisor" | "Field Engineer";

interface AppContextType {
  role: Role;
  setRole: (role: Role) => void;
}

export const AppContext = createContext<AppContextType>({
  role: "Regional Controller",
  setRole: () => {},
});

export const useAppContext = () => useContext(AppContext);

export function Layout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("Regional Controller");
  const [location] = useLocation();

  const navigation = [
    { name: "Command Center", href: "/", icon: LayoutDashboard },
    { name: "Component Registry", href: "/components", icon: Cpu },
    { name: "Dispatch Console", href: "/alerts", icon: AlertTriangle },
    { name: "Inspection Log", href: "/inspections", icon: Activity },
    { name: "Gemini Inspector", href: "/gemini", icon: Eye },
  ];

  return (
    <AppContext.Provider value={{ role, setRole }}>
      <div className="flex h-screen w-full bg-background overflow-hidden text-foreground selection:bg-primary/30">
        {/* Sidebar */}
        <div className="hidden md:flex w-64 flex-col glass-panel border-r border-white/5 relative z-10">
          <div className="p-6">
            <h1 className="text-xl font-display font-bold text-white tracking-widest flex items-center gap-2">
              <div className="w-4 h-4 bg-primary rounded-sm animate-pulse shadow-[0_0_10px_rgba(0,255,255,0.5)]"></div>
              RAILTRACK<span className="text-primary">-AI</span>
            </h1>
            <div className="mt-2 text-xs text-muted-foreground font-mono">BENGALURU METRO CORRIDOR</div>
          </div>
          
          <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all duration-200 group relative overflow-hidden",
                      isActive 
                        ? "bg-primary/10 text-primary border border-primary/20" 
                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_8px_rgba(0,255,255,0.8)]"></div>
                    )}
                    <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-white")} />
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-white/5">
            <div className="bg-black/40 rounded-lg p-3 border border-white/5">
              <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">System Status</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-nominal shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>
                <span className="text-sm font-medium text-nominal font-display">NOMINAL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none"></div>
          
          <header className="h-16 glass-panel border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-10 relative">
            <div className="md:hidden flex items-center">
              <h1 className="text-lg font-display font-bold text-white">RAILTRACK<span className="text-primary">-AI</span></h1>
            </div>
            
            <div className="hidden md:flex items-center text-sm text-muted-foreground">
              <Briefcase className="w-4 h-4 mr-2" />
              Active View: 
              <span className="ml-2 text-white font-medium bg-white/10 px-2 py-1 rounded">{role}</span>
            </div>

            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-black/50 border-white/10 hover:bg-white/10 hover:text-white transition-colors">
                    <User className="w-4 h-4 mr-2 text-primary" />
                    <span className="font-display">{role}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-white/10 text-white">
                  <DropdownMenuItem onClick={() => setRole("Regional Controller")} className="cursor-pointer focus:bg-white/10">
                    Regional Controller
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRole("Hub Supervisor")} className="cursor-pointer focus:bg-white/10">
                    Hub Supervisor
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRole("Field Engineer")} className="cursor-pointer focus:bg-white/10">
                    Field Engineer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 md:p-6 z-10 relative">
            {children}
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}
