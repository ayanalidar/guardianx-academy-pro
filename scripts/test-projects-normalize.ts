/**
 * Sanity test for src/lib/internship-projects.ts - run with:
 *   npx tsx scripts/test-projects-normalize.ts
 * Exercises every shape the API and admin dialog can receive,
 * including the legacy "[object Object]" corrupted rows from prod.
 */
import { normalizeProjectEntries, projectsJson } from "../src/lib/internship-projects"

let failures = 0
function check(name: string, got: unknown, wantTitle: string | null, wantDesc = "") {
  const arr = got as { title: string; description: string }[]
  if (wantTitle === null) {
    if (arr.length !== 0) {
      console.log(`FAIL ${name}: expected empty, got ${JSON.stringify(arr)}`)
      failures++
    } else console.log(`PASS ${name}: dropped -> []`)
    return
  }
  const first = arr[0]
  if (!first || first.title !== wantTitle || (first.description ?? "") !== wantDesc) {
    console.log(`FAIL ${name}: got ${JSON.stringify(arr)}`)
    failures++
  } else {
    console.log(`PASS ${name}: -> ${JSON.stringify(arr)}`)
  }
}

// 1. What the NEW admin dialog sends: array of {title, description}
check(
  "structured objects",
  normalizeProjectEntries([
    { title: "Web App VAPT Capstone", description: "Full-scope assessment of a dummy e-commerce app" },
    { title: "Network Pentest Drill", description: "" },
  ]),
  "Web App VAPT Capstone",
  "Full-scope assessment of a dummy e-commerce app"
)

// 2. THE BUG: what the OLD dialog sent -> what the OLD API stored (corrupted DB rows)
check(
  "legacy corrupted strings (from DB)",
  normalizeProjectEntries(JSON.stringify(["[object Object]", "[object Object]", "[object Object]"])),
  null
)

// 3. Old-client payloads: array of objects hit by old API would never happen,
//    but a bare string of objects serialized must still parse.
check(
  "json string of structured objects (DB column content)",
  normalizeProjectEntries(JSON.stringify([{ title: "Phishing Simulation Lab", description: "Built the lure templates" }])),
  "Phishing Simulation Lab",
  "Built the lure templates"
)

// 4. Plain-text fallback (pipes and newlines, commas preserved inside titles)
check(
  "plain text pipes",
  normalizeProjectEntries("Web App VAPT, API Pentest | Cloud Audit"),
  "Web App VAPT, API Pentest"
)
check("plain text newlines", normalizeProjectEntries("First Project\nSecond Project"), "First Project")

// 5. Edge cases: description-only entry, empty boxes, object-object title inside object
check(
  "description-only object",
  normalizeProjectEntries([{ description: "Built a SIEM dashboard from scratch" }]),
  "Built a SIEM dashboard from scratch",
  "Built a SIEM dashboard from scratch"
)
check("empty mixed junk", normalizeProjectEntries([null, "", { title: "" }, {}, "[object Object]"]), null)
check(
  "object with [object Object] title dropped",
  normalizeProjectEntries([{ title: "[object Object]" }, { title: "Real Project" }]),
  "Real Project"
)

// 6. Canonical serialization round-trip
const serialized = projectsJson([{ title: " A ", description: " B " }, "  ", "[object Object]"])
if (serialized === JSON.stringify([{ title: "A", description: "B" }])) {
  console.log(`PASS projectsJson round-trip: ${serialized}`)
} else {
  console.log(`FAIL projectsJson round-trip: ${serialized}`)
  failures++
}

// 7. Cap enforcement (25 projects max)
const many = Array.from({ length: 40 }, (_, i) => ({ title: `P${i}`, description: "" }))
const capped = normalizeProjectEntries(many) as { title: string }[]
console.log(capped.length === 25 ? "PASS cap 25" : `FAIL cap 25: got ${capped.length}`)
if (capped.length !== 25) failures++

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
