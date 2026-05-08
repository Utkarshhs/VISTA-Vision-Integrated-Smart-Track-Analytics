import { useListInspections } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Search, ShieldAlert, Cpu, User, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Inspections() {
  const [search, setSearch] = useState("");
  const { data: inspections, isLoading } = useListInspections();

  const filteredInspections = inspections?.filter(i => 
    i.componentId.toString().includes(search) ||
    i.outcome.toLowerCase().includes(search.toLowerCase())
  );

  const getOutcomeStyle = (outcome: string) => {
    switch (outcome) {
      case 'CERTIFIED_HEALTHY': return 'bg-nominal/20 text-nominal border-nominal/30';
      case 'FLAGGED_MODERATE': return 'bg-moderate/20 text-moderate border-moderate/30';
      case 'FLAGGED_CRITICAL': return 'bg-high-risk/20 text-high-risk border-high-risk/30';
      case 'REPLACEMENT_REQUIRED': return 'bg-critical/20 text-critical border-critical/30';
      default: return 'bg-white/10 text-white border-white/20';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold tracking-tight">Inspection Log</h2>
        <p className="text-muted-foreground">Historical record of component assessments</p>
      </div>

      <div className="glass-panel p-4 rounded-lg border-white/10">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search component ID or outcome..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-black/40 border-white/10 focus-visible:ring-primary"
          />
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
        ) : filteredInspections?.length === 0 ? (
          <div className="text-center p-12 glass-panel border-white/10 rounded-xl text-muted-foreground">
            No inspection records found.
          </div>
        ) : (
          filteredInspections?.map(inspection => (
            <Card key={inspection.id} className="glass-panel border-white/10 overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className={cn(
                    "p-4 md:w-64 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/10",
                    inspection.outcome === 'REPLACEMENT_REQUIRED' ? "bg-critical/5" : "bg-black/20"
                  )}>
                    <div className="flex items-center text-xs text-muted-foreground mb-2">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(inspection.inspectedAt).toLocaleString()}
                    </div>
                    <div className="font-display text-xl text-white font-bold flex items-center mb-1">
                      <Cpu className="w-4 h-4 mr-2 text-primary" />
                      #{inspection.componentId}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground mb-3">
                      <User className="w-3 h-3 mr-1" />
                      Eng. ID: {inspection.engineerId}
                    </div>
                    <Badge variant="outline" className={cn("font-bold text-[10px] w-fit", getOutcomeStyle(inspection.outcome))}>
                      {inspection.outcome.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  
                  <div className="p-4 flex-1 space-y-3">
                    {inspection.geminiAnalysis && (
                      <div>
                        <div className="text-xs uppercase tracking-wider text-primary mb-1 flex items-center font-semibold">
                          <Activity className="w-3 h-3 mr-1" /> AI Vision Analysis
                        </div>
                        <div className="text-sm text-white/80 bg-black/40 p-3 rounded border border-white/5 font-mono">
                          {inspection.geminiAnalysis}
                        </div>
                      </div>
                    )}
                    
                    {inspection.humanOverride && (
                      <div className="bg-high-risk/10 border border-high-risk/20 p-3 rounded mt-2">
                        <div className="text-xs uppercase tracking-wider text-high-risk mb-1 flex items-center font-semibold">
                          <ShieldAlert className="w-3 h-3 mr-1" /> Human Override Applied
                        </div>
                        <div className="text-sm text-white/90">
                          {inspection.humanOverrideReason || "Manual assessment overruled AI suggestion."}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
