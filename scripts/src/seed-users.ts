import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

async function seedUsers() {
  const hash = async (pw: string) => bcrypt.hash(pw, 10);

  await db.execute(sql`DELETE FROM ${usersTable}`);

  await db.insert(usersTable).values([
    { username: "railway", passwordHash: await hash("railway123"), role: "railway", engineerId: null },
    { username: "arjun", passwordHash: await hash("eng123"), role: "engineer", engineerId: 1 },
    { username: "priya", passwordHash: await hash("eng123"), role: "engineer", engineerId: 2 },
    { username: "vikram", passwordHash: await hash("eng123"), role: "engineer", engineerId: 3 },
    { username: "kavitha", passwordHash: await hash("eng123"), role: "engineer", engineerId: 4 },
    { username: "suresh", passwordHash: await hash("eng123"), role: "engineer", engineerId: 5 },
    { username: "deepak", passwordHash: await hash("eng123"), role: "engineer", engineerId: 6 },
  ]);

  console.log("Users seeded successfully");
  process.exit(0);
}

seedUsers().catch((e) => { console.error(e); process.exit(1); });
