import { PrismaClient } from "@prisma/client"
const db = new PrismaClient()
try {
  const cols = await db.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name='InternshipRecord' ORDER BY ordinal_position`)
  console.log("COLUMNS:", cols.map(c => c.column_name).join(", "))
} catch (e) { console.error("ERR:", e.message) }
await db.$disconnect()
