import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { alertsTable, activityLogTable, componentsTable } from "@workspace/db";
import { CreateAlertBody, UpdateAlertBody, ListAlertsQueryParams } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/alerts", async (req, res) => {
  const params = ListAlertsQueryParams.parse({
    hubId: req.query.hubId ? Number(req.query.hubId) : undefined,
    status: req.query.status,
  });
  const conditions = [];
  if (params.hubId) conditions.push(eq(alertsTable.hubId, params.hubId));
  if (params.status) conditions.push(eq(alertsTable.status, params.status));
  const alerts = conditions.length > 0
    ? await db.select().from(alertsTable).where(and(...conditions)).orderBy(alertsTable.createdAt)
    : await db.select().from(alertsTable).orderBy(alertsTable.createdAt);
  res.json(alerts);
});

router.post("/alerts", async (req, res) => {
  const body = CreateAlertBody.parse(req.body);
  const [alert] = await db.insert(alertsTable).values({
    ...body,
    status: "PENDING",
    dispatchedAt: new Date(),
  }).returning();

  const [comp] = await db.select().from(componentsTable).where(eq(componentsTable.id, body.componentId));
  await db.insert(activityLogTable).values({
    type: "alert_created",
    componentId: comp?.componentId ?? String(body.componentId),
    description: `${body.priority} alert dispatched for component ${comp?.componentId ?? body.componentId}`,
    severity: body.priority === "EMERGENCY" ? "CRITICAL" : body.priority === "PRIORITY" ? "HIGH_RISK" : "MODERATE",
    timestamp: new Date(),
  });

  res.status(201).json(alert);
});

router.get("/alerts/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [alert] = await db.select().from(alertsTable).where(eq(alertsTable.id, id));
  if (!alert) return res.status(404).json({ error: "Alert not found" });
  res.json(alert);
});

router.patch("/alerts/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateAlertBody.parse(req.body);
  const updates: Partial<typeof alertsTable.$inferInsert> = {};
  if (body.status != null) {
    updates.status = body.status;
    if (body.status === "RESOLVED") updates.resolvedAt = new Date();
    if (body.status === "DISPATCHED") updates.dispatchedAt = new Date();
  }
  if (body.engineerId != null) updates.engineerId = body.engineerId;
  if (body.notes != null) updates.notes = body.notes;
  const [updated] = await db.update(alertsTable).set(updates).where(eq(alertsTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Alert not found" });

  if (body.status === "RESOLVED") {
    const [comp] = await db.select().from(componentsTable).where(eq(componentsTable.id, updated.componentId));
    await db.insert(activityLogTable).values({
      type: "alert_resolved",
      componentId: comp?.componentId ?? String(updated.componentId),
      description: `Alert resolved for component ${comp?.componentId ?? updated.componentId}`,
      severity: "INFO",
      timestamp: new Date(),
    });
  }

  res.json(updated);
});

export default router;
