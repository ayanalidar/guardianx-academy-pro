"use client"

import { api } from "@/lib/api"

// Opens a print-optimized certificate in a new window and triggers the browser's
// "Save as PDF" print dialog. Produces a vector PDF with no server-side rendering.
export async function downloadCertificatePDF(certificateId: string) {
  try {
    const data = await api<{ certificate: any }>(`/api/certificates/${certificateId}/pdf`)
    const cert = data.certificate
    if (!cert) throw new Error("Certificate not found")

    const html = buildCertificateHTML(cert)
    const w = window.open("", "_blank", "width=1100,height=850")
    if (!w) {
      alert("Please allow pop-ups to download your certificate.")
      return
    }
    w.document.write(html)
    w.document.close()
    // wait for fonts/images to load, then trigger print
    w.onload = () => {
      setTimeout(() => {
        w.focus()
        w.print()
      }, 500)
    }
  } catch (e: any) {
    console.error("[cert-pdf]", e)
    alert("Failed to generate certificate PDF: " + e.message)
  }
}

function buildCertificateHTML(cert: any): string {
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  })
  const colorMap: Record<string, { primary: string; glow: string }> = {
    emerald: { primary: "#34d399", glow: "rgba(52,211,153,0.20)" },
    cyan: { primary: "#22d3ee", glow: "rgba(34,211,238,0.20)" },
    teal: { primary: "#2dd4bf", glow: "rgba(45,212,191,0.20)" },
    red: { primary: "#fb7185", glow: "rgba(251,113,133,0.20)" },
    violet: { primary: "#a78bfa", glow: "rgba(167,139,250,0.22)" },
    amber: { primary: "#fbbf24", glow: "rgba(251,191,36,0.20)" },
    orange: { primary: "#fb923c", glow: "rgba(251,146,60,0.20)" },
  }
  const c = colorMap[cert.course.color] ?? colorMap.cyan

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>GuardianX Certificate — ${escapeHtml(cert.user.name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: landscape; margin: 0; }
  html, body {
    width: 100%; height: 100%;
    font-family: 'Inter', -apple-system, sans-serif;
    background: #0b0c1d;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* ============ AURORA GLASS CERTIFICATE ============ */
  .cert {
    width: 1100px; height: 850px;
    margin: 0 auto;
    position: relative;
    color: #f4f6ff;
    overflow: hidden;
    background:
      radial-gradient(900px 520px at 88% -12%, ${c.glow}, transparent 62%),
      radial-gradient(760px 480px at -8% 42%, rgba(34,211,238,0.14), transparent 58%),
      radial-gradient(680px 420px at 55% 118%, rgba(217,70,239,0.13), transparent 58%),
      linear-gradient(158deg, #1c1244 0%, #150e30 46%, #0b0c1d 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 56px;
  }
  /* soft aurora blobs (no grid — pure glass) */
  .blob { position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none; }
  .blob.b1 { top: -140px; right: -60px; width: 420px; height: 420px; background: ${c.glow}; opacity: .8; }
  .blob.b2 { bottom: -160px; left: -80px; width: 460px; height: 460px; background: rgba(34,211,238,0.14); }
  .blob.b3 { top: 40%; left: 42%; width: 260px; height: 260px; background: rgba(217,70,239,0.12); }

  /* double frame: outer hairline + inner tinted */
  .frame-outer {
    position: absolute; inset: 26px;
    border: 1.5px solid rgba(255,255,255,0.14);
    border-radius: 20px;
    pointer-events: none;
  }
  .frame-inner {
    position: absolute; inset: 36px;
    border: 1px solid ${c.primary}4d;
    border-radius: 14px;
    pointer-events: none;
  }
  /* corner light accents */
  .corner { position: absolute; width: 74px; height: 74px; pointer-events: none; }
  .corner.tl { top: 26px; left: 26px; border-top: 2.5px solid ${c.primary}; border-left: 2.5px solid; border-radius: 20px 0 0 0; }
  .corner.tr { top: 26px; right: 26px; border-top: 2.5px solid ${c.primary}; border-right: 2.5px solid; border-radius: 0 20px 0 0; }
  .corner.bl { bottom: 26px; left: 26px; border-bottom: 2.5px solid ${c.primary}; border-left: 2.5px solid; border-radius: 0 0 0 20px; }
  .corner.br { bottom: 26px; right: 26px; border-bottom: 2.5px solid ${c.primary}; border-right: 2.5px solid; border-radius: 0 0 20px 0; }

  .header { text-align: center; position: relative; z-index: 2; }
  .logo { display: inline-flex; align-items: center; gap: 14px; margin-bottom: 22px; }
  .logo-shield { width: 54px; height: 54px; display: flex; align-items: center; justify-content: center; }
  .logo-text { font-size: 30px; font-weight: 800; letter-spacing: -0.02em; color: #ffffff; }
  .logo-text span { color: ${c.primary}; }
  .logo-sub {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px; letter-spacing: 0.34em;
    color: rgba(226,232,255,0.66); margin-top: 3px;
  }
  .cert-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; letter-spacing: 0.42em;
    color: ${c.primary};
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  /* glass panel holding the recipient + course — the hero of the design */
  .glass-hero {
    position: relative; z-index: 2;
    text-align: center;
    background: linear-gradient(to bottom, rgba(255,255,255,0.075), rgba(255,255,255,0.035));
    border: 1px solid rgba(255,255,255,0.13);
    border-radius: 22px;
    padding: 34px 70px 30px;
    margin: 6px 0 26px;
    backdrop-filter: blur(18px) saturate(1.35);
    -webkit-backdrop-filter: blur(18px) saturate(1.35);
    box-shadow: 0 24px 70px rgba(3, 5, 18, 0.45), inset 0 1px 0 rgba(255,255,255,0.12);
  }
  .presented-to {
    font-size: 11px; color: rgba(226,232,255,0.66);
    text-transform: uppercase; letter-spacing: 0.24em;
    margin-bottom: 10px;
  }
  .student-name {
    font-size: 44px; font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.015em;
    line-height: 1.08;
  }
  .student-name::after {
    content: '';
    display: block;
    width: 220px; height: 2.5px; border-radius: 2px;
    background: linear-gradient(90deg, transparent, ${c.primary}, transparent);
    margin: 14px auto 0;
  }
  .course-label {
    font-size: 11px; color: rgba(226,232,255,0.66);
    text-transform: uppercase; letter-spacing: 0.24em;
    margin: 22px 0 8px;
  }
  .course-name {
    font-size: 24px; font-weight: 700;
    color: ${c.primary};
    margin-bottom: 6px;
  }
  .course-meta { font-size: 13px; color: rgba(226,232,255,0.78); }

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    width: 100%;
    max-width: 860px;
    position: relative; z-index: 2;
    gap: 18px;
  }
  .sig-block {
    text-align: center;
    min-width: 210px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.11);
    border-radius: 14px;
    padding: 14px 18px 12px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .sig-name { font-size: 14px; font-weight: 600; color: #ffffff; }
  .sig-title { font-size: 10px; color: rgba(226,232,255,0.72); margin-bottom: 10px; }
  .sig-line { width: 100%; height: 1px; background: linear-gradient(90deg, transparent, ${c.primary}99, transparent); margin-bottom: 7px; }
  .sig-label { font-size: 9px; color: rgba(226,232,255,0.6); text-transform: uppercase; letter-spacing: 0.18em; }

  .cert-id-block {
    text-align: center;
    font-family: 'JetBrains Mono', monospace;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.11);
    border-radius: 14px;
    padding: 14px 22px 12px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .cert-id-label { font-size: 9px; color: rgba(226,232,255,0.6); text-transform: uppercase; letter-spacing: 0.22em; margin-bottom: 4px; }
  .cert-id { font-size: 12px; color: ${c.primary}; font-weight: 500; }
  .cert-date { font-size: 11px; color: rgba(226,232,255,0.78); margin-top: 7px; }
  .cert-score { font-size: 11px; color: rgba(226,232,255,0.78); margin-top: 2px; }

  /* gold official seal */
  .seal {
    position: absolute;
    top: 64px; right: 72px;
    width: 108px; height: 108px;
    border-radius: 50%;
    background: radial-gradient(circle at 32% 28%, #ffe9a8 0%, #f5c451 38%, #c8901c 78%, #9a6a10 100%);
    box-shadow: 0 10px 34px rgba(245, 196, 81, 0.35), inset 0 2px 6px rgba(255,255,255,0.5), inset 0 -4px 10px rgba(122,84,10,0.55);
    display: flex; align-items: center; justify-content: center;
    z-index: 2;
  }
  .seal-ring {
    width: 86px; height: 86px;
    border-radius: 50%;
    border: 1.5px dashed rgba(90, 60, 5, 0.55);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    color: #5a3c05;
  }
  .seal-star { font-size: 22px; line-height: 1; }
  .seal-text { font-size: 6.6px; font-weight: 800; letter-spacing: 0.14em; margin-top: 3px; }
</style>
</head>
<body>
<div class="cert">
  <div class="blob b1"></div>
  <div class="blob b2"></div>
  <div class="blob b3"></div>
  <div class="frame-outer"></div>
  <div class="frame-inner"></div>
  <div class="corner tl"></div>
  <div class="corner tr"></div>
  <div class="corner bl"></div>
  <div class="corner br"></div>

  <div class="seal">
    <div class="seal-ring">
      <div class="seal-star">&#9733;</div>
      <div class="seal-text">OFFICIAL SEAL</div>
      <div class="seal-text">GUARDIANX</div>
    </div>
  </div>

  <div class="header">
    <div class="logo">
      <div class="logo-shield">
        <svg width="54" height="54" viewBox="0 0 100 100" fill="none">
          <path d="M50 8 L84 22 V52 C84 72 68 88 50 94 C32 88 16 72 16 52 V22 Z" stroke="${c.primary}" stroke-width="4" fill="none"/>
          <path d="M36 50 L45 59 L66 38" stroke="${c.primary}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </div>
      <div>
        <div class="logo-text">Guardian<span>X</span></div>
        <div class="logo-sub">SECURE · LEARN · DEFEND</div>
      </div>
    </div>
    <div class="cert-label">Certificate of Completion</div>
  </div>

  <div class="glass-hero">
    <div class="presented-to">This is to certify that</div>
    <div class="student-name">${escapeHtml(cert.user.name)}</div>
    <div class="course-label">has successfully completed</div>
    <div class="course-name">${escapeHtml(cert.course.title)}</div>
    <div class="course-meta">${escapeHtml(cert.course.certBody || "GuardianX")} · ${escapeHtml(cert.course.category)} · ${escapeHtml(cert.course.level)} Level</div>
  </div>

  <div class="footer">
    <div class="sig-block">
      <div class="sig-name">${escapeHtml(cert.course.instructor.name)}</div>
      <div class="sig-title">${escapeHtml(cert.course.instructor.title || "Instructor")}</div>
      <div class="sig-line"></div>
      <div class="sig-label">Instructor</div>
    </div>
    <div class="cert-id-block">
      <div class="cert-id-label">Certificate ID</div>
      <div class="cert-id">${escapeHtml(cert.certificateId)}</div>
      <div class="cert-date">Issued ${issuedDate}</div>
      <div class="cert-score">Score: ${cert.score}%</div>
    </div>
    <div class="sig-block">
      <div class="sig-name">GuardianX</div>
      <div class="sig-title">Cyber Security Academy</div>
      <div class="sig-line"></div>
      <div class="sig-label">Platform</div>
    </div>
  </div>
</div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
