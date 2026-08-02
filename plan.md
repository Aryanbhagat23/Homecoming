# Homecoming — Project Plan

**Builder:** Aryan Bhagat
**Z-Number:** Z23887703
**FAU Email:** bhagata2025@fau.edu
**Program:** FAU AI HootCamp Summer 2026 — Build Phase
**Selected Problem:** ACL Caregiver AI Prize Challenge (Administration for Community Living, HHS)

---

## 1. Project Summary

### 1.1 Project Title

**Homecoming — a Discharge-to-Home Copilot for family caregivers.**

### 1.2 Selected Problem Statement and Sponsor

This project addresses the **ACL Caregiver AI Prize Challenge**, run by the Administration for Community Living within the U.S. Department of Health and Human Services. The challenge asks builders to create AI tools that reduce the burden on America's family caregivers.

Rather than building a general-purpose "caregiver assistant," Homecoming targets one specific, high-risk moment inside that problem space: **hospital discharge**.

### 1.3 Target Users and Stakeholders

| Stakeholder | Relationship to the system |
|---|---|
| **Primary user — the family caregiver** | An adult child, spouse, or relative who receives a discharge packet and becomes responsible for executing it at home. Usually not clinically trained, often working a job alongside caregiving. |
| **Secondary user — the care recipient** | The discharged patient. May or may not use the app directly; benefits from correct medication and follow-up execution. |
| **Secondary user — the extended care circle** | Siblings, other relatives, or paid aides who share the caregiving load and need a single shared view of the plan. |
| **Downstream stakeholder — the clinical team** | Primary care, cardiology, anticoagulation clinic. They do not use Homecoming, but they benefit when the caregiver arrives at follow-up with an accurate record. Export is designed with them in mind. |
| **Institutional stakeholder — hospitals / payers** | 30-day readmissions carry financial penalties. A tool that reduces post-discharge error has institutional value even though the caregiver is the user. |

### 1.4 Core Value Proposition

A caregiver leaves the hospital holding a 15–30 page discharge packet. Inside it are medication changes (new drugs, dose changes, discontinuations), follow-up appointments with different scheduling rules, activity restrictions, and a list of warning signs — all written in clinical language, spread across pages, with no single place that says *"here is what you actually do tomorrow."*

The caregiver becomes the sole integrator of information that even clinicians hand off imperfectly. Medication discrepancies at the discharge transition are a well-documented driver of adverse drug events and 30-day readmissions.

**Homecoming turns that packet into a verified home care plan.** Every extracted item is cited back to the exact page and quote it came from. Nothing enters the care plan until the caregiver confirms it. Low-confidence extractions are visually flagged rather than silently accepted.

**Why it matters:** the problem is not that caregivers lack information — they are drowning in it. The problem is that the information is unstructured, and the cost of a single missed item (a discontinued NSAID while starting warfarin, a missed INR draw) is measured in emergency department visits.

### 1.5 Why This Scope, Not a General Assistant

The obvious build for this challenge is a caregiver chatbot or organizer. That is explicitly one of ACL's own listed use cases, which means it is the design most submissions will converge on. It also scores poorly against the rubric's error-reduction criterion, because a chatbot improves *efficiency* without preventing *error*.

Homecoming deliberately does the opposite: it takes one transition, treats it as a safety-critical human-factors problem, and engineers the failure modes out of it. Narrow scope is a strategic choice, not a limitation.

---

## 2. Requirements

### 2.1 Core Requirements (Week 3 Gate)

#### AI Integration

The AI feature is a **grounded clinical document extraction pipeline**, not a chatbot wrapper.

`netlify/functions/extract.mjs` sends per-page document text to the Anthropic Claude API with a schema-constrained prompt. Claude returns structured candidate items across four types: **medications**, **appointments**, **care tasks**, and **warning signs**.

The critical engineering detail is the **quote-grounding gate**. Every returned item must include a verbatim quote from the source document plus its page number. The function then verifies that quote actually exists in the submitted page text. If the quote cannot be found, **the item is discarded before it ever reaches the database.** Hallucination is prevented in code, not by prompt instruction alone.

