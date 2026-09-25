import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./card-fx.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers/providers";
import { ServiceWorkerRegister } from "@/components/providers/service-worker-register";
import { HydrationFlag } from "@/components/platform/hydration-flag";
import { CardFx } from "@/components/platform/card-fx";

/**
 * Client recovery scripts, inlined in <head> so they run before React.
 *
 * 1. Chunk-error auto-reload - if a /_next/static script/stylesheet fails to
 *    load (typical after a deploy when the browser holds a stale HTML shell),
 *    reload ONCE to fetch the fresh build. Guarded by sessionStorage so we
 *    never reload-loop; the guard self-clears after 20s of healthy load.
 *
 * 2. Reveal rescue timer - if hydration has not completed ~2.5s after DOM
 *    ready, add `gx-reveal-rescue` to <html>. Combined with the failsafe CSS
 *    in globals.css this forces all scroll-reveal content visible, so a
 *    broken/partial hydration can NEVER leave pages permanently blank.
 */
const CLIENT_RECOVERY_SCRIPT = `
(function () {
  try {
    var KEY = "gx_chunk_reload";
    function chunky(msg, src) {
      if (src && /\\/_next\\/static/.test(src)) return true;
      msg = msg || "";
      return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported|error loading dynamically imported/i.test(msg);
    }
    function reloadOnce() {
      try {
        if (sessionStorage.getItem(KEY)) return;
        sessionStorage.setItem(KEY, String(Date.now()));
      } catch (_) { return; }
      location.reload();
    }
    window.addEventListener("error", function (e) {
      var t = e && e.target;
      if (t && (t.tagName === "SCRIPT" || t.tagName === "LINK") && t.src && /\\/_next\\/static/.test(t.src)) { reloadOnce(); return; }
      if (chunky(e && e.message)) reloadOnce();
    }, true);
    window.addEventListener("unhandledrejection", function (e) {
      var r = e && e.reason;
      var m = r && (r.message || String(r)) || "";
      if (chunky(m)) reloadOnce();
    });
    setTimeout(function () {
      try { sessionStorage.removeItem(KEY); } catch (_) {}
    }, 20000);
    var armRescue = function () {
      setTimeout(function () {
        if (document.documentElement.classList.contains("gx-hydrated")) return;
        document.documentElement.classList.add("gx-reveal-rescue");
        forceVisible();
        setTimeout(forceVisible, 4000);
      }, 2500);
    };
    /* Last-resort sweep: reveal anything still hidden by inline/computed
       styles (covers CSSOM-set opacity that attribute selectors cannot see).
       Runs ONLY in rescue mode - a broken browser must never hide content. */
    var forceVisible = function () {
      try {
        var els = document.querySelectorAll("body *");
        for (var i = 0; i < els.length; i++) {
          var el = els[i];
          if (el.closest && el.closest('[aria-hidden="true"]')) continue;
          var cs = window.getComputedStyle(el);
          if (!cs || cs.display === "none" || cs.visibility === "hidden") continue;
          if (parseFloat(cs.opacity) < 0.05) {
            el.style.setProperty("opacity", "1", "important");
            el.style.setProperty("transform", "none", "important");
            el.style.setProperty("filter", "none", "important");
            if ((cs.clipPath || "").indexOf("inset") === 0) {
              el.style.setProperty("clip-path", "inset(0% 0% 0% 0%)", "important");
            }
          }
        }
      } catch (_) {}
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", armRescue);
    } else {
      armRescue();
    }
  } catch (_) {}
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://academy.guardianx.cloud"),
  title: {
    default: "GuardianX Academy - Cyber Security Training in India | CEH, CISSP, CCNA",
    template: "%s · GuardianX Academy",
  },
  description:
    "India's premier cybersecurity training platform. Live instructor-led courses for CEH, CISSP, CCNA, CCNP, RHCSA, WAPT, OSCP & CyberArk PAM. Hands-on labs, cyber range, CTF arena, proctored exams, and verifiable certifications. Serving students, professionals & institutions across India including Jammu & Kashmir.",
  keywords: [
    "cybersecurity training India",
    "cyber security training Jammu Kashmir",
    "ethical hacking course India",
    "CEH certification India",
    "CISSP training India",
    "CCNA course India",
    "CCNP training",
    "RHCSA certification",
    "WAPT certification",
    "OSCP training India",
    "CyberArk PAM training",
    "cyber range India",
    "hands-on labs cybersecurity",
    "CTF arena India",
    "penetration testing course",
    "SOC analyst training",
    "security training online India",
    "cyber security certification India",
    "GuardianX Academy",
    "cyber security Jammu",
    "cyber security Kashmir",
    "ethical hacking Jammu Kashmir",
    "cyber security course J&K",
  ],
  authors: [{ name: "GuardianX" }],
  creator: "GuardianX",
  publisher: "GuardianX Academy",
  applicationName: "GuardianX Academy",
  category: "Education",
  // NOTE: no layout-level `alternates.canonical` - a canonical here would be
  // inherited by EVERY page, telling Google all pages are copies of the
  // homepage (actively de-indexes the site). Each page sets its own
  // self-referencing canonical instead.
  openGraph: {
    title: "GuardianX Academy - Cyber Security Training Operating System",
    description:
      "Master cybersecurity by actually breaking things. Real cyber range, hands-on labs, certification tracks, CTF arena, and career paths. Learn. Break. Defend. Prove.",
    url: "https://academy.guardianx.cloud",
    siteName: "GuardianX Academy",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "GuardianX Academy - Learn. Break. Defend. Prove.",
        type: "image/png",
      },
      {
        url: "/guardianx-logo-v2.png",
        width: 512,
        height: 512,
        alt: "GuardianX Academy logo",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@guardianx",
    creator: "@guardianx",
    title: "GuardianX Academy - Cyber Security Training Operating System",
    description:
      "Master cybersecurity by actually breaking things. Real cyber range, hands-on labs, certification tracks, CTF arena, and career paths. Learn. Break. Defend. Prove.",
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: "GuardianX",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
  // To enable Google Search Console meta-tag verification, replace the
  // placeholder below with the real `google-site-verification` token from
  // Search Console (Settings → Ownership verification → HTML tag).
  // verification: { google: "<REAL_TOKEN_FROM_SEARCH_CONSOLE>" },
  icons: {
    icon: [
      { url: "/guardianx-logo-v2.png", type: "image/png", sizes: "32x32" },
      { url: "/guardianx-logo-v2.png", type: "image/png", sizes: "192x192" },
      { url: "/guardianx-logo-v2.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/guardianx-logo-v2.png", sizes: "180x180", type: "image/png" },
      { url: "/guardianx-logo-v2.png", sizes: "192x192", type: "image/png" },
      { url: "/guardianx-logo-v2.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/guardianx-logo-v2.png"],
    other: [
      { rel: "mask-icon", url: "/guardianx-logo-v2.png", color: "#7c3aed" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
    { media: "(prefers-color-scheme: light)", color: "#7c3aed" },
    { color: "#7c3aed" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="GuardianX Academy" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GuardianX" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="geo.region" content="IN-JK" />
        <meta name="geo.placename" content="Jammu and Kashmir, India" />
        <meta name="geo.position" content="34.0837;74.7973" />
        <meta name="ICBM" content="34.0837, 74.7973" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/guardianx-logo-v2.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/guardianx-logo-v2.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/guardianx-logo-v2.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/guardianx-logo-v2.png" />
        <link rel="shortcut icon" href="/guardianx-logo-v2.png" />
        <link rel="mask-icon" href="/guardianx-logo-v2.png" color="#7c3aed" />
        {/* JSON-LD: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              name: "GuardianX Academy",
              description: "India's premier cybersecurity training platform. Live instructor-led courses for CEH, CISSP, CCNA, CCNP, RHCSA, WAPT, OSCP & CyberArk PAM. Hands-on labs, cyber range, CTF arena, proctored exams, and verifiable certifications.",
              url: "https://academy.guardianx.cloud",
              logo: "https://academy.guardianx.cloud/guardianx-logo-v2.png",
              sameAs: [
                "https://www.linkedin.com/company/guardianx-academy/",
                "https://www.youtube.com/@guardianx-academy",
                "https://www.instagram.com/guardianx.academy",
                "https://whatsapp.com/channel/0029VbBpCY98KMqcAkZuIJ1e",
              ],
              address: {
                "@type": "PostalAddress",
                addressLocality: "Jammu",
                addressRegion: "Jammu and Kashmir",
                addressCountry: "IN",
              },
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                email: "academy@guardianx.in",
                availableLanguage: "English",
              },
            }),
          }}
        />
        {/* Client recovery: chunk-error reload + reveal rescue (see above) */}
        <script dangerouslySetInnerHTML={{ __html: CLIENT_RECOVERY_SCRIPT }} />
        {/* JSON-LD: WebSite with Search Action */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "GuardianX Academy",
              url: "https://academy.guardianx.cloud",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://academy.guardianx.cloud/courses?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        {/* JSON-LD: FAQ Page */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "What cybersecurity certifications does GuardianX Academy offer?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "GuardianX Academy offers certification training for CEH (Certified Ethical Hacker), CISSP, CCNA, CCNP, RHCSA, WAPT, OSCP, CyberArk PAM, Security+, and more. Each course includes live instructor-led training, hands-on labs, study materials, mock exams, and proctored certification exams.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Is GuardianX Academy available in Jammu and Kashmir?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes, GuardianX Academy provides online cybersecurity training across all of India, including Jammu and Kashmir. Our live instructor-led batches are scheduled at convenient times for students and working professionals in J&K. We also offer on-campus training programs for schools, colleges, and universities in the region.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How much do cybersecurity courses cost in India?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "GuardianX Academy offers flexible pricing with free and paid tiers. Certification courses like CEH, CISSP, CCNA range from affordable batch enrollments to premium 1-on-1 instructor sessions. We also offer subscription plans (Free, Pro, Enterprise) for unlimited access. Coupon codes and discounts are available.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Do GuardianX certifications have verification?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes, every GuardianX credential is cryptographically signed and publicly verifiable at academy.guardianx.cloud/verify. Employers and recruiters can verify any certificate by entering the credential ID. Certificate revocation and status changes are fully auditable.",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-violet-600 focus:text-white focus:rounded-lg focus:shadow-lg"
        >
          Skip to main content
        </a>
        <HydrationFlag />
        <CardFx />
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
        <Toaster />
        <SonnerToaster />
      </body>
    </html>
  );
}
// trigger rebuild 1788873422
