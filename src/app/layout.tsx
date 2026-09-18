import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers/providers";
import { ServiceWorkerRegister } from "@/components/providers/service-worker-register";

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
    default: "GuardianX Academy — Cyber Security Training in India | CEH, CISSP, CCNA",
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
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "GuardianX Academy — Cyber Security Training Operating System",
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
        alt: "GuardianX Academy — Learn. Break. Defend. Prove.",
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
    title: "GuardianX Academy — Cyber Security Training Operating System",
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
  verification: {
    google: "guardianx-academy-google-site-verification",
  },
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
                "https://www.linkedin.com/company/guardianx-academy",
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
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
        <Toaster />
        <SonnerToaster />
      </body>
    </html>
  );
}
// trigger rebuild 1788873422
