# Client Brief — AI Mathematics Tutor for Moroccan Tronc Commun Scientifique Students

## The Project & Stakeholders

* **Product:** A browser-based, controlled AI Mathematics Tutor specifically designed for Moroccan **Tronc Commun Scientifique (TCS)** students.
* **Client / Project Team:** Yassine Azmi, Imran Bentayebi, Mohamed Benlajdid(3 developers working 25–30 hours/week over a 16-week horizon), supervised by an Academic Supervisor and an external Mathematics Reviewer.
* **Primary Source & Language:** French-first teaching (Option Française) grounded strictly in three reviewed chapters extracted from the **MAXI Maths — Tronc Commun Scientifique** textbook, combining text, push-to-talk voice, exercise photos, and KaTeX-rendered mathematical notation.

## How the System Adds Value

* **Textbook-Grounded Guidance:** Provides step-by-step explanations and method walkthroughs strictly aligned with **MAXI Maths (Tronc Commun Scientifique)** definitions, rules, and pedagogical conventions, avoiding out-of-scope 1BAC, 2BAC, or university theorems.
* **Multimodal Classroom Experience:** Bridges conversational AI with step-by-step French explanations, KaTeX-rendered equations, photo interpretation, and narrated text-to-speech delivery.
* **Structured Continuity & Practice:** Enables students to upload photos of exercises (including problems from **MAXI Maths**), clarify ambiguous symbols before solving, practice with reviewer-approved exercises, save/resume sessions, and follow a deterministic weekly study plan.

## The Problem

Moroccan Tronc Commun Scientifique students studying independently with standard resources and general AI tools face clear obstacles:

* **Unreliable General AI Tools:** Standard chatbots frequently hallucinate mathematical proofs or solve exercises using advanced 1BAC/2BAC techniques (such as derivatives or integrals) that contradict the **MAXI Maths** Tronc Commun methodology.
* **Disconnect Between Textbook & Visuals:** Static book solutions or text-only chat interfaces make algebraic manipulations, function variations, trigonometry, and vector geometry difficult to follow without clear step-by-step mathematical notation and worked progression.
* **Lack of Verified Study Structure:** Students struggle to check their own work on textbook exercises and lack a structured way to organize revision tasks around their available study windows.

## What They Want

A narrow-scope, high-trust educational prototype (`v0.1.0`) where a Tronc Commun Scientifique student can:

1. **Authenticate & Select Context:** Sign in via a browser, confirm their **Tronc Commun Scientifique** profile, set study availability, and open one of the three supported **MAXI Maths** chapters.
2. **Interact Multimodally:** Ask questions via text or push-to-talk French audio, or upload photos of math exercises.
3. **Confirm Ambiguities:** Review and confirm uncertain OCR/symbol interpretations from uploaded photos before tutoring begins.
4. **Learn with Step-by-Step Explanations:** Receive short, curriculum-grounded explanations with rendered equations and text-to-speech, with the ability to interrupt and stop audio immediately.
5. **Practice, Save & Plan:** Complete reviewer-approved practice exercises sourced/adapted from **MAXI Maths** with supported answer checks, save and resume tutoring sessions, and manage an editable weekly study schedule.

## Sample Student Scenarios & Edge Cases

The system must accurately handle and demonstrate the following workflows:

1. **MAXI Maths-Grounded Tutoring:** Explaining a concept or solving a problem strictly within the three approved **MAXI Maths (TCS)** chapters (e.g., *Les ensembles de nombres*, *Calcul vectoriel*, or *Généralités sur les fonctions*) while citing the exact published chapter, section, and page reference.
2. **Validated Math & Voice Delivery:** Rendering a validated mathematical step with KaTeX, awaiting UI confirmation, and playing the corresponding French text-to-speech explanation.
3. **Real-Time Interruption:** Cancelling an active turn mid-speech or mid-generation so local audio stops under $500\text{ ms}$ and stale text events are rejected.
4. **Photo Upload & Symbol Confirmation:** Uploading an exercise image (such as a photo taken from the **MAXI Maths** workbook), previewing the extracted expression, confirming an ambiguous symbol, and continuing into evidence-backed tutoring.
5. **Reviewed Practice & Persistence:** Completing an exercise from the approved bank (MCQ, numeric with tolerance, or narrowly supported expressions), saving the session, and reopening it with its validated history.
6. **Strict Scope & Evidence Refusal:** Politely refusing questions outside the three supported **MAXI Maths** chapters (including 1BAC/2BAC topics), declining when approved corpus evidence is insufficient, and blocking prompt-injection attempts.