A second constraint is enforced in the system prompt and validated on output: Claude may only *restructure what the document says*. It may not add medical advice, infer dosages, or supply information not present in the source. Items that read as advice rather than extraction are rejected.

| Requirement | Implementation |
|---|---|
| Error handling | Every function returns structured JSON errors. A prior bug where the function returned plain-text `TypeError` and broke client parsing was fixed by guarding undefined inputs and normalizing all error paths to JSON. |
| Loading states | Extraction is long-running (multi-page documents). The client shows a per-stage progress state: parsing → extracting → grounding → ready for review. |
| Rate-limit handling | Anthropic 429 responses trigger exponential backoff with jitter, capped retries, and a user-facing message that distinguishes "busy, retrying" from "failed." |
| User-friendly errors | Errors are translated out of developer language. "We couldn't read page 4 clearly — you can paste that page's text instead" rather than a stack trace. |

**Image and handwriting path.** Photo upload is implemented. Because a photographed document has no source text to ground against, image-derived items **bypass the quote gate and are therefore force-flagged as NEEDS REVIEW** and can never auto-populate the plan. This was validated against a genuinely hard input — a handwritten clinical note — where the system extracted real content while correctly refusing to express confidence. That asymmetry is deliberate and is the honest answer to "what happens when grounding is impossible."

#### Backend & Database

**Supabase (Postgres)** with full CRUD across the item lifecycle and **Row Level Security on every table**.

The lifecycle is the core data story: `candidate_items` (AI output, unconfirmed) → caregiver review → `plan_items` (human-confirmed) → reminders → share → remove. Reject, edit, and remove are all implemented, so the full create/read/update/delete surface is exercised by real product flows rather than by a CRUD demo.

Documents are stored in a **private** Supabase Storage bucket; access is mediated by RLS-backed policy, not by URL obscurity.

#### Authentication

Supabase Auth handles registration, login, and session management. All application routes except the landing page are protected. Authorization is enforced **at the database layer via RLS policies keyed on care-circle membership**, not only in client-side route guards — a client-side-only check would be bypassable, which is unacceptable for health-adjacent data.

Secrets live in environment variables: `ANTHROPIC_API_KEY` (server-side only, never exposed to the browser), Supabase URL and anon key, Supabase service-role key (functions only), and the Resend API key. No credentials are committed to the repository.

#### Documentation

`README.md` contains name, Z-number, FAU email, deployed application link, demo video link, project description, AI integration explanation, setup instructions, and tech stack. Planning and design documents are this file and `design.md`.

#### Deployment

Live and publicly accessible on Netlify, deployed continuously from the `main` branch of this repository. Serverless functions deploy alongside the frontend from `netlify/functions`.

#### GitHub Repository

This repository, with incremental commit history on `main`. Commits are scoped to single features (for example, `Add remove button for confirmed plan items`, `Add photo upload with handwriting safety warnings`) rather than bulk dumps.

#### Demo Video

A 3–5 minute walkthrough covering: upload of a synthetic discharge packet, extraction with visible source citations, the review screen including a deliberately low-confidence item, confirmation into the plan, the family share view, and a reminder firing.

**All demo content uses synthetic data.** `test-data/synthetic-discharge.txt` — a constructed CHF/new-atrial-fibrillation discharge summary — is the only patient. No real person's medical documents are used in development, testing, screenshots, or the video.

#### Canvas Submission

This GitHub Classroom repository URL is submitted on Canvas for each build-phase assignment.

---

### 2.2 Build-Phase Requirements

This section explicitly identifies which advanced-topic items are incorporated into the project.

#### 2.2.1 Problem Selection & Technical Specification

**Domain research.** The discharge transition is one of the most-studied failure points in care delivery. Medication reconciliation errors at discharge are common, and a substantial share of post-discharge adverse events are medication-related. The caregiver is the last line of defense and receives no training for the role.

**Constraints identified:**

