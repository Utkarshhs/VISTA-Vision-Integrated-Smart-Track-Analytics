import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { componentsTable, alertsTable, inspectionsTable, activityLogTable, engineersTable, hubsTable } from "@workspace/db";
import { eq, count, sql, gte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res) => {
  const components = await db.select().from(componentsTable);
  const activeAlerts = await db.select({ count: count() }).from(alertsTable)
    .where(sql`${alertsTable.status} NOT IN ('RESOLVED', 'CANCELLED')`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const resolvedToday = await db.select({ count: count() }).from(alertsTable)
    .where(sql`${alertsTable.resolvedAt} >= ${today}`);
  const inspectionsToday = await db.select({ count: count() }).from(inspectionsTable)
    .where(gte(inspectionsTable.inspectedAt, today));
  const onlineEngineers = await db.select({ count: count() }).from(engineersTable)
    .where(sql`${engineersTable.status} IN ('available', 'on_mission')`);

  const ciiScores = components.map((c) => Number(c.ciiScore));
  const avgCiiScore = ciiScores.length > 0 ? ciiScores.reduce((a, b) => a + b, 0) / ciiScores.length : 0;

  res.json({
    totalComponents: components.length,
    criticalCount: components.filter((c) => c.ciiStatus === "CRITICAL").length,
    highRiskCount: components.filter((c) => c.ciiStatus === "HIGH_RISK").length,
    moderateCount: components.filter((c) => c.ciiStatus === "MODERATE").length,
    nominalCount: components.filter((c) => c.ciiStatus === "NOMINAL").length,
    activeAlerts: Number(activeAlerts[0]?.count ?? 0),
    resolvedToday: Number(resolvedToday[0]?.count ?? 0),
    inspectionsToday: Number(inspectionsToday[0]?.count ?? 0),
    avgCiiScore: Math.round(avgCiiScore * 10) / 10,
    onlineEngineers: Number(onlineEngineers[0]?.count ?? 0),
  });
});

router.get("/dashboard/cii-distribution", async (req, res) => {
  const components = await db.select().from(componentsTable);
  const total = components.length || 1;
  const statuses = ["CRITICAL", "HIGH_RISK", "MODERATE", "NOMINAL"];
  const distribution = statuses.map((status) => {
    const cnt = components.filter((c) => c.ciiStatus === status).length;
    return { status, count: cnt, percentage: Math.round((cnt / total) * 1000) / 10 };
  });
  res.json(distribution);
});

router.get("/dashboard/recent-activity", async (req, res) => {
  const activity = await db
    .select()
    .from(activityLogTable)
    .orderBy(sql`${activityLogTable.timestamp} DESC`)
    .limit(20);
  res.json(activity);
});

router.get("/dashboard/hub-status", async (req, res) => {
  const hubs = await db.select().from(hubsTable);
  const components = await db.select().from(componentsTable);
  const alerts = await db.select().from(alertsTable)
    .where(sql`${alertsTable.status} NOT IN ('RESOLVED', 'CANCELLED')`);

  const hubStatus = hubs.map((hub) => {
    const hubComps = components.filter((c) => c.hubId === hub.id);
    const hubAlerts = alerts.filter((a) => a.hubId === hub.id);
    const ciiScores = hubComps.map((c) => Number(c.ciiScore));
    const avgCii = ciiScores.length > 0 ? ciiScores.reduce((a, b) => a + b, 0) / ciiScores.length : 100;
    return {
      hubId: hub.id,
      hubName: hub.name,
      totalComponents: hubComps.length,
      criticalCount: hubComps.filter((c) => c.ciiStatus === "CRITICAL").length,
      highRiskCount: hubComps.filter((c) => c.ciiStatus === "HIGH_RISK").length,
      avgCiiScore: Math.round(avgCii * 10) / 10,
      activeAlerts: hubAlerts.length,
    };
  });
  res.json(hubStatus);
});

export default router;
