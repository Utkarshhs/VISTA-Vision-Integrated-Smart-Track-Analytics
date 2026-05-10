import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { engineersTable } from "@workspace/db";
import { CreateEngineerBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/engineers", async (req, res) => {
  const engineers = await db.select().from(engineersTable).orderBy(engineersTable.name);
  res.json(engineers);
});

router.post("/engineers", async (req, res) => {
  const body = CreateEngineerBody.parse(req.body);
  const [engineer] = await db.insert(engineersTable).values(body).returning();
  res.status(201).json(engineer);
});

export default router;
