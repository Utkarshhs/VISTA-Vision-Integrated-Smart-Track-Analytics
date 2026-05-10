import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { hubsTable } from "@workspace/db";
import { CreateHubBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/hubs", async (req, res) => {
  const hubs = await db.select().from(hubsTable).orderBy(hubsTable.name);
  res.json(
    hubs.map((h) => ({
      ...h,
      latitude: Number(h.latitude),
      longitude: Number(h.longitude),
    }))
  );
});

router.post("/hubs", async (req, res) => {
  const body = CreateHubBody.parse(req.body);
  const [hub] = await db.insert(hubsTable).values(body).returning();
  res.status(201).json({ ...hub, latitude: Number(hub.latitude), longitude: Number(hub.longitude) });
});

router.get("/hubs/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [hub] = await db.select().from(hubsTable).where(eq(hubsTable.id, id));
  if (!hub) return res.status(404).json({ error: "Hub not found" });
  res.json({ ...hub, latitude: Number(hub.latitude), longitude: Number(hub.longitude) });
});

export default router;