## What "Trust" & Safety Mean Here

Because mathematical accuracy, curriculum compliance, and textbook intellectual property are critical, the system enforces strict engineering boundaries:

* **Zero Unrestricted Fallback:** Missing evidence or failed validation triggers a clear refusal or clarification request—never an ungrounded generative answer.
* **Four-Gate Validation:** Every teaching step is validated server-side for *Source Validity* (verified **MAXI Maths** revision), *Scope Validity* (Tronc Commun Scientifique chapter/objective), *Grounding*, and *Mathematical & Rendering Safety* before reaching the transcript or TTS.
* **Human-Certified Ingestion:** Raw OCR output from **MAXI Maths** is never published directly; every extracted lesson unit, equation, and exercise is normalized, verified for notation accuracy, and explicitly published by the Mathematics Reviewer.
* **Honest Limitations:** The system does not claim zero hallucinations or validated mastery percentages; progress is reported cautiously using attempt history and revision indicators.

## Technical & Operational Constraints

* **Architecture:** Modular monolith — React/TypeScript/Vite/Tailwind/shadcn/ui frontend (with KaTeX) + Python/FastAPI backend + PostgreSQL (`pgvector`) + Supabase Auth & private Storage + SSE for live session events.
* **AI Pipeline:** Chained $\text{STT} \rightarrow \text{Controlled Teaching LLM} \rightarrow \text{TTS}$ behind provider adapters (single initial provider, server-side keys only).
* **Corpus & Copyright Governance:** Exactly three approved chapters from **MAXI Maths (Tronc Commun Scientifique)**. Because **MAXI Maths** is a published commercial textbook, permissible quotation, extraction, and educational reuse rights must be documented and confirmed with the Academic Supervisor/rights holders prior to corpus publication, and unlicensed scans must never be committed to public repositories.
* **Privacy & Compliance:** Adherence to institutional pre-pilot checks (including parental/school consent procedures for minors in Tronc Commun) and Moroccan Law 09-08 (CNDP) guidelines; raw microphone audio is not persisted by the application, and all student records/media are strictly access-controlled.
* **Budget & Latency Targets:** $\text{p50}$ latency $\le 5\text{ s}$ and $\text{p95} \le 12\text{ s}$ to first accepted output; per-student quotas, cost reservations, and monthly spending caps enforced server-side.

## Out of Scope (Explicitly)

* Full ingestion of the entire **MAXI Maths** textbook, other textbooks, or other school grade levels (1BAC, 2BAC, Collège).
* Multi-track switching (Sciences Physiques vs. Sciences Mathématiques).
* Simultaneous trilingual teaching (Arabic, Darija, and French mixed in the same release).
* Native mobile applications, payment gateways, subscriptions, social feeds, or marketplaces.
* Training custom foundation models, microservices architecture, or multi-agent orchestration.
* Arbitrary mathematical proof verification or perfect unconstrained handwriting recognition.
* Continuous always-on voice listening in the initial release (push-to-talk is the baseline).
* The Excalidraw shared whiteboard and synchronized board actions (deferred beyond `v0.1.0`).

## Definition of Done & Acceptance Criteria

The `v0.1.0` prototype is ready for final academic delivery (Week 16, following a Week 12 feature freeze) when:

* **End-to-End Reliability:** $10/10$ full user journeys complete, save, and reload cleanly; $20/20$ interruption tests reject stale events with local audio stopping under $500\text{ ms}$.
* **Mathematical & Boundary Accuracy:** $\ge 90\%$ fully correct and scoped responses across 60 reviewer-approved **MAXI Maths (TCS)** evaluation tasks, and $0$ unsupported releases across 60 out-of-scope (including 1BAC/2BAC), missing-evidence, and prompt-injection tests.
* **Security & Provenance:** $100\%$ of released steps cite valid published **MAXI Maths** source IDs/page references, private storage protects copyrighted source files, and all cross-user access attempts are blocked.
* **Consented Pilot Validation:** At least 5 consented Tronc Commun Scientifique students complete core tutoring, practice, and session-resumption tasks in the pilot environment with reproducible backup/restore and academic reporting.
