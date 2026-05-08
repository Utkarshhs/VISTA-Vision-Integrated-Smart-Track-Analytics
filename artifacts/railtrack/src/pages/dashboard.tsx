import { useGetDashboardSummary, useGetCiiDistribution, useGetRecentActivity, useGetHubStatus, useListComponents } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, CheckCircle, Cpu, RadioTower, ShieldAlert } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Cell as PieCell } from "recharts";
import { cn } from "@/lib/utils";

const COLORS = {
  CRITICAL: "hsl(var(--critical))",
  HIGH_RISK: "hsl(var(--high-risk))",
  MODERATE: "hsl(var(--moderate))",
  NOMINAL: "hsl(var(--nominal))",
};

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: ciiDist, isLoading: loadingCii } = useGetCiiDistribution();
  const { data: activity, isLoading: loadingActivity } = useGetRecentActivity();
  const { data: hubStatus, isLoading: loadingHubStatus } = useGetHubStatus();
  const { data: topCritical, isLoading: loadingCritical } = useListComponents({ status: "CRITICAL" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Command Center</h2>
          <p className="text-muted-foreground">Sector-wide situational awareness</p>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="glass-panel border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/20 blur-xl rounded-full translate-x-8 -translate-y-8"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Components</CardTitle>
            <Cpu className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{loadingSummary ? <Skeleton className="h-8 w-20" /> : summary?.totalComponents}</div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-critical/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-critical/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-critical">Critical Status</CardTitle>
            <ShieldAlert className="h-4 w-4 text-critical" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold font-display text-critical pulse-critical">
              {loadingSummary ? <Skeleton className="h-8 w-20 bg-critical/20" /> : summary?.criticalCount}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-high-risk/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-high-risk/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-high-risk">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-high-risk" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold font-display text-high-risk">
              {loadingSummary ? <Skeleton className="h-8 w-20 bg-high-risk/20" /> : summary?.highRiskCount}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10 relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <RadioTower className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-white">
              {loadingSummary ? <Skeleton className="h-8 w-20" /> : summary?.activeAlerts}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10 relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg CII Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-white">
              {loadingSummary ? <Skeleton className="h-8 w-20" /> : summary?.avgCiiScore?.toFixed(1)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Hub Status Table */}
        <Card className="col-span-4 glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Hub Status Overview</CardTitle>
            <CardDescription>Status breakdown across active hubs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loadingHubStatus ? (
                Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : (
                <div className="rounded-md border border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="h-10 px-4 text-left font-medium text-muted-foreground">Hub</th>
                        <th className="h-10 px-4 text-right font-medium text-muted-foreground">Components</th>
                        <th className="h-10 px-4 text-right font-medium text-muted-foreground">Critical</th>
                        <th className="h-10 px-4 text-right font-medium text-muted-foreground">Active Alerts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hubStatus?.map((hub) => (
                        <tr key={hub.hubId} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="p-4 font-medium">{hub.hubName}</td>
                          <td className="p-4 text-right font-display">{hub.totalComponents}</td>
                          <td className={cn("p-4 text-right font-display", hub.criticalCount > 0 ? "text-critical font-bold" : "text-muted-foreground")}>
                            {hub.criticalCount}
                          </td>
                          <td className="p-4 text-right font-display text-white">{hub.activeAlerts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CII Distribution Chart */}
        <Card className="col-span-3 glass-panel border-white/10">
          <CardHeader>
            <CardTitle>CII Distribution</CardTitle>
            <CardDescription>Current health composition</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {loadingCii ? (
              <Skeleton className="h-[200px] w-[200px] rounded-full" />
            ) : ciiDist && ciiDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ciiDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="status"
                  >
                    {ciiDist.map((entry, index) => (
                      <PieCell key={`cell-${index}`} fill={COLORS[entry.status as keyof typeof COLORS] || "white"} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0b10', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff', fontFamily: 'Orbitron' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {/* Top Critical Components */}
        <Card className="glass-panel border-critical/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-critical"></div>
          <CardHeader>
            <CardTitle className="text-critical flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Top Critical Components
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loadingCritical ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : topCritical && topCritical.length > 0 ? (
                topCritical.slice(0, 5).map((comp) => (
                  <div key={comp.id} className="flex items-center justify-between p-3 rounded-lg border border-critical/20 bg-critical/5">
                    <div>
                      <div className="font-display font-medium text-white">{comp.componentId}</div>
                      <div className="text-xs text-muted-foreground">{comp.type} • {comp.location}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-critical font-bold">{comp.ciiScore.toFixed(1)} CII</div>
                      <div className="text-[10px] uppercase text-critical/80">REPLACEMENT REQ</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-nominal flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> No critical components identified
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loadingActivity ? (
                Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : activity && activity.length > 0 ? (
                <div className="relative pl-4 border-l border-white/10 space-y-6">
                  {activity.map((item) => (
                    <div key={item.id} className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background"></div>
                      <div className="text-xs text-muted-foreground mb-1">{new Date(item.timestamp).toLocaleString()}</div>
                      <div className="text-sm">
                        <span className="font-display text-primary">{item.componentId}</span>
                        <span className="ml-2 text-white/80">{item.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">No recent activity</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
