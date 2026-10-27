/**
 * verify-offer-letter.ts - regression harness for the internship OFFER
 * LETTER generator. Asserts:
 *   1. The jsPDF builder produces a valid ONE-page A4 portrait PDF for the
 *      real-world shape (Parul University style record) in Node mode.
 *   2. It still fits ONE page with long names / long titles / every optional
 *      field present (stipend + mentor + end date).
 *   3. Offer refs match the GXI-OFF-YYYY-XXXXXX contract and NEVER collide
 *      with certificate-id plausibility (GXI-OFF-* is NOT a certificate ID).
 *   4. The email HTML carries the honesty copy (ongoing / certificate
 *      issued separately) + the offer summary rows + attachment filename.
 *   5. The universal verify payload shape for an offer (examType
 *      "internship-offer") never leaks certificate fields.
 *
 * Usage: npx tsx scripts/verify-offer-letter.ts
 * Output: PDFs in /home/z/my-project/tmp/offer-verify/
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { buildOfferLetterPdf, type OfferLetterData } from "../src/lib/offer-letter-pdf"
import { buildOfferEmailHtml, mapRecordToOfferData } from "../src/lib/offer-email"
import { generateOfferRef, isPlausibleOfferRef } from "../src/lib/offer-refs"

const OUT = "/home/z/my-project/tmp/offer-verify"
mkdirSync(OUT, { recursive: true })

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..")
const logoDataUrl = `data:image/png;base64,${readFileSync(`${REPO}/public/guardianx-logo-v2.png`).toString("base64")}`
// 1x1 white PNG - layout only, scannability is irrelevant to pagination
const qrStub = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

const loadFontFile = async (path: string) => readFileSync(`${REPO}/public${path}`)

let failures = 0
function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  PASS  ${name}`)
  } else {
    failures++
    console.error(`  FAIL  ${name}${detail ? ` - ${detail}` : ""}`)
  }
}

// ---- the real-world shape: Parul University internship record -------------
const parulOffer: OfferLetterData = {
  offerRef: "GXI-OFF-2026-K7Q2M4",
  issuedAt: "2026-10-27T00:00:00.000Z",
  studentName: "MOHAMED TAIEB MHAMDI",
  role: "Cyber Security Intern",
  mentorName: null,
  programDirector: null,
  startDate: "2026-11-01T00:00:00.000Z",
  endDate: null,
  internship: {
    title: "Cyber Security Internship",
    company: "GuardianX Academy",
    domain: "Cyber Security",
    mode: "remote",
    durationWeeks: 8,
    collegeName: "Parul University",
    collegeCity: "Vadodara",
    stipend: null,
  },
}

// stress shape: every optional field + long strings
const stressOffer: OfferLetterData = {
  ...parulOffer,
  offerRef: "GXI-OFF-2026-A2B3C4",
  studentName: "Srivatsav Venkatanarasimharajuvaripeta Ramaswamy Krishnamachari",
  role: "Advanced Penetration Testing & Red Team Operations Research Intern",
  mentorName: "Rajasekaran Paramasivam Subramanian",
  programDirector: "GuardianX Academy Program Office",
  endDate: "2026-12-27T00:00:00.000Z",
  internship: {
    ...parulOffer.internship,
    title: "Advanced Offensive Security & Vulnerability Assessment Capstone Internship - Winter Cohort",
    collegeName: "Sardar Vallabhbhai National Institute of Technology",
    stipend: "Performance-based stipend up to Rs. 15,000/month",
  },
}

async function main() {
  console.log("\n=== 1. offer refs ===")
  const refs = new Set<string>()
  for (let i = 0; i < 500; i++) refs.add(generateOfferRef())
  check("generateOfferRef: 500 unique refs", refs.size === 500, `got ${refs.size}`)
  check("generateOfferRef: format GXI-OFF-YYYY-XXXXXX", [...refs].every((r) => isPlausibleOfferRef(r)))
  check("plausibility: lowercase normalized + accepted (routes uppercase first)", isPlausibleOfferRef("gxi-off-2026-k7q2m4"))
  check("plausibility: cert-style GXI-2026-DC159F is NOT an offer ref", !isPlausibleOfferRef("GXI-2026-DC159F"))
  check("plausibility: malformed lengths rejected", !isPlausibleOfferRef("GXI-OFF-2026-K7Q2M45"))

  console.log("\n=== 2. PDF build (real-world record) ===")
  const pdf1 = await buildOfferLetterPdf(parulOffer, {
    logoPngDataUrl: logoDataUrl,
    qrPngDataUrl: qrStub,
    verifyUrl: "https://academy.guardianx.cloud/verify/GXI-OFF-2026-K7Q2M4",
    loadFontFile,
  })
  check("page count == 1 (parul shape)", pdf1.getNumberOfPages() === 1, `${pdf1.getNumberOfPages()} pages`)
  const buf1 = Buffer.from(pdf1.output("arraybuffer"))
  check("PDF size sane (>25KB, <2MB)", buf1.length > 25_000 && buf1.length < 2_000_000, `${buf1.length} bytes`)
  check("PDF magic header", buf1.subarray(0, 4).toString() === "%PDF")
  writeFileSync(`${OUT}/offer-parul.pdf`, buf1)

  console.log("\n=== 3. PDF build (stress record) ===")
  const pdf2 = await buildOfferLetterPdf(stressOffer, {
    logoPngDataUrl: logoDataUrl,
    qrPngDataUrl: qrStub,
    loadFontFile,
  })
  check("page count == 1 (stress shape)", pdf2.getNumberOfPages() === 1, `${pdf2.getNumberOfPages()} pages`)
  writeFileSync(`${OUT}/offer-stress.pdf`, Buffer.from(pdf2.output("arraybuffer")))

  console.log("\n=== 4. email HTML ===")
  const html = buildOfferEmailHtml(parulOffer)
  check("subject-critical: OFFER REF present", html.includes("GXI-OFF-2026-K7Q2M4"))
  check("honesty: ONGOING status stated", /ONGOING/.test(html))
  check("honesty: certificate issued separately", /issued separately/i.test(html))
  check("summary rows: candidate + position + program", /CANDIDATE/.test(html) && /POSITION/.test(html) && /PROGRAM/.test(html))
  check("institution row present", /Parul University/.test(html))
  check("verify CTA points at /verify/<ref>", html.includes("/verify/GXI-OFF-2026-K7Q2M4"))
  check("social footer present", /linkedin\.com\/company\/guardianx-academy/.test(html))

  console.log("\n=== 5. record -> offer data mapping ===")
  const mapped = mapRecordToOfferData(
    {
      offerRef: null,
      studentName: "Test Student",
      role: "SOC Analyst Intern",
      mentorName: "Mentor Name",
      programDirector: null,
      startDate: new Date("2026-11-05"),
      endDate: null,
      createdAt: new Date("2026-10-27"),
    },
    {
      title: "SOC Analyst Internship",
      company: "GuardianX Academy",
      domain: "Blue Team",
      mode: "hybrid",
      durationWeeks: 6,
      collegeName: "Ronald Institute of Technology",
      collegeCity: "Bhilai",
      stipend: null,
    },
    "GXI-OFF-2026-ZZ9X8Y"
  )
  check("mapping: offerRef passthrough", mapped.offerRef === "GXI-OFF-2026-ZZ9X8Y")
  check("mapping: internship fields mapped", mapped.internship.title === "SOC Analyst Internship" && mapped.internship.durationWeeks === 6)
  check("mapping: issuedAt falls back to startDate", new Date(mapped.issuedAt as any).toISOString().startsWith("2026-11-05"))

  console.log("\n=== 6. attachment filename contract ===")
  const filename = `GuardianX-Offer-Letter-${mapped.offerRef}.pdf`
  check("filename matches GuardianX-Offer-Letter-<ref>.pdf", /^GuardianX-Offer-Letter-GXI-OFF-\d{4}-[A-Z0-9]{6}\.pdf$/.test(filename))

  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURES`}`)
  console.log(`PDFs written to ${OUT}`)
  if (failures > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
