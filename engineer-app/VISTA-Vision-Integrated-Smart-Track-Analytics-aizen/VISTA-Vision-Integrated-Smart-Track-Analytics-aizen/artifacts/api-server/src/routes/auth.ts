import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, engineersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }
  const users = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  const user = users[0];
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  let engineerName: string | null = null;
  let hubId: number | null = null;
  if (user.engineerId) {
    const engs = await db.select().from(engineersTable).where(eq(engineersTable.id, user.engineerId)).limit(1);
    engineerName = engs[0]?.name ?? null;
    hubId = engs[0]?.hubId ?? null;
  }
  res.json({ id: user.id, username: user.username, role: user.role, engineerId: user.engineerId, engineerName, hubId });
});

export default router;
