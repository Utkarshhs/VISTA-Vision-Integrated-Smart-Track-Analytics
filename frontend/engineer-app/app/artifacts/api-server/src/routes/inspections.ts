import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { inspectionsTable, activityLogTable, componentsTable } from "@workspace/db";
import { CreateInspectionBody, ListInspectionsQueryParams } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function toInspection(i: typeof inspectionsTable.$inferSelect) {
  return {
    ...i,
    geminiCiiOverride: i.geminiCiiOverride != null ? Number(i.geminiCiiOverride) : null,
  };
}

router.get("/inspections", async (req, res) => {
  const params = ListInspectionsQueryParams.parse({
    componentId: req.query.componentId ? Number(req.query.componentId) : undefined,
    engineerId: req.query.engineerId ? Number(req.query.engineerId) : undefined,
  });
  const conditions = [];
  if (params.componentId) conditions.push(eq(inspectionsTable.componentId, params.componentId));
  if (params.engineerId) conditions.push(eq(inspectionsTable.engineerId, params.engineerId));
  const inspections = conditions.length > 0
    ? await db.select().from(inspectionsTable).where(and(...conditions)).orderBy(inspectionsTable.inspectedAt)
    : await db.select().from(inspectionsTable).orderBy(inspectionsTable.inspectedAt);
  res.json(inspections.map(toInspection));
});

router.post("/inspections", async (req, res) => {
  const body = CreateInspectionBody.parse(req.body);
  const [inspection] = await db.insert(inspectionsTable).values({
    ...body,
    geminiCiiOverride: body.geminiCiiOverride != null ? String(body.geminiCiiOverride) : null,
    inspectedAt: new Date(body.inspectedAt),
  }).returning();

  const [comp] = await db.select().from(componentsTable).where(eq(componentsTable.id, body.componentId));
  const activityType = body.humanOverride ? "human_override" : body.geminiAnalysis ? "gemini_analysis" : "inspection_done";
  await db.insert(activityLogTable).values({
    type: activityType,
    componentId: comp?.componentId ?? String(body.componentId),
    description: `Inspection completed: ${body.outcome} for ${comp?.componentId ?? body.componentId}${body.humanOverride ? " (Human Override)" : ""}`,
    severity: body.outcome === "FLAGGED_CRITICAL" || body.outcome === "REPLACEMENT_REQUIRED" ? "CRITICAL"
      : body.outcome === "FLAGGED_MODERATE" ? "HIGH_RISK" : "INFO",
    timestamp: new Date(),
  });

  res.status(201).json(toInspection(inspection));
});

router.get("/inspections/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [inspection] = await db.select().from(inspectionsTable).where(eq(inspectionsTable.id, id));
  if (!inspection) return res.status(404).json({ error: "Inspection not found" });
  res.json(toInspection(inspection));
});

export default router;
