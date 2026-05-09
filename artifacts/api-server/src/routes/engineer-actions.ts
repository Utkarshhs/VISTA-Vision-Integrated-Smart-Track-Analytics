import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { alertsTable, inspectionsTable, componentsTable, engineersTable, activityLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();

router.post("/alerts/:id/accept", async (req, res) => {
  const id = Number(req.params.id);
  const [alert] = await db.update(alertsTable)
    .set({ status: "IN_PROGRESS" })
    .where(eq(alertsTable.id, id))
    .returning();
  if (!alert) { res.status(404).json({ error: "Alert not found" }); return; }
  if (alert.engineerId) {
    await db.update(engineersTable).set({ status: "on_mission" }).where(eq(engineersTable.id, alert.engineerId));
  }
  res.json(alert);
});

router.post("/alerts/:id/decline", async (req, res) => {
  const id = Number(req.params.id);
  const [alert] = await db.update(alertsTable)
    .set({ status: "PENDING", engineerId: null })
    .where(eq(alertsTable.id, id))
    .returning();
  if (!alert) { res.status(404).json({ error: "Alert not found" }); return; }
  res.json(alert);
});

router.post("/alerts/:id/complete", async (req, res) => {
  const id = Number(req.params.id);
  const { engineerId, feedback, photoBase64 } = req.body as {
    engineerId: number;
    feedback: string;
    photoBase64?: string;
  };

  const [alert] = await db.select().from(alertsTable).where(eq(alertsTable.id, id)).limit(1);
  if (!alert) { res.status(404).json({ error: "Alert not found" }); return; }

  const [comp] = await db.select().from(componentsTable).where(eq(componentsTable.id, alert.componentId)).limit(1);

  await db.update(alertsTable).set({ status: "RESOLVED", resolvedAt: new Date() }).where(eq(alertsTable.id, id));
  await db.update(engineersTable).set({ status: "available" }).where(eq(engineersTable.id, engineerId));

  const [inspection] = await db.insert(inspectionsTable).values({
    componentId: alert.componentId,
    engineerId,
    alertId: id,
    outcome: "CERTIFIED_HEALTHY",
    photoUrl: photoBase64 ?? null,
    engineerFeedback: feedback,
    inspectedAt: new Date(),
  }).returning();

  await db.insert(activityLogTable).values({
    type: "inspection_completed",
    componentId: comp?.componentId ?? String(alert.componentId),
    description: `Engineer resolved alert. Feedback: ${feedback.slice(0, 80)}`,
    severity: "INFO",
    timestamp: new Date(),
  });

  res.json({ success: true, inspectionId: inspection.id });
});

router.post("/alerts/:id/analyze-repair", async (req, res) => {
  const id = Number(req.params.id);

  const [alert] = await db.select().from(alertsTable).where(eq(alertsTable.id, id)).limit(1);
  if (!alert) { res.status(404).json({ error: "Alert not found" }); return; }

  const inspections = await db.select().from(inspectionsTable).where(eq(inspectionsTable.alertId, id)).limit(1);
  const inspection = inspections[0];
  if (!inspection) { res.status(404).json({ error: "No inspection found for this alert" }); return; }

  const [comp] = await db.select().from(componentsTable).where(eq(componentsTable.id, alert.componentId)).limit(1);

  const prompt = `You are VISTA — a railway track maintenance analysis AI. An engineer has completed a repair on a ${comp?.type ?? "railway"} component.

Component ID: ${comp?.componentId ?? alert.componentId}
Original CII Score: ${comp?.ciiScore ?? "unknown"} / 100 (lower = more damaged)
Engineer Feedback: "${inspection.engineerFeedback ?? "No feedback provided"}"

${inspection.photoUrl ? "A repair photo has been uploaded for analysis." : "No photo was uploaded."}

Based on the engineer's feedback and repair context:
1. Assess the quality of the repair
2. Estimate the new CII score after repair (0-100)
3. Calculate danger reduction percentage (how much safer vs before)
4. Give a concise summary (2-3 sentences max)

Respond in EXACT JSON format (no markdown):
{
  "summary": "Short description of repair outcome",
  "estimatedNewCii": <number 0-100>,
  "dangerReductionPct": <number 0-100>,
  "repairQuality": "EXCELLENT" | "GOOD" | "PARTIAL" | "INSUFFICIENT"
}`;

  type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

  const parts: GeminiPart[] = [{ text: prompt }];

  if (inspection.photoUrl && inspection.photoUrl.length > 100) {
    const base64Data = inspection.photoUrl.replace(/^data:image\/\w+;base64,/, "");
    const mimeType = inspection.photoUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg";
    parts.push({ inlineData: { mimeType, data: base64Data } });
  }

  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts }],
  });

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  let parsed: { summary: string; estimatedNewCii: number; dangerReductionPct: number; repairQuality: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { summary: text, estimatedNewCii: 60, dangerReductionPct: 40, repairQuality: "GOOD" };
  }

  await db.update(inspectionsTable).set({
    repairAnalysis: parsed.summary,
    dangerReductionPct: String(parsed.dangerReductionPct),
  }).where(eq(inspectionsTable.id, inspection.id));

  res.json(parsed);
});

router.get("/alerts/:id/inspection", async (req, res) => {
  const id = Number(req.params.id);
  const inspections = await db.select().from(inspectionsTable).where(eq(inspectionsTable.alertId, id)).limit(1);
  if (!inspections[0]) { res.status(404).json({ error: "No inspection found" }); return; }
  res.json(inspections[0]);
});

export default router;