| Constraint | Consequence for design |
|---|---|
| Not a medical device; cannot provide clinical advice | System restructures source content only. No diagnosis, no dosing recommendations, no triage. Persistent non-advice disclaimer. |
| Health-adjacent data, non-HIPAA context | Private storage, RLS, no real patient data in development, deletion path available. Designed so a HIPAA posture is reachable, not claimed. |
| Caregivers are exhausted and often not technical | Verification UI must be scannable under stress. Plain language. Printable fridge sheet as an offline artifact. |
| Affordability is a scored ACL criterion | Free-tier-first architecture. Cost per extraction is the metric to minimize. |
| Source documents are wildly heterogeneous | Multiple ingestion paths: typed/pasted text, PDF text layer, photograph. Each with a different confidence posture. |

**Challenges.** The hardest technical problem is not extraction accuracy — it is *calibrated* extraction. A system that is 95% accurate and 100% confident is more dangerous than one that is 85% accurate and honest about which 15% it is unsure of. The entire architecture is organized around making uncertainty visible.

**Technical feasibility.** Validated in Weeks 1–3. The extraction pipeline runs end to end against synthetic and real-world-messy inputs, including handwriting. Grounding verification works. Item lifecycle is complete. Feasibility is demonstrated, not assumed.

**High-level architecture, system diagrams, database schema, and API structure** are specified in `design.md`.

**Technology stack justification** is in `design.md` §8.

**Weekly milestones, critical path, and dependencies** are in §3 of this document.

**Success metrics and KPIs:**

| Category | Metric | Target |
|---|---|---|
| Extraction quality | Recall of medication items vs. hand-labeled gold standard on synthetic packets | ≥ 95% |
| Safety | Ungrounded items reaching the review screen | 0 — hard gate |
| Safety | Items entering `plan_items` without explicit human confirmation | 0 — structurally impossible |
| Calibration | Share of items the caregiver edits that were pre-flagged low-confidence | Higher is better; measures whether flags predict real errors |
| Usability | Time from upload to confirmed plan | < 10 minutes for a 6-page packet |
| Performance | API p95 response time (non-AI endpoints) | < 500 ms |
| Performance | Database p95 query time | < 100 ms |
| Reliability | Uptime | > 99.5% |
| Reliability | Error rate | < 1% |
| Cost | Marginal cost per extracted packet | < $0.15 |

**MVP scope vs. nice-to-have:**

| MVP (must ship) | Nice-to-have (only if time permits) |
|---|---|
| Auth + care circles | FHIR export (ACL meritorious-prize track) |
| Document upload: paste, PDF, photo | Tesseract.js OCR for photo text grounding |
| Grounded AI extraction with quote gate | Multilingual output |
| Review screen with confidence flags | SMS reminders |
| Confirm / edit / reject / remove lifecycle | Voice input |
| Share with family | Insight-to-design traceability dashboard |
| Email reminders | Caregiver burnout check-ins |
| Printable fridge sheet | Native mobile wrapper |
| Guidance retrieval (RAG) over trusted sources | Multi-document longitudinal timeline |

#### 2.2.2 Agentic AI & RAG

**RAG component — the `guidance` function.**

Extraction tells the caregiver *what the document says*. It cannot tell them *what any of it means* — and per the non-advice constraint, Claude must never invent that meaning. The guidance layer resolves this by retrieving from a curated corpus of **trusted, public, citable caregiver-education sources** and answering strictly from retrieved passages.

| Element | Decision |
|---|---|
| Vector database | **Supabase `pgvector`.** Chosen over Pinecone/Weaviate/Chroma because the data already lives in Postgres — this avoids a second service, a second set of credentials, a second failure mode, and a second bill. The corpus is on the order of thousands of chunks, far below the scale where a dedicated vector store earns its complexity. |
| Ingestion | Offline script pulls from public caregiver-education and medication-information sources, normalizes to text, and records source URL, title, and retrieval date for every chunk. |
| Chunking | ~500-token chunks with ~50-token overlap, split on section boundaries where the source has them. Every chunk retains its parent document reference so a citation resolves to a real, linkable source. |
| Embeddings | Generated at ingest, stored in a `guidance_chunks` table with an HNSW index on the embedding column. |
| Semantic search | Query embedding → cosine similarity top-k (k=5) → relevance threshold → passages injected into the prompt with their citations. |

