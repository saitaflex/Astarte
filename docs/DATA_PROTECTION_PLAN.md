# Astarte — Data Protection Plan

**Status:** Draft for review. Not legal advice. Have a Tunisian lawyer confirm the legal section before launch.
**Owner:** Platform team. **Reviewer:** [to be named]. **Last updated:** 2026-11-19.

---

## 1. Legal basis and what is uncertain

| Regime | Applies because | Confidence |
|---|---|---|
| **Organic Law No. 2004-63** (personal data protection, Tunisia) | Astarte is operated in Tunisia and processes personal data of Tunisian users. | High that it applies. Text to be checked against the official French text (INS or Journal Officiel). |
| Key duties in that law | Prior declaration to the **INPDP** (Instance Nationale de Protection des Données Personnelles) before processing. Explicit consent for processing. Prior authorisation is described as required for sensitive data and for transfers abroad. Sources disagree on how strict the sensitive-data rule is. | Medium. Sources are secondary summaries. |
| **Draft replacement law** (2025, before parliament) | Would add a Data Protection Officer, breach notification to the INPDP, and higher fines. | **Unverified.** I could not confirm adoption, promulgation or the entry-into-force date. Check the Journal Officiel and ARP before relying on it. |
| **GDPR** (EU) | Applies only if we target EU residents or monitor their behaviour, for example an EU customer browsing and registering. | Conditional. Decide the target market first. |

**MVP scope decision:** the MVP is a demonstration for the Ministry of Culture. The blockers below are accepted for the MVP and deferred to a post-MVP compliance phase:
- Target market and GDPR applicability
- INPDP declaration and prior authorisation
- Legal data controller naming
- The 2025 draft law's status

---

## 2. Roles

| Role | Who | Notes |
|---|---|---|
| Data controller | Astarte operator (to be named) | Decides purposes and means. |
| Processors | Hosting provider, database host, email provider, LLM provider, speech provider, geocoding provider, error monitoring | Each needs a written data-processing agreement. Listed in section 9. |
| Data protection contact | To be named | Receives requests and breach reports. |

---

## 3. Personal data inventory

Mapped to the classes in `CLASS_DIAGRAM.md` and `ADDENDUM_EVENTS_AND_AI.md`.

| Data | Source | Classes | Sensitivity | Public? |
|---|---|---|---|---|
| Email, password hash, display name, locale | Registration | `User` | Personal | No |
| Session token hash, user-agent hash | Login | `Session` | Security | No |
| Biography, avatar, specialties, categories | Artist | `ArtistProfile` | Personal (self-published) | Yes, when published |
| Workshop / approximate location | Artist | `Location` | Personal (location) | Only by `LocationPrivacy` level |
| Exact home address | Artist (if given) | Not stored in MVP. Must never be shown. | High | Never |
| Contact methods (phone, WhatsApp, email) | Artist | `ContactMethod` | Personal | Only if `isPublic = true` |
| Portfolio images | Artist | `PortfolioImage` | Personal (may show faces, homes) | Only after moderation |
| Image EXIF metadata (GPS, camera serial) | Embedded in file | `ImageMetadata` | High (GPS = location) | GPS stripped before any public use |
| Customer request briefs | Customer | `ProjectRequest`, `ProjectBrief` | Personal (may include address, budget) | Only to contacted artists |
| Messages | Customer / artist | `Message` | Personal | Only to the two parties and admin for reports |
| Reviews | Customer | `Review` | Personal | Comment only, after moderation |
| Favourites | Customer | `Favorite` | Personal (preference) | No |
| Event registrations, party size, notes | Customer | `EventRegistration` | Personal | Organiser only |
| Event check-in and no-show status | Organiser | `EventRegistration` | Personal | Organiser and customer only |
| Reports | Any user | `Report` | Personal (reporter identity) | Reporter identity hidden from the reported party |
| Verification evidence (ID documents, licences) | Artist | `ArtistVerificationRequest.evidence` | **High** | Admin only, never shown publicly |
| Analytics events | Browser | `AnalyticsEvent` | Behavioural | Aggregated only |
| AI conversation input | Any user | `AIInteraction.userInputRedacted` | Personal (may contain names, phones) | Redacted |
| Voice recordings (if voice is enabled) | Any user | Speech pipeline | **Biometric risk** (voice identifies a person) | Not stored by default |
| Audit logs | System | `AuditLog` | Security | Admin only, IP hashed |
| Error logs | System | `SystemErrorEvent` | Security | Admin only, secrets and personal data redacted |

---

## 4. Principles

1. **Minimise.** Collect only what a feature needs. Example: a customer's city is enough for a local search; the exact address is not collected.
2. **Purpose limitation.** Each field is used only for the purpose stated at collection (for example, an email is used for account and project messages, not for marketing unless the user opts in).
3. **Consent is explicit and separate.** Account creation, marketing emails, public contact display and AI-assistant use each have their own opt-in. None is pre-ticked.
4. **Public by choice.** Contact details and exact locations are hidden by default. The artist switches each one on.
5. **Least privilege.** Admins see moderation data, not passwords or session secrets. Support staff get the minimum role.
6. **Privacy by default in the API.** Public endpoints return only fields marked public. Tests check this.
7. **No surprise AI.** The user is told when they are talking to an AI, and what data the AI receives.

