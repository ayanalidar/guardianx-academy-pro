// Seed a demo school for institution login — run with: bun run prisma/seed-school.ts
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

import { randomBytes } from "crypto"

// audit fix C-01 (residual): refuse weak demo passwords against prod databases
const PROD_DB =
  process.env.NODE_ENV === "production" ||
  /neon\.tech|neon\.build|amazonaws|azure\.com|render\.com|rds\./i.test(process.env.DATABASE_URL ?? "")

function secureDemoPassword(envKey: string, devDefault: string): string {
  const fromEnv = process.env[envKey]
  if (fromEnv) return fromEnv
  if (PROD_DB) {
    const generated = randomBytes(18).toString("base64url")
    console.log(`  [security] ${envKey} not set against a PROD database - strong password generated (printed ONCE): ${generated}`)
    return generated
  }
  return devDefault
}


const db = new PrismaClient()

async function main() {
  console.log("Seeding demo schools...")

  const schools = [
    {
      schoolCode: "GXS-DELHI-001",
      name: "Delhi Public School of Cyber Sciences",
      type: "SCHOOL",
      email: "info@dpscyber.edu.in",
      phone: "+91 11 2345 6789",
      address: "Sector 12, R.K. Puram",
      city: "New Delhi",
      state: "Delhi",
      country: "India",
      website: "https://dpscyber.edu.in",
      adminName: "Dr. Anita Sharma",
      adminEmail: "admin@dpscyber.edu.in",
      password: secureDemoPassword("DEMO_SCHOOL_PASSWORD", "school123"),
      maxStudents: 300,
    },
    {
      schoolCode: "GXC-MUMBAI-002",
      name: "Mumbai Institute of Technology",
      type: "COLLEGE",
      email: "contact@mitcyber.ac.in",
      phone: "+91 22 2654 3210",
      address: "Powai, Mumbai",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      website: "https://mitcyber.ac.in",
      adminName: "Prof. Rajesh Iyer",
      adminEmail: "principal@mitcyber.ac.in",
      password: secureDemoPassword("DEMO_COLLEGE_PASSWORD", "college123"),
      maxStudents: 1000,
    },
    {
      schoolCode: "GXU-BANGALORE-003",
      name: "Bangalore Cyber Security University",
      type: "UNIVERSITY",
      email: "registrar@bcsu.edu.in",
      phone: "+91 80 2293 9876",
      address: "Jnanabharathi Campus",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
      website: "https://bcsu.edu.in",
      adminName: "Dr. Lakshmi Venkatesh",
      adminEmail: "vc@bcsu.edu.in",
      password: secureDemoPassword("DEMO_UNIVERSITY_PASSWORD", "university123"),
      maxStudents: 2000,
    },
  ]

  for (const s of schools) {
    const { password, ...rest } = s
    const passwordHash = bcrypt.hashSync(password, 10) // password resolved below via secureDemoPassword
    const existing = await db.school.findUnique({ where: { schoolCode: rest.schoolCode } })
    if (existing) {
      await db.school.update({ where: { id: existing.id }, data: { ...rest, passwordHash } })
      console.log(`  Updated: ${rest.name} (${rest.schoolCode})`)
    } else {
      await db.school.create({ data: { ...rest, passwordHash } })
      console.log(`  Created: ${rest.name} (${rest.schoolCode})`)
    }
  }

  console.log("\nDemo school login credentials:")
  console.log("  School:     GXS-DELHI-001 | admin@dpscyber.edu.in | (see DEMO_SCHOOL_PASSWORD)")
  console.log("  College:    GXC-MUMBAI-002 | principal@mitcyber.ac.in | (see DEMO_COLLEGE_PASSWORD)")
  console.log("  University: GXU-BANGALORE-003 | vc@bcsu.edu.in | (see DEMO_UNIVERSITY_PASSWORD)")
  console.log("\nDone.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