**The retrieval-specific safety rule:** if no chunk clears the relevance threshold, the system **does not fall back to the model's parametric knowledge.** It returns "I don't have a trusted source for that — please ask your care team," and offers to add the question to the caregiver's appointment question list. An unsourced answer is worse than no answer in this domain.

**Agentic patterns.**

Homecoming uses **bounded, auditable multi-step orchestration** rather than an open-ended autonomous agent. This is a deliberate design position: an agent that can take unbounded actions on health data is the wrong tool, and the ACL rubric rewards demonstrated reasoning and error prevention over autonomy.

| Pattern | Implementation |
|---|---|
| Multi-step task design | Ingest → per-page parse → extraction call → grounding verification → confidence assignment → persist as candidates → *human gate* → plan items → reminder scheduling. The human gate is a hard barrier no automated step may cross. |
| Tool / function calling | The `ask` function exposes read-only tools over the caregiver's **own confirmed plan**: look up a plan item, list upcoming appointments, list active medications, retrieve guidance. Tools are read-only by design — the assistant can never mutate the care plan. |
| Memory and context retention | Durable state lives in Postgres, not in a conversation buffer. Context for any turn is assembled from confirmed `plan_items` scoped to the caregiver's circle by RLS. This makes memory inspectable and deletable — properties a chat-history buffer does not have. |
| Orchestration logic | Explicit sequential pipeline with defined failure handling per stage. Chosen over a dynamic agent loop because every step must be auditable for the rubric's transparency criterion and reproducible for debugging. |

**Integration and user interaction.** Extraction is invisible plumbing — the caregiver sees a review screen, not a model. Guidance surfaces as a "What does this mean?" affordance on any plan item, answering with citations. The `ask` function powers a plan-scoped Q&A that can answer "when is the next INR draw?" from confirmed data.

**Caching and fallback:**

| Failure | Fallback |
|---|---|
| Retrieval returns nothing above threshold | Explicit "no trusted source" response + offer to add to appointment questions. No parametric fallback. |
| Anthropic API unavailable | Extraction queued; already-confirmed plan, reminders, and share view remain fully functional. Degradation is partial, never total. |
| PDF text layer missing | Fall back to photo path with mandatory review flags; offer paste-text as the reliable route. |
| Repeat guidance query | Cached by normalized query hash with TTL, so the same question across users costs one embedding + one completion. |
| Repeat document extraction | Content-hash cache prevents paying twice for a re-upload of the same packet. |

#### 2.2.3 Production Engineering

| Area | Plan |
|---|---|
| **Containerization** | `Dockerfile` (multi-stage: Node build → static serve) and `docker-compose.yml` running the app against local Supabase, for reproducible local development and to prove the app is not Netlify-locked. Image optimization via multi-stage build, `.dockerignore`, and Alpine base. *Note: production deploy is Netlify serverless; the container is for reproducibility and portability, and this is stated honestly rather than pretending Docker is the production path.* |
| **Observability** | Structured JSON logging from all functions with a request ID propagated end to end. **Sentry** for error tracking on both client and functions, with the AI pipeline instrumented so a grounding-gate rejection is logged as a distinct event — rejection rate is a product quality signal, not just an error. Netlify Analytics plus Supabase's built-in query performance view for dashboards. |
| **Database optimization** | Indexes on every foreign key and on the hot query paths (`candidate_items` by document, `plan_items` by circle, `reminders` by due timestamp — the last one is what the scheduled function scans). HNSW index on guidance embeddings. Supabase manages connection pooling via PgBouncer, which matters specifically because serverless functions would otherwise exhaust connections. Automated daily backups; slow-query review each week against the p95 < 100 ms target. |
| **Caching** | Guidance query cache and document-hash extraction cache, both in Postgres with TTL columns (Redis is not justified at this scale and would add a service for no measurable gain — this is a deliberate trade documented in `design.md`). Netlify CDN serves all static assets. Cache expiration: 30 days for guidance, indefinite for document hashes (input is immutable). |
| **Infrastructure documentation** | `SETUP.md` provides reproducible setup from empty machine to running app. `supabase/schema.sql` is the single source of truth for database state — the entire schema rebuilds from one file. All required environment variables documented in `.env.example` with no real values. |
| **Performance targets** | API p95 < 500 ms (non-AI endpoints; extraction is inherently long-running and is handled with progress states rather than pretending to be fast), DB p95 < 100 ms, uptime > 99.5%, error rate < 1%. |

