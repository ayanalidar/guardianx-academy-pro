# Incident Response Runbook (DPDPA s.8(6) + CERT-In 2022)

Owner: Grievance Officer / Data Protection Officer (privacy@guardianx.io)
Review: quarterly tabletop drill; update after every real incident.

## 1. Detection channels
| Channel | Signal | Who watches |
|---|---|---|
| Sentry | server/client error spikes, auth errors | on-call engineer |
| /api/health + watchdog | uptime, DB failure | host watchdog |
| /api/cron/* alerts | payment/cron anomalies | ops |
| user reports | privacy@guardianx.io, support inbox | Grievance Officer |

## 2. Severity triage
- **S1** personal-data breach (DB exposure, PII leak, credential dump)
- **S2** integrity incident (payment tampering, admin account compromise)
- **S3** availability incident (defacement, DoS) without data exposure

## 3. Response ladder (target: contain within 1 hour)
1. **Contain** - rotate secrets (NEXTAUTH_SECRET kills all sessions; CRON_SECRET; DB password), revoke compromised PATs, block attacker IPs at the edge.
2. **Assess** - enumerate affected data subjects and data categories (enrollment PII vs payment metadata vs credentials).
3. **Eradicate & recover** - patch the vector, restore from known-good state, force password resets if credentials affected.
4. **Preserve evidence** - export logs before they rotate; timestamp everything.

## 4. Regulatory notification (mandatory)
- **CERT-In: within 6 hours of noticing** any cyber incident per the 28 Apr 2022 directions. Report via incident@cert-in.org.in (+ phone/hw Tananairi form). Include: system affected, timeline, impact, remediation status, contact.
- **DPDPA Board + data principals**: notify without delay once the breach is likely to cause harm; describe nature, likely consequences, mitigation, contact for questions.
- Templates live with the Grievance Officer; do not improvise wording under pressure.

## 5. Log retention prerequisites (CERT-In)
- Vercel: confirm plan log retention; export request logs weekly if <180 days.
- Neon (Postgres): enable/verify log retention for 180 days within India where available.
- Hostinger mail: note SMTP metadata retention.
- Application audit: AuditLog covers admin actions - extend to auth events as they ship.

## 6. Post-incident
Root-cause write-up within 5 working days; feed fixes into the ISMP (docs/ISMP.md); drill findings logged.
