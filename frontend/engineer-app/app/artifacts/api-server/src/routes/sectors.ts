import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sectorsTable } from "@workspace/db";
import { CreateSectorBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/sectors", async (req, res) => {
  const sectors = await db.select().from(sectorsTable).orderBy(sectorsTable.name);
  res.json(
    sectors.map((s) => ({
      ...s,
      latitude: Number(s.latitude),
      longitude: Number(s.longitude),
    }))
  );
});

router.post("/sectors", async (req, res) => {
  const body = CreateSectorBody.parse(req.body);
  const [sector] = await db.insert(sectorsTable).values(body).returning();
  res.status(201).json({ ...sector, latitude: Number(sector.latitude), longitude: Number(sector.longitude) });
});

router.get("/sectors/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [sector] = await db.select().from(sectorsTable).where(eq(sectorsTable.id, id));
  if (!sector) return res.status(404).json({ error: "Sector not found" });
  res.json({ ...sector, latitude: Number(sector.latitude), longitude: Number(sector.longitude) });
});

export default router;
