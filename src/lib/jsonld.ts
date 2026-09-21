/* ============================================================
   JSON-LD structured-data builders (schema.org).

   Used by the dedicated detail pages (courses/[slug], blog/[slug],
   events/[slug], instructors/[id]) to emit rich-result-eligible
   markup. Builders are pure — they take plain rows and return a
   JSON-serializable object; pages render them via a
   <script type="application/ld+json"> tag.

   Google references:
   - Course info: https://developers.google.com/search/docs/appearance/structured-data/course-info
   - Article:     https://developers.google.com/search/docs/appearance/structured-data/article
   - Event:       https://developers.google.com/search/docs/appearance/structured-data/event
   ============================================================ */

import { SITE_URL } from "@/lib/site-url";

/** ISO-8601 duration (e.g. 40 hours → "P40H") for courseWorkload. */
function hoursToDuration(hours: number): string {
  const h = Math.max(1, Math.round(hours || 0));
  return `P${h}H`;
}

/** Only emit dates we can express as ISO — invalid markup is worse
 *  than no markup. Returns null when unusable. */
function safeIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export interface CourseJsonLdInput {
  title: string;
  shortName?: string | null;
  description?: string | null;
  slug: string;
  level?: string | null;
  price?: number | null;
  durationHours?: number | null;
  certBody?: string | null;
  tags?: string | null;
  thumbnail?: string | null;
  instructorName?: string | null;
}

export function courseJsonLd(c: CourseJsonLdInput): Record<string, unknown> {
  const url = `${SITE_URL}/courses/${c.slug}`;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: c.shortName ? `${c.title} (${c.shortName})` : c.title,
    description: (c.description || `${c.title} — live instructor-led cybersecurity training with hands-on labs from GuardianX Academy.`).slice(0, 300),
    url,
    provider: {
      "@type": "EducationalOrganization",
      name: "GuardianX Academy",
      sameAs: SITE_URL,
    },
    hasCourseInstance: [
      {
        "@type": "CourseInstance",
        courseMode: ["Online", "Onsite"],
        courseWorkload: hoursToDuration(c.durationHours ?? 40),
      },
    ],
  };
  if (c.level) data.educationalLevel = c.level;
  if (c.certBody) data.accreditingOrganization = { "@type": "Organization", name: c.certBody };
  if (typeof c.price === "number" && c.price > 0) {
    data.offers = {
      "@type": "Offer",
      price: c.price,
      priceCurrency: "INR",
      category: "Paid",
      url,
    };
  } else {
    data.offers = { "@type": "Offer", price: 0, priceCurrency: "INR", category: "Free", url };
  }
  if (c.thumbnail) {
    data.image = c.thumbnail.startsWith("http") ? c.thumbnail : `${SITE_URL}${c.thumbnail}`;
  }
  if (c.instructorName) {
    data.instructor = { "@type": "Person", name: c.instructorName };
  }
  if (c.tags) {
    const keywords = c.tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (keywords.length) data.keywords = keywords.join(", ");
  }
  return data;
}

export interface ArticleJsonLdInput {
  title: string;
  excerpt?: string | null;
  content?: string | null;
  slug: string;
  authorName?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  thumbnail?: string | null;
  tags?: string | null;
}

export function articleJsonLd(b: ArticleJsonLdInput): Record<string, unknown> {
  const url = `${SITE_URL}/blog/${b.slug}`;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: b.title.slice(0, 110),
    url,
    mainEntityOfPage: url,
    datePublished: safeIsoDate(b.createdAt as string) ?? undefined,
    dateModified: safeIsoDate(b.updatedAt as string) ?? undefined,
    author: { "@type": "Person", name: b.authorName || "GuardianX Faculty" },
    publisher: {
      "@type": "Organization",
      name: "GuardianX Academy",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/guardianx-logo-v2.png` },
    },
  };
  const desc = (b.excerpt || b.content || b.title).slice(0, 300);
  if (desc) data.description = desc;
  if (b.thumbnail) {
    data.image = b.thumbnail.startsWith("http") ? b.thumbnail : `${SITE_URL}${b.thumbnail}`;
  } else {
    data.image = `${SITE_URL}/og-default.png`;
  }
  if (b.tags) {
    const keywords = b.tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (keywords.length) data.keywords = keywords.join(", ");
  }
  return data;
}

export interface EventJsonLdInput {
  title: string;
  description?: string | null;
  slug: string;
  startIsoDate?: string | null;
  endDate?: string | null;
  mode?: string | null; // "Live Online" | "On-Campus" | "Hybrid"
  venue?: string | null;
  fee?: string | null; // "Free" | "₹500" etc.
  imageUrl?: string | null;
  organizerName?: string | null;
}

export function eventJsonLd(e: EventJsonLdInput): Record<string, unknown> | null {
  const start = safeIsoDate(e.startIsoDate);
  // Event rich results REQUIRE a machine-readable startDate; without one
  // the markup would be invalid — emit nothing instead.
  if (!start) return null;

  const url = `${SITE_URL}/events/${e.slug}`;
  const isOnline = (e.mode || "Live Online") !== "On-Campus";
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.title,
    startDate: start,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: isOnline
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    location: isOnline
      ? { "@type": "VirtualLocation", url }
      : { "@type": "Place", name: e.venue || "GuardianX Academy", address: e.venue || "Jammu, India" },
    url,
    organizer: {
      "@type": "Organization",
      name: e.organizerName || "GuardianX Academy",
      url: SITE_URL,
    },
  };
  const desc = (e.description || `${e.title} — hosted by GuardianX Academy.`).slice(0, 300);
  data.description = desc;
  const end = safeIsoDate(e.endDate);
  if (end) data.endDate = end;
  if (e.imageUrl) {
    data.image = e.imageUrl.startsWith("http") ? e.imageUrl : `${SITE_URL}${e.imageUrl}`;
  } else {
    data.image = `${SITE_URL}/og-default.png`;
  }
  // Fee strings like "Free" / "₹500" / "$50" — parse a number when present.
  const feeNum = parseFloat((e.fee || "").replace(/[^0-9.]/g, ""));
  const isFree = !e.fee || /free/i.test(e.fee);
  data.isAccessibleForFree = isFree;
  if (!isFree && !isNaN(feeNum) && feeNum > 0) {
    data.offers = {
      "@type": "Offer",
      price: feeNum,
      priceCurrency: /[₹]|INR/i.test(e.fee || "") ? "INR" : "USD",
      url,
      availability: "https://schema.org/InStock",
    };
  }
  return data;
}

export interface PersonJsonLdInput {
  name: string;
  headline?: string | null;
  bio?: string | null;
  id: string;
  avatar?: string | null;
}

export function personJsonLd(p: PersonJsonLdInput): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: p.name,
    url: `${SITE_URL}/instructors/${p.id}`,
    jobTitle: p.headline || "Cybersecurity Instructor",
    worksFor: { "@type": "Organization", name: "GuardianX Academy" },
  };
  if (p.bio) data.description = p.bio.slice(0, 300);
  if (p.avatar) {
    data.image = p.avatar.startsWith("http") ? p.avatar : `${SITE_URL}${p.avatar}`;
  }
  return data;
}

/** Serialize a JSON-LD object for a <script type="application/ld+json"> tag. */
export function jsonLdScript(obj: Record<string, unknown> | null): { __html: string } | undefined {
  if (!obj) return undefined;
  return { __html: JSON.stringify(obj).replace(/</g, "\\u003c") };
}
