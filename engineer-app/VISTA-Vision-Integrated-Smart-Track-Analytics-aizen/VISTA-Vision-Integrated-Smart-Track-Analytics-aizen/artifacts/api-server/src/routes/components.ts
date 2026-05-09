import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { componentsTable } from "@workspace/db";
import { CreateComponentBody, UpdateComponentBody, ListComponentsQueryParams } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function computeCiiStatus(score: number): string {
  if (score <= 30) return "CRITICAL";
  if (score <= 55) return "HIGH_RISK";
  if (score <= 75) return "MODERATE";
  return "NOMINAL";
}

function computeCiiScore(ageMonths: number, loadStress: number, rainfallIndex: number, thermalGradient: number): number {
  const ageFactor = Math.min(ageMonths / 2, 40);
  const score = 100 - (ageFactor + loadStress * 1.5 + rainfallIndex * 20 + thermalGradient * 2.0);
  return Math.max(0, Math.min(100, score));
}

function toComponent(c: typeof componentsTable.$inferSelect) {
  return {
    ...c,
    ciiScore: Number(c.ciiScore),
    loadStress: Number(c.loadStress),
    rainfallIndex: Number(c.rainfallIndex),
    thermalGradient: Number(c.thermalGradient),
    latitude: Number(c.latitude),
    longitude: Number(c.longitude),
  };
}

router.get("/components", async (req, res) => {
  const params = ListComponentsQueryParams.parse({
    hubId: req.query.hubId ? Number(req.query.hubId) : undefined,
    sectorId: req.query.sectorId ? Number(req.query.sectorId) : undefined,
    status: req.query.status,
  });

  const conditions = [];
  if (params.hubId) conditions.push(eq(componentsTable.hubId, params.hubId));
  if (params.sectorId) conditions.push(eq(componentsTable.sectorId, params.sectorId));
  if (params.status) conditions.push(eq(componentsTable.ciiStatus, params.status));

  const components = conditions.length > 0
    ? await db.select().from(componentsTable).where(and(...conditions))
    : await db.select().from(componentsTable);

  res.json(components.map(toComponent));
});

router.post("/components", async (req, res) => {
  const body = CreateComponentBody.parse(req.body);
  const ciiScore = computeCiiScore(
    body.ageMonths,
    Number(body.loadStress),
    Number(body.rainfallIndex),
    Number(body.thermalGradient)
  );
  const ciiStatus = computeCiiStatus(ciiScore);
  const [component] = await db
    .insert(componentsTable)
    .values({ ...body, ciiScore: String(ciiScore), ciiStatus })
    .returning();
  res.status(201).json(toComponent(component));
});

router.get("/components/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [component] = await db.select().from(componentsTable).where(eq(componentsTable.id, id));
  if (!component) return res.status(404).json({ error: "Component not found" });
  res.json(toComponent(component));
});

router.patch("/components/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateComponentBody.parse(req.body);
  const updates: Partial<typeof componentsTable.$inferInsert> = {};
  if (body.ciiScore != null) {
    updates.ciiScore = String(body.ciiScore);
    updates.ciiStatus = body.ciiStatus ?? computeCiiStatus(body.ciiScore);
  }
  if (body.ciiStatus != null) updates.ciiStatus = body.ciiStatus;
  if (body.lastInspection != null) updates.lastInspection = new Date(body.lastInspection);
  const [updated] = await db.update(componentsTable).set(updates).where(eq(componentsTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Component not found" });
  res.json(toComponent(updated));
});

export default router;
