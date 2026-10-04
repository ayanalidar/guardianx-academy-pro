/**
 * Sanity test for the certificate PDF presentation overrides:
 *   npx tsx scripts/test-cert-presentation.ts
 * Checks name-size class selection + Program Director signature rendering
 * in buildCertificateHTML() output.
 */
import { buildCertificateHTML } from "../src/lib/certificate-pdf"

let failures = 0
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`PASS ${name}`)
  else {
    console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`)
    failures++
  }
}

const baseOpts = {
  theme: "phantom" as const,
  logoPngDataUrl: null,
  qrPngDataUrl: null,
  verifyUrl: "https://academy.guardianx.cloud/verify/GXI-TEST",
}

const base = {
  certificateId: "GXI-TEST",
  issuedAt: "2026-10-04T00:00:00.000Z",
  score: null,
  grade: "Outstanding",
  user: { name: "MOHAMED TAIEB MHAMDI" },
  course: {
    title: "Offensive Security",
    certBody: "GuardianX",
    category: "Internship",
    level: "8-Week",
    instructor: { name: "S. Rao" },
  },
}

// 1. Default (no nameSize, 20-char name) -> regular
let html = buildCertificateHTML({ ...base }, baseOpts)
check("default -> sz-regular", html.includes('class="recipient sz-regular"'))
check("regular default font 11.5mm", html.includes("font-size: 11.5mm"))
check("PD default GuardianX Academy", /<div class="sig-name">GuardianX Academy<\/div>\s*<div class="sig-rule"><div class="sig-role">Program Director<\/div>/.test(html))

// 2. Per-record large
html = buildCertificateHTML({ ...base, nameSize: "large" }, baseOpts)
check("nameSize large -> sz-large", html.includes('class="recipient sz-large"'))

// 3. Per-record compact
html = buildCertificateHTML({ ...base, nameSize: "compact" }, baseOpts)
check("nameSize compact -> sz-compact", html.includes('class="recipient sz-compact"'))

// 4. Auto-compact for very long names (>30 chars) without explicit size
html = buildCertificateHTML({ ...base, user: { name: "Jean-Baptiste de la Croix-Montmorency-Laval" } }, baseOpts)
check("long name auto -> sz-compact", html.includes('class="recipient sz-compact"'))

// 5. Per-record Program Director (with whitespace + html escaping)
html = buildCertificateHTML({ ...base, programDirector: "  Dr. Aman <Sharma>  " }, baseOpts)
check("custom PD rendered + escaped", html.includes("<div class=\"sig-name\">Dr. Aman &lt;Sharma&gt;</div>"))

// 6. nameSize junk value falls back to regular
html = buildCertificateHTML({ ...base, nameSize: "hUGE" }, baseOpts)
check("junk nameSize -> sz-regular", html.includes('class="recipient sz-regular"'))

// 7. Issue date override flows into the verification strip
html = buildCertificateHTML({ ...base, issuedAt: "2025-03-21T10:00:00.000Z" }, baseOpts)
check("custom issue date rendered", /Date of issue/.test(html) && /March/.test(html))

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
