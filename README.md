
# Homecoming — Discharge-to-Home Copilot

**Name:** Aryan Bhagat
**Z-Number:** Z23887703
**FAU Email:** bhagata2025@fau.edu
**Deployed App:** (https://homecoming-care.netlify.app/)
**Demo Video:** 

**Program:** FAU AI HootCamp Summer 2026 — Build Phase
**Selected Problem:** ACL Caregiver AI Prize Challenge (Administration for Community Living, U.S. Department of Health and Human Services)


---

## Artifact Index

| Artifact | Link |
|---|---|
| **Deployed application** | https://homecoming-care.netlify.app/ |
| **Demo video (3–5 min)** | _TBD — link here_ |
| **Pitch deck (PDF)** | [`docs/Homecoming-Pitch-Deck.pdf`](./docs/Homecoming-Pitch-Deck.pdf) |
| **Pitch deck (PowerPoint)** | [`docs/pitch-deck.pptx`](./docs/pitch-deck.pptx) |
| **One-page project summary** | [`docs/one-page-summary.pptx`](./docs/one-page-summary.pptx) |
| **Project plan** | [`plan.md`](./plan.md) |
| **System design & architecture** | [`design.md`](./design.md) |
| **Architecture diagram** | [`docs/architecture.png`](./docs/architecture.png) | 
| **Security notes** | [Security](#security) (below) |
| **Testing data policy** | [Testing Data Policy](#testing-data-policy) (below) |
| **Synthetic test data** | [`test-data/synthetic-discharge.txt`](./test-data/synthetic-discharge.txt) |

---
---

## Project Description

A family caregiver leaves the hospital holding a 15–30 page discharge packet. Inside it are new medications, dose changes, drugs to stop taking, follow-up appointments, activity restrictions, and warning signs — spread across pages, written in clinical language, with no single place that says *what to actually do tomorrow*.

The caregiver becomes the sole integrator of information that even clinicians hand off imperfectly. Medication discrepancies at the discharge transition are a documented driver of adverse drug events and 30-day readmissions.

**Homecoming turns that packet into a verified home care plan.** The caregiver uploads or photographs the discharge documents. The AI extracts medications, appointments, care tasks, and warning signs into structured items — and every single item is **cited back to the exact page and quote it came from**. Nothing enters the care plan until the caregiver confirms it. Items the system is unsure about are visually flagged rather than silently accepted.

The confirmed plan then drives email reminders, a printable fridge sheet, and a read-only share link for the rest of the family.

### Why this scope

The obvious build for this challenge is a general caregiver chatbot. That is explicitly one of ACL's own listed use cases, so it is where most submissions will land — and it improves *efficiency* without preventing *error*. Homecoming instead takes one transition moment and treats it as a safety-critical human-factors problem.

---

## AI Integration

The AI feature is a **grounded clinical document extraction pipeline**, not a chatbot wrapper.

`netlify/functions/extract.mjs` sends per-page document text to the Anthropic Claude API with a schema-constrained prompt. Claude returns structured candidate items across four types: medications, appointments, care tasks, and warning signs.

### The two safety gates

**Gate 1 — quote grounding.** Every item Claude returns must include a verbatim quote from the source document plus its page number. The function then verifies that quote actually exists in the submitted page text. **If the quote cannot be found, the item is discarded before it ever reaches the database.** Hallucination is prevented in code, not by prompt instruction alone.

**Gate 2 — human confirmation.** AI output lands in a `candidate_items` table. Confirmed items live in a separate `plan_items` table. Nothing crosses that boundary without a person acting on it. Two tables rather than a `confirmed` flag, so that promoting unverified output into a care plan is structurally impossible rather than merely unlikely.

Gate 2 also serves as the prompt-injection defense: a malicious document containing instruction-like text still has to survive quote verification *and* a human looking at it and confirming it as a real clinical item.

### Handwriting and photographs

Photo upload is supported. Because a photographed document has no source text to ground against, image-derived items **bypass Gate 1 and are therefore force-flagged as NEEDS REVIEW** — they can never be bulk-confirmed. Validated against a handwritten clinical note: the system extracted real content while correctly refusing to claim confidence.

### Additional AI features

- **`guidance.mjs`** — retrieval-augmented Q&A over a curated corpus of trusted caregiver-education sources. If no source clears the relevance threshold, it returns "I don't have a trusted source for that — please ask your care team" rather than falling back on the model's own knowledge.
- **`ask.mjs`** — plan-scoped Q&A using read-only tool calling over the caregiver's own confirmed plan items.

### Safety constraint

Claude may only *restructure what the document says*. No diagnosis, no dosing recommendations, no triage, no medical advice. Enforced in the system prompt and validated on output.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Tailwind CSS |
| Backend | Netlify Functions (Node, serverless) |
| Database | Supabase — PostgreSQL with Row Level Security |
| Authentication | Supabase Auth |
| File storage | Supabase Storage (private bucket) |
| AI | Anthropic Claude API |
| Document parsing | `pdfjs-dist` (per-page text extraction) |
| Email | Resend |
| Vector search | `pgvector` (Supabase) |
| Hosting / CI-CD | Netlify (auto-deploy from `main`) |
| Error tracking | Sentry |

---

## Serverless Functions

| Function | Purpose |
|---|---|
| `extract.mjs` | Grounded extraction of care items from document text or images |
| `guidance.mjs` | RAG retrieval over trusted caregiver-education sources |
| `ask.mjs` | Plan-scoped Q&A with read-only tool calling |
| `share.mjs` | Revocable read-only family view of the confirmed plan |
| `send-reminders.mjs` | Scheduled function that emails due reminders via Resend |

---

## Database Schema

| Table | Purpose |
|---|---|
| `care_circles` | A family unit — the authorization boundary for all data |
| `circle_members` | Membership and role (owner / caregiver / viewer) |
| `care_recipients` | The person being cared for |
| `documents` | Uploaded discharge packets |
| `candidate_items` | **Unconfirmed AI output** |
| `plan_items` | **Human-confirmed care plan** |
| `reminders` | Scheduled notifications |
| `questions` | Questions saved to ask the care team |
| `audit_log` | Append-only record of every confirm / edit / reject / remove |
| `guidance_chunks` | RAG corpus with embeddings |

Row Level Security is enabled on every table, keyed on care-circle membership. Authorization is enforced in the database, not only in client-side route guards.

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- A Supabase account
- An Anthropic API key
- Netlify CLI (`npm install -g netlify-cli`)

### 1. Clone and install

```bash
git clone https://github.com/FAU-AI-HootCamp-Summer-2026/buildphase-Aryanbhagat23.git
cd buildphase-Aryanbhagat23
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor** and run the entire contents of `supabase/schema.sql`
3. Go to **Storage** → create a new bucket named `documents`, set to **private**
4. Go to **Settings → API** and copy your Project URL and anon key

### 3. Environment variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key
RESEND_API_KEY=your_resend_api_key
```

`.env` is gitignored. Only the two `VITE_`-prefixed variables reach the browser — the Anthropic key, service-role key, and Resend key are used exclusively inside serverless functions.

### 4. Run locally

```bash
netlify dev
```

Opens at `http://localhost:8888` with serverless functions available at `/.netlify/functions/*`.

### 5. Test the extraction pipeline

Use `test-data/synthetic-discharge.txt` — a constructed CHF / new-atrial-fibrillation discharge summary. Paste its contents into the extract page and confirm that items appear with page citations.

---

## Testing Data Policy

**All development, testing, screenshots, and demo content use synthetic data only.** `test-data/synthetic-discharge.txt` is the only patient. No real person's medical documents are used at any point in this project.

---

## Security

- All secrets in environment variables; nothing committed to the repository
- The Anthropic API key is server-side only and never exposed to the browser
- Row Level Security enforced at the database layer on every table
- Private storage bucket — access mediated by policy, not URL obscurity
- Rate limiting on the extraction and guidance endpoints
- HTTPS enforced with security headers (CSP, HSTS) configured in `netlify.toml`

---

## Planning and Design Documents

- [`plan.md`](./plan.md) — project plan, requirements mapping, timeline and milestones
- [`design.md`](./design.md) — system architecture, data flow, database schema, API design, AI component architecture, and technical decision rationale

---

## Disclaimer

Homecoming organizes and restructures discharge instructions. **It is not medical advice and is not a medical device.** It does not diagnose, recommend dosages, or triage. When in doubt, contact your care team.