---

## 5. Specific controls

### 5.1 Authentication and accounts
- Passwords hashed with **Argon2id** (or bcrypt as fallback). Never stored or logged in clear text.
- Session tokens stored as hashes. Forced logout on suspension.
- Rate limiting on login and password reset.
- Admin accounts provisioned through a server-side command, with MFA required.

### 5.2 Location privacy
- Stored coordinates are rounded for public display (`GeoPoint.roundedForPublic`).
- `HIDDEN` locations produce no marker and no distance.
- Geocoding is server-side. Nominatim (OpenStreetMap) requires an identifying User-Agent and at most one request per second. Do not send customer addresses to a third-party geocoder unless the customer has consented.

### 5.3 Images
- Original files kept in a **private** bucket. Public URLs are short-lived signed URLs only.
- EXIF metadata stripped of GPS, serial numbers and device identifiers before any public variant is created.
- Faces and private interiors: the artist is told that a portfolio image is public once approved. A "remove personal information" check is part of moderation.

### 5.4 AI assistant and LLM data
- **Redact before sending.** Phone numbers, emails and street addresses are removed from user input before it reaches any model.
- **Send only retrieved records.** The model never receives the full user table.
- **No contact details to the model.** Contact fields are fetched by the app and shown by the UI, not generated by the model.
- **Logs.** `AIInteraction` stores redacted input and record IDs, not full raw prompts. Retention per section 7.
- **Cross-border transfer (accepted for MVP, deferred).** LLM, speech and embedding providers may process data abroad. This may need INPDP authorisation under the current law. Deferred to post-MVP: move to in-region or self-hosted models, or obtain authorisation. Until then, the redaction rules above still apply.
- Provider data-use settings must be set to **no training on our data** and the setting recorded in the vendor file.

### 5.5 Voice
- Voice recordings are **not stored** by default. Audio is transcribed and discarded.
- If storage is ever needed (for quality review), it requires separate explicit consent and a short retention period.
- Voice is treated as potentially identifying.

### 5.6 Messages and reports
- Messages are visible only to the customer, the artist and admins handling a report.
- Report submitter identity is hidden from the reported party.
- Admins access message content only for a logged report, and every access is written to `AuditLog`.

### 5.7 Analytics
- Guest traffic uses a **salted, daily-rotating hash** of session data (`sessionHash`), not a persistent identifier.
- No third-party trackers in the MVP. If added, they need consent.
- Analytics are shown as aggregates. Individual artist views are not shown to other artists.

### 5.8 Events
- Organisers see attendee name and party size only for their own event.
- Customers' RSVP history is visible only to them.
- Event venue addresses are shown to customers only after a **confirmed** registration (or as a general area, such as the city, before then).

### 5.9 Search queries (including Arabizi)
- Search queries are used only to answer the search. They are not stored with the user's identity, except in redacted form in `AIInteraction`.
- Arabizi normalisation runs on the server. Its dictionary contains only category and event terms, never personal data.
- Queries that contain phone numbers, emails or addresses are redacted before logging.

### 5.10 Security measures (summary)
- TLS everywhere. HSTS enabled.
- Encryption at rest for the database and object storage.
- Secrets in environment variables only. Never in the repository, logs, or `SystemSetting` values.
- CSRF protection, input validation, output encoding (see the security section of the design).
- Backups encrypted, tested for restore, and retained per section 7.
- Dependency and secret scanning in CI.

---

## 6. Data subject rights

| Right | How Astarte handles it | Target time (proposed) |
|---|---|---|
| Access | Export of the user's data as JSON from account settings | 30 days (set by law once confirmed) |
| Rectification | Edit in account settings | Immediate |
| Erasure | Account deletion: personal data removed or anonymised. Public artist content removed or archived. Records kept where a legal obligation requires it (for example, audit logs with the user ID replaced). | 30 days |
| Restriction / objection | Account can be suspended from marketing or AI features individually | Immediate |
| Withdraw consent | Per-feature consent toggles | Immediate |
| Portability | Same export as access | 30 days |
| Complaint | Contact address published in the footer and privacy policy | Acknowledge within 7 days (proposed) |

The rights workflow is logged in `AuditLog`.

---

## 7. Retention schedule (proposed)

| Data | Retention | Action at end |
|---|---|---|
| Active account data | While the account is active | Deleted or anonymised on request |
| Deleted account data | 30 days (grace period), then erased | Hard delete |
| Customer project requests and messages | 2 years after last activity | Anonymise customer identity |
| Event registrations | 1 year after event date | Delete |
| Reports and moderation decisions | 3 years | Keep reviewer ID hashed |
| Verification evidence (ID documents) | Until decision + 6 months, then deleted | Hard delete |
| AI interaction logs (redacted) | 90 days | Delete |
| Audit logs | 3 years | Delete, IP already hashed |
| Analytics events (aggregated) | Raw events 13 months; aggregates kept | Delete raw events |
| Error logs | 30 days | Delete |
| Backups | 35 days rolling | Overwritten |

