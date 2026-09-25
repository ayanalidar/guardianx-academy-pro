# Information Security Management Programme (ISMP) - Summary
IT (Reasonable Security Practices & Procedures and Sensitive Personal Data or Information) Rules 2011 - targeted safe harbour.

Owner: Founder / Grievance Officer. Review cycle: annual or after major incidents.

## Asset register (summary)
- Next.js application (this repo) on Vercel - customer data, course content
- Neon PostgreSQL - primary datastore (all personal data)
- Hostinger mail - transactional email
- Razorpay / PayPal - payment processing (PCI scope stays with processors)
- Google OAuth / Forms - identity + lead capture
- Sentry - error telemetry; Z.AI - AI features

## Access control
- RBAC roles: STUDENT/INSTRUCTOR/ADMIN/SUPER_ADMIN/SCHOOL_ADMIN/PROCTOR; enforced in middleware + per-handler checks.
- Least privilege for operators; admin actions recorded in AuditLog.
- Secrets: fail-fast in production (src/lib/secrets.ts); no committed secrets; rotate PATs/DB credentials on schedule and after staff changes.

## Cryptography
- bcrypt cost 12 for credentials; TLS everywhere (HSTS preload); provider-managed encryption at rest (Neon).

## Operations security
- Dependency audit in CI cadence; npm audit at deploy time; updates for critical CVEs within 7 days.
- Seeds refuse weak default passwords against production databases.
- Rate limiting on sensitive endpoints (register, login, coupons, referral, labs, contact).

## Incident management
- See docs/INCIDENT-RESPONSE.md (CERT-In 6h reporting, DPDPA s.8(6) notification).

## Vendor / processor management
- Processor register maintained with the privacy notice; DPAs reviewed for Razorpay, PayPal, Hostinger, Google, Sentry, Neon, Vercel, Z.AI.

## HR & acceptable use
- Access revoked immediately on role change/offboarding; all personnel with admin access acknowledge this policy.
