import { useState } from "react";
import { useListComponents, useGetComponent, useCreateAlert } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, AlertTriangle, Activity, MapPin, Calendar, Wrench, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { getListAlertsQueryKey } from "@workspace/api-client-react";

const getStatusColor = (status: string) => {
  switch (status) {
    case "CRITICAL": return "bg-critical text-critical-foreground border-critical";
    case "HIGH_RISK": return "bg-high-risk text-high-risk-foreground border-high-risk";
    case "MODERATE": return "bg-moderate text-moderate-foreground border-moderate";
    case "NOMINAL": return "bg-nominal text-nominal-foreground border-nominal";
    default: return "bg-muted text-muted-foreground border-muted";
  }
};

const getStatusTextColor = (status: string) => {
  switch (status) {
    case "CRITICAL": return "text-critical";
    case "HIGH_RISK": return "text-high-risk";
    case "MODERATE": return "text-moderate";
    case "NOMINAL": return "text-nominal";
    default: return "text-muted-foreground";
  }
};

export default function Components() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: components, isLoading } = useListComponents(
    statusFilter !== "ALL" ? { status: statusFilter } : undefined
  );

  const filteredComponents = components?.filter(c => 
    c.componentId.toLowerCase().includes(search.toLowerCase()) ||
    c.type.toLowerCase().includes(search.toLowerCase()) ||
    c.location.toLowerCase().includes(search.toLowerCase())
  );

  const { data: selectedComponent, isLoading: loadingDetails } = useGetComponent(selectedId ?? 0, {
    query: { enabled: !!selectedId, queryKey: ['component', selectedId] }
  });

  const createAlert = useCreateAlert();
  const { toast } = useToast();

  const handleDispatch = () => {
    if (!selectedComponent) return;
    
    createAlert.mutate({
      data: {
        componentId: selectedComponent.id,
        hubId: selectedComponent.hubId,
        priority: selectedComponent.ciiStatus === 'CRITICAL' ? 'EMERGENCY' : 
                 selectedComponent.ciiStatus === 'HIGH_RISK' ? 'PRIORITY' : 'ROUTINE',
        notes: `Automated dispatch based on CII Score: ${selectedComponent.ciiScore}`
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Alert Dispatched",
          description: `Maintenance alert created for ${selectedComponent.componentId}`,
        });
        setSelectedId(null);
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to dispatch alert",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold tracking-tight">Component Registry</h2>
        <p className="text-muted-foreground">Track inventory and maintenance history</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center glass-panel p-4 rounded-lg border-white/10">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by ID, type, or location..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-black/40 border-white/10 focus-visible:ring-primary font-display"
          />
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-black/40 border-white/10">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/10 text-white">
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="CRITICAL" className="text-critical">Critical</SelectItem>
              <SelectItem value="HIGH_RISK" className="text-high-risk">High Risk</SelectItem>
              <SelectItem value="MODERATE" className="text-moderate">Moderate</SelectItem>
              <SelectItem value="NOMINAL" className="text-nominal">Nominal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="glass-panel border-white/10">
        <CardContent className="p-0">
          <div className="rounded-md border border-white/10 border-t-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Component ID</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Type</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Location</th>
                  <th className="h-10 px-4 text-right font-medium text-muted-foreground">CII Score</th>
                  <th className="h-10 px-4 text-center font-medium text-muted-foreground">Status</th>
                  <th className="h-10 px-4 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-40" /></td>
                      <td className="p-4 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                      <td className="p-4 text-center"><Skeleton className="h-6 w-24 mx-auto rounded-full" /></td>
                      <td className="p-4 text-right"><Skeleton className="h-8 w-20 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredComponents?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No components found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredComponents?.map((comp) => (
                    <tr 
                      key={comp.id} 
                      className={cn(
                        "border-b border-white/5 transition-colors hover:bg-white/5",
                        comp.ciiStatus === 'CRITICAL' && "bg-critical/5 border-critical/20"
                      )}
                    >
                      <td className="p-4 font-display text-white">{comp.componentId}</td>
                      <td className="p-4">{comp.type}</td>
                      <td className="p-4 text-muted-foreground">{comp.location}</td>
                      <td className="p-4 text-right font-display font-bold">
                        <span className={getStatusTextColor(comp.ciiStatus)}>{comp.ciiScore.toFixed(1)}</span>
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant="outline" className={cn("uppercase text-[10px] tracking-wider", getStatusColor(comp.ciiStatus))}>
                          {comp.ciiStatus.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="border-white/10 hover:bg-white/10"
                          onClick={() => setSelectedId(comp.id)}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Component Details Dialog */}
      <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="glass-panel border-white/10 text-white sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" />
              {loadingDetails ? "Loading..." : selectedComponent?.componentId}
            </DialogTitle>
            <DialogDescription>
              Detailed component metrics and inspection history
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-32 w-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ) : selectedComponent ? (
            <div className="space-y-6 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Component Type</h4>
                  <div className="text-lg font-medium">{selectedComponent.type}</div>
                </div>
                <Badge variant="outline" className={cn("text-lg px-3 py-1 font-display", getStatusColor(selectedComponent.ciiStatus))}>
                  CII: {selectedComponent.ciiScore.toFixed(1)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/30 p-3 rounded-lg border border-white/5 flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Location</div>
                    <div className="font-medium text-sm">{selectedComponent.location}</div>
                  </div>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Last Inspection</div>
                    <div className="font-medium text-sm">
                      {selectedComponent.lastInspection 
                        ? new Date(selectedComponent.lastInspection).toLocaleDateString()
                        : "Never"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-black/30 p-4 rounded-lg border border-white/5 space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Stress Factors
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Load Stress (GMT)</span>
                      <span className="font-display text-white">{selectedComponent.loadStress.toFixed(1)}/100</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div 
                        className="bg-primary h-1.5 rounded-full" 
                        style={{ width: `${selectedComponent.loadStress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Corrosion (Rainfall Index)</span>
                      <span className="font-display text-white">{(selectedComponent.rainfallIndex * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full" 
                        style={{ width: `${selectedComponent.rainfallIndex * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Thermal Gradient</span>
                      <span className="font-display text-white">{selectedComponent.thermalGradient.toFixed(1)}/100</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div 
                        className="bg-orange-500 h-1.5 rounded-full" 
                        style={{ width: `${selectedComponent.thermalGradient}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="border-t border-white/10 pt-4">
            <Button variant="outline" onClick={() => setSelectedId(null)} className="bg-black/50 border-white/10">
              Close
            </Button>
            <Button 
              onClick={handleDispatch} 
              disabled={createAlert.isPending}
              className={cn(
                "font-bold",
                selectedComponent?.ciiStatus === 'CRITICAL' 
                  ? "bg-critical hover:bg-critical/80 text-white" 
                  : "bg-primary hover:bg-primary/80 text-black"
              )}
            >
              {createAlert.isPending ? "Dispatching..." : (
                <>
                  <Wrench className="w-4 h-4 mr-2" />
                  Dispatch Maintenance
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
