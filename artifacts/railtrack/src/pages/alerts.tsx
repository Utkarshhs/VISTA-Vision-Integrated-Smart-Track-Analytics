import { useState } from "react";
import { useListAlerts, useUpdateAlert, useListEngineers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, MapPin, CheckCircle2, UserCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { getListAlertsQueryKey } from "@workspace/api-client-react";

export default function Alerts() {
  const [activeTab, setActiveTab] = useState("active");
  const { data: alerts, isLoading } = useListAlerts();
  const { data: engineers } = useListEngineers();
  const updateAlert = useUpdateAlert();
  const { toast } = useToast();

  const activeAlerts = alerts?.filter(a => a.status !== 'RESOLVED' && a.status !== 'CANCELLED') || [];
  const resolvedAlerts = alerts?.filter(a => a.status === 'RESOLVED' || a.status === 'CANCELLED') || [];

  const handleAssignEngineer = (alertId: number, engineerId: string) => {
    updateAlert.mutate({
      id: alertId,
      data: {
        engineerId: parseInt(engineerId, 10),
        status: 'DISPATCHED'
      }
    }, {
      onSuccess: () => {
        toast({ title: "Engineer Assigned", description: "Alert status updated to DISPATCHED" });
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
      }
    });
  };

  const handleResolveAlert = (alertId: number) => {
    updateAlert.mutate({
      id: alertId,
      data: { status: 'RESOLVED' }
    }, {
      onSuccess: () => {
        toast({ title: "Alert Resolved", description: "Maintenance confirmed completed" });
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
      }
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY': return 'bg-critical/20 text-critical border-critical/30';
      case 'PRIORITY': return 'bg-high-risk/20 text-high-risk border-high-risk/30';
      case 'ROUTINE': return 'bg-primary/20 text-primary border-primary/30';
      default: return 'bg-white/10 text-white border-white/20';
    }
  };

  const AlertCard = ({ alert }: { alert: any }) => (
    <Card className={cn(
      "glass-panel overflow-hidden transition-all",
      alert.priority === 'EMERGENCY' ? "border-critical/30" : "border-white/10"
    )}>
      {alert.priority === 'EMERGENCY' && (
        <div className="absolute top-0 left-0 w-1 h-full bg-critical pulse-critical"></div>
      )}
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="space-y-3 flex-1 pl-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("font-display uppercase tracking-wider text-[10px]", getPriorityColor(alert.priority))}>
                {alert.priority === 'EMERGENCY' && <ShieldAlert className="w-3 h-3 mr-1" />}
                {alert.priority}
              </Badge>
              <Badge variant="outline" className="bg-white/5 border-white/10 text-muted-foreground uppercase text-[10px]">
                {alert.status}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {new Date(alert.createdAt).toLocaleString()}
              </span>
            </div>
            
            <div>
              <div className="text-lg font-display font-bold text-white flex items-center gap-2">
                Component #{alert.componentId}
              </div>
              <div className="text-sm text-muted-foreground flex items-center mt-1">
                <MapPin className="w-3 h-3 mr-1" /> Hub ID: {alert.hubId}
              </div>
            </div>
            
            {alert.notes && (
              <div className="bg-black/30 p-3 rounded text-sm text-white/80 border border-white/5">
                {alert.notes}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 min-w-[200px] border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-4">
            {alert.status === 'PENDING' ? (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Assign Engineer</label>
                <Select onValueChange={(val) => handleAssignEngineer(alert.id, val)}>
                  <SelectTrigger className="w-full bg-black/40 border-white/10">
                    <SelectValue placeholder="Select Engineer" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-white/10">
                    {engineers?.map(eng => (
                      <SelectItem key={eng.id} value={eng.id.toString()}>
                        {eng.name} ({eng.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : alert.status !== 'RESOLVED' && alert.status !== 'CANCELLED' ? (
              <div className="space-y-3">
                <div className="bg-primary/10 border border-primary/20 rounded p-2 flex items-center gap-2">
                  <UserCircle className="w-5 h-5 text-primary" />
                  <div className="text-sm">
                    <div className="text-xs text-muted-foreground">Assigned to</div>
                    <div className="font-display font-medium text-white">
                      {engineers?.find(e => e.id === alert.engineerId)?.name || 'Unknown'}
                    </div>
                  </div>
                </div>
                <Button 
                  className="w-full bg-nominal hover:bg-nominal/80 text-black font-bold"
                  onClick={() => handleResolveAlert(alert.id)}
                  disabled={updateAlert.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Resolved
                </Button>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-nominal/10 border border-nominal/20 rounded text-nominal p-4">
                <div className="text-center">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-1" />
                  <div className="font-bold text-sm uppercase tracking-wider">Resolved</div>
                  <div className="text-xs mt-1 text-nominal/80">
                    {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleDateString() : 'Confirmed'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold tracking-tight text-white flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-high-risk" />
          Dispatch Console
        </h2>
        <p className="text-muted-foreground">Manage and assign maintenance alerts</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-black/50 border border-white/10 p-1">
          <TabsTrigger value="active" className="data-[state=active]:bg-primary data-[state=active]:text-black">
            Active Alerts
            <Badge variant="secondary" className="ml-2 bg-black/20 text-current">
              {activeAlerts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="resolved" className="data-[state=active]:bg-white/10">
            Resolved
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6 space-y-4">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)
          ) : activeAlerts.length === 0 ? (
            <div className="text-center p-12 glass-panel border-white/10 rounded-xl">
              <CheckCircle2 className="w-12 h-12 text-nominal mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-white">No active alerts</h3>
              <p className="text-muted-foreground">All systems nominal.</p>
            </div>
          ) : (
            activeAlerts.map(alert => <AlertCard key={alert.id} alert={alert} />)
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-6 space-y-4">
          {isLoading ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : resolvedAlerts.length === 0 ? (
            <div className="text-center p-12 glass-panel border-white/10 rounded-xl text-muted-foreground">
              No resolved alerts found.
            </div>
          ) : (
            resolvedAlerts.map(alert => <AlertCard key={alert.id} alert={alert} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