#### 2.2.4 Security & Costs

**Secrets management.** All credentials in environment variables — `.env` gitignored, `.env.example` committed with placeholder values only. The `ANTHROPIC_API_KEY` is used **exclusively server-side inside Netlify Functions**; it is never sent to the browser, because a client-side AI key is a funded, publicly-readable key. The Supabase service-role key is likewise function-only; the client uses the anon key with RLS enforcement. Production values live in the Netlify dashboard.

*Incident note, recorded honestly:* an Anthropic key was regenerated during development after exposure risk was identified. Rotation is therefore a demonstrated practice in this project, not a theoretical one. Keys are rotated at the end of the build phase and on any suspected exposure.

**Security hardening:**

| Control | Implementation |
|---|---|
| Rate limiting | Per-user limits on the extraction and guidance endpoints — these are the ones with real marginal cost and are therefore the abuse targets. |
| Input validation | File type and size validated before upload; text length bounded; all function inputs schema-validated before use. |
| Prompt-injection defense | Uploaded documents are **untrusted input.** A malicious or malformed document could contain text resembling instructions. Defenses: document content is clearly delimited and labeled as data in the prompt; the model's output must conform to a strict schema; **and critically, the quote-grounding gate means an injected instruction cannot produce a plan item, because injected text that isn't a real clinical item still has to survive verification and then a human confirming it.** The human gate is also the injection gate. |
| CORS | Restricted to the application origin. |
| HTTPS/SSL | Enforced by Netlify with automatic certificates; HTTP redirects to HTTPS. |
| Security headers | CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` configured in `netlify.toml`. |
| Authorization | RLS policies at the database layer, keyed on care-circle membership. Verified by attempting cross-circle reads as part of the security audit. |

**Cost optimization.** Token counting logged per extraction; usage monitored against the < $0.15/packet target. Prompts optimized by sending only page text rather than whole-document context where per-page extraction suffices. Document-hash caching eliminates duplicate spend. Budget alerts configured on the Anthropic console.

**Security audit plan.** `npm audit` and Dependabot for dependency scanning; a manual review of the auth and authorization flows including deliberate cross-circle access attempts; a repository scan for hardcoded credentials across full history; and a prompt-injection test suite using adversarial synthetic documents. Findings and fixes documented in `SECURITY.md`.

**Projected monthly operational cost:**

| Service | Tier | Projected monthly |
|---|---|---|
| Netlify (hosting + functions) | Free tier | $0 |
| Supabase (Postgres, auth, storage, pgvector) | Free tier | $0 |
| Anthropic Claude API | Pay-per-use | ~$5–15 at demo/pilot volume |
| Resend (email) | Free tier (3,000/mo) | $0 |
| Sentry | Developer tier | $0 |
| **Total at demo scale** | | **~$5–15/month** |

At pilot scale (roughly 500 caregivers, ~2 packets each per month), Supabase and Netlify move to paid tiers (~$25 and ~$19) and Anthropic usage scales roughly linearly, landing near **$150–200/month, or under $0.40 per caregiver per month.** This figure is deliberately tracked because **affordability is an explicitly scored ACL criterion**, and a cheap web application is a stronger submission than an expensive one.

---

## 3. Timeline & Milestones

Weeks 1–3 are complete and are recorded as delivered, not planned.

> **Dates below assume a build phase beginning the week of July 14, 2026. Confirm against the Canvas assignment dates and adjust.**

| Week | Dates | Goals | Deliverables | Dependencies / Blockers |
|---|---|---|---|---|
| **1** ✅ | Jul 14–20 | Foundation | Vite + React scaffold; Supabase project; full schema with RLS; `extract.mjs` with quote-grounding gate; synthetic test data | None |
| **2** ✅ | Jul 21–27 | Extraction pipeline | Paste-and-extract flow working end to end; per-page PDF text via `pdfjs-dist`; candidate items persisting | Depends on W1 schema |
| **3** ✅ | Jul 28–Aug 3 | Review lifecycle + ingestion breadth | Verification screen; confirm / edit / reject / remove; share-with-family view; photo upload with forced review flags | Depends on W2 |
| **4** | Aug 4–10 | **Ship it live** | Netlify production deploy; env vars configured; Supabase production URL; Sentry wired; smoke test on production | **Critical path.** A live URL is mandatory for both the gate and the ACL submission. |
| **5** | Aug 11–17 | Reminders | `send-reminders.mjs` scheduled function; Resend integration; reminder CRUD in UI; printable fridge sheet | Blocked on Resend account + domain verification — start that first |
| **6** | Aug 18–24 | RAG guidance layer | `pgvector` enabled; corpus ingested and chunked; embeddings stored; `guidance.mjs` retrieval with citations and no-source fallback | Heaviest new-build week. **Fall semester starts Aug 24 — capacity drops after this point.** |
| **7** | Aug 25–31 | Plan-scoped Q&A | `ask.mjs` with read-only tool calling over confirmed plan items; guidance surfaced on plan items | Depends on W6 |
| **8** | Sep 1–7 | Production hardening | Rate limiting; security headers; caching layers; indexes and query tuning; Dockerfile + compose; load test against p95 targets | Depends on W4 being live |
| **9** | Sep 8–14 | Caregiver research + security audit | 5–8 caregiver interviews; **insight → design-decision traceability table**; full security audit incl. prompt-injection suite; findings documented | **Longest lead time — start outreach in Week 5, not Week 9.** |
| **10** | Sep 15–21 | Submission | Demo video (synthetic data only); README finalized; `plan.md` / `design.md` updated to as-built; ACL submission package; integration buffer | Buffer week — no new features |

### 3.1 Critical Path

**Deploy (W4) → Reminders (W5) → RAG (W6) → Q&A (W7)** is the dependency spine. Everything downstream of W4 assumes a working production environment, which is why deploy is scheduled before any new feature work rather than after.

### 3.2 Identified Risks

| Risk | Mitigation |
|---|---|
| **Fall semester begins Aug 24 (Week 6)** — course load plus the CPT internship sharply reduces available hours from that point | Front-load technical build into Weeks 4–6. Weeks 8–10 are hardening, research, and packaging — lower cognitive load, more interruptible. |
| **Caregiver interviews keep getting deferred** | This is the single highest-value, lowest-technical-effort artifact for the ACL rubric, which explicitly scores traceability between user insight and design decision. Almost no competing submission will have it. Outreach begins Week 5 through the Caregiver Action Network, Broward/Palm Beach Area Agencies on Aging, and FAU's nursing school. Five interviews at 30 minutes each is under three hours of work for a disproportionate scoring return. |
| Resend domain verification delays reminders | Start account setup in Week 4 alongside deploy, so verification lag runs in parallel. |
| RAG corpus curation expands unboundedly | Cap the corpus at a fixed set of sources. Depth over breadth; a small well-cited corpus beats a large unreliable one. |
| Scope creep from ACL "nice-to-have" tracks (FHIR) | FHIR export stays explicitly out of MVP. It is only attempted if Weeks 8–9 finish early. |

### 3.3 Buffer

Week 10 is reserved entirely for integration, debugging, and submission packaging. No feature work is scheduled in it. If earlier weeks slip, they slip into Week 10 and the nice-to-have list is cut — the MVP list is not.

---

## 4. Living Document Note

This plan and `design.md` are updated as the project evolves. Substantial changes are recorded in commit history and reflected here rather than left to drift out of date.
