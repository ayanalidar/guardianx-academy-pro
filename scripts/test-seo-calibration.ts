/* ============================================================
   Pure-logic verification for the SEO autopilot recalibration.
   No DB needed - run with: npx tsx scripts/test-seo-calibration.ts
   ============================================================ */

import {
  auditContent,
  generateSnippet,
  trimSnippet,
  projectScoreAfter,
  publicUrlFor,
  DESC_MIN,
  DESC_MAX,
  type ContentAuditRow,
} from "../src/lib/seo-autopilot";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ""}`); }
}

console.log("== constants ==");
check("DESC_MIN is 120 (audit full-credit floor)", DESC_MIN === 120);
check("DESC_MAX is 160 (SERP cut)", DESC_MAX === 160);

console.log("== generateSnippet minLen window ==");
const richSource = Array.from({ length: 60 }, (_, i) => `word${i} `).join("");
const s1 = generateSnippet(richSource, 155, DESC_MIN);
check("rich source lands in [120,160]", s1.length >= DESC_MIN && s1.length <= DESC_MAX, `len=${s1.length}`);
const longWord = "a".repeat(400);
const s2 = generateSnippet(longWord, 155, DESC_MIN);
check("no-space source still lands in [120,160]", s2.length >= DESC_MIN && s2.length <= DESC_MAX, `len=${s2.length}`);
const shortSource = "too short body";
const s3 = generateSnippet(shortSource, 155, DESC_MIN);
check("short source returned as-is (<120 -> caller rejects)", s3 === shortSource);
const midSource = "sentence one. ".repeat(30);
const s4 = generateSnippet(midSource, 155);
check("no minLen behaves like before (<=160)", s4.length <= 160, `len=${s4.length}`);

console.log("== trimSnippet ==");
const long300 = "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip commodo duis aute irure dolor in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur".slice(0, 300);
const t1 = trimSnippet(long300, 155, DESC_MIN);
check("300-char text trims into [120,160]", t1.length >= DESC_MIN && t1.length <= DESC_MAX, `len=${t1.length}`);
check("trim is shorter than input", t1.length < long300.length);
const noSpace = "x".repeat(300);
const t2 = trimSnippet(noSpace, 155, DESC_MIN);
check("no-space hard cut stays in [120,160]", t2.length >= DESC_MIN && t2.length <= DESC_MAX, `len=${t2.length}`);
const t3 = trimSnippet("already fine", 155, DESC_MIN);
check("short text returned unchanged", t3 === "already fine");

console.log("== auditContent calibration ==");
const rows: ContentAuditRow[] = [
  // 1. 90-char description + rich body -> fixable, generated in band
  {
    type: "course", id: "c1", title: "Complete Offensive Security Training", slug: "offensive-security",
    description: "Short-ish description that passes the old 70-char rule but not the new band.",
    longText: richSource, thumbnail: "/t.png", tags: "security", published: true,
  },
  // 2. 90-char description, NO body -> human action
  {
    type: "course", id: "c2", title: "Thin Content Course Offering", slug: "thin-course",
    description: "Short-ish description that passes the old 70-char rule but not the band.",
    thumbnail: "/t.png", published: true,
  },
  // 3. 300-char excerpt -> trim fix (blog uses excerpt field)
  {
    type: "blog", id: "b1", title: "Deep Dive Into Threat Intelligence Workflows", slug: "threat-intel",
    description: long300, thumbnail: "/t.png", published: true,
  },
  // 4. 140-char description -> clean (in band)
  {
    type: "event", id: "e1", title: "Live Webinar On Cloud Security Basics", slug: "cloud-webinar",
    description: ("In-band event description for the grader. " + "word ".repeat(40)).slice(0, 140).trim(),
    thumbnail: "/t.png", published: true,
  },
];

const audit = auditContent(rows);

const c1Issues = audit.issues.filter((i) => i.id === "c1");
const c1DescIssue = c1Issues.find((i) => i.issue.includes("too short"));
check("c1 (90 chars) now flagged too short", !!c1DescIssue);
const c1Fix = audit.fixes.find((f) => f.id === "c1" && f.field === "description");
check("c1 gets a description fix", !!c1Fix);
check("c1 fix lands in [120,160]", !!c1Fix && c1Fix.after.length >= DESC_MIN && c1Fix.after.length <= DESC_MAX, `len=${c1Fix?.after.length}`);

const c2Fix = audit.fixes.find((f) => f.id === "c2");
check("c2 (thin content) proposes NO fix", !c2Fix);
check("c2 gets a human action", audit.humanActions.some((h) => h.label.includes("Thin Content")));

const b1Fix = audit.fixes.find((f) => f.id === "b1");
check("b1 (300-char excerpt) gets trim fix", !!b1Fix && b1Fix.field === "excerpt");
check("b1 trim lands in [120,160]", !!b1Fix && b1Fix.after.length >= DESC_MIN && b1Fix.after.length <= DESC_MAX, `len=${b1Fix?.after.length}`);

const e1DescIssues = audit.issues.filter((i) => i.id === "e1" && i.issue.toLowerCase().includes("description"));
check("e1 (140 chars) has NO description issue", e1DescIssues.length === 0);

console.log("== projected score moves ==");
const projected = projectScoreAfter(audit);
check("projected scoreAfter > scoreBefore when fixes exist", projected > audit.scoreBefore, `before=${audit.scoreBefore} after=${projected}`);

console.log("== publicUrlFor page type ==");
check("page home url stays /", publicUrlFor("page", "/") === "/");
check("page hash url preserved", publicUrlFor("page", "/#/contact") === "/#/contact");
check("page bare key gets hash prefix", publicUrlFor("page", "pricing") === "/#/pricing");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