These periods are proposals. Confirm them against the legal basis in section 1.

---

## 8. Breach response

1. **Detect.** Alerts from monitoring, unusual admin access, or a report.
2. **Contain.** Revoke affected sessions and keys. Isolate the component.
3. **Assess.** Identify the data types, number of people affected, and whether the data was readable.
4. **Notify.** Inform the INPDP, and affected users, within the deadline set by the applicable law. The 72-hour window reported in secondary sources is **unverified**; use it as an internal target until the law is confirmed.
5. **Record.** Log the incident, cause, actions and lessons in `AuditLog` and an incident file.
6. **Review.** Fix the root cause and update this plan.

---

## 9. Processors and vendors

| Vendor / service | Data sent | Location | Action before launch |
|---|---|---|---|
| Hosting (app server) | All data | To be chosen (Tunisia or EU preferred) | Data processing agreement |
| Database host (PostgreSQL + PostGIS) | All data | Same as hosting | DPA, encryption at rest |
| Object storage | Images | Same | DPA, private buckets |
| Email provider | Email addresses, message notifications | To be chosen | DPA, opt-in for marketing only |
| LLM provider | Redacted user input, retrieved records | Foreign by default | **Decision required** (section 5.4) |
| Speech provider | Audio (transient) | Foreign by default | **Decision required**; prefer local or self-hosted Whisper |
| Geocoding (Nominatim or other) | Artist location text only | OSM servers | Respect usage policy; no customer addresses |
| Error monitoring | Redacted errors | To be chosen | Scrub personal data before sending |

Vendors are recorded in a vendor file. Each must confirm no training on our data.

---

## 10. Privacy notices and consent screens (required content)

- Who we are and how to contact us.
- What data we collect, for which purpose, and the legal basis (consent or contract).
- Who receives the data (processors, and whether abroad).
- How long we keep it.
- The user's rights and how to exercise them.
- The INPDP complaint route.
- A plain-language explanation of the AI assistant: what it reads, what it cannot do, and that it does not invent artists or products.
- Separate checkboxes for: public contact display, marketing emails, AI assistant use, and event notifications.

Available in French, English and Arabic. Arabic is the authoritative text for Tunisian users, with a legal review.

---

## 11. Engineering checklist

**MVP scope:** items marked (post-MVP) are deferred per the Ministry demo decision. All other items apply to the MVP.

- [ ] (post-MVP) INPDP declaration filed (or confirmed as not required by a lawyer)
- [ ] (post-MVP) Legal review of sections 1 and 5.4 completed
- [ ] (post-MVP) Data controller and contact named
- [ ] Processor agreements signed; vendor file complete
- [ ] (post-MVP) Decision made on LLM and speech hosting (sections 5.4 and 5.5)
- [ ] Arabizi search test set (100 queries) labelled and run
- [ ] Privacy notice and consent screens built in FR, EN, AR
- [ ] Redaction of phone, email and address in AI input is tested with a test set
- [ ] EXIF GPS stripping is tested on sample phone photos
- [ ] Public API tests confirm hidden fields (contact, exact location, verification evidence, internal notes) never appear
- [ ] Data export and deletion workflows tested end to end
- [ ] Retention jobs scheduled and tested
- [ ] Breach runbook written and rehearsed once
- [ ] Admin access logged; admin roles reviewed
- [ ] Backups encrypted and restore tested

---

## 12. Post-MVP items (deferred)

1. Confirm the target market (Tunisia only, or EU too).
2. Confirm the current status of the 2025 draft law and the official INPDP rules.
3. Decide LLM and speech hosting (in-region, self-hosted, or foreign with authorisation).
4. Confirm the data controller entity.
5. Confirm retention periods with a lawyer.

---

## Sources (secondary; verify against official texts)

- DLA Piper, Data Protection in Tunisia: https://www.dlapiperdataprotection.com/?t=law&c=TN
- Law 2004-63 (French text, INS): https://www.ins.tn/sites/default/files/2020-04/Loi 63-2004 Fr.pdf
- Law 2004-63 (French text, legislation portal): https://legislation-securite.tn/wp-content/uploads/sites/5/2023/11/Loi-n°-2004-63-du-27-Juillet-2004-Fr.pdf
- Recording Law summary of Law 2004-63: https://www.recordinglaw.com/world-laws/world-data-privacy-laws/tunisia-data-privacy-laws/
- Signzy summary of Law 2004-63: https://www.signzy.com/regulation-glossary/organic-act-2004-63-personal-data
- Draft replacement law (ARP review, July 2025): https://fr.allafrica.com/stories/202507210438.html
- Draft replacement law (commentary, 2026 deadline claims, unverified): https://regulations.ai/news/tunisia-data-protection-law-2026-deadline-gdpr-like-rules
