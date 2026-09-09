# AIDA: Adaptive Intelligent Daily Assistant

> **A personalized, AI-powered adaptive learning platform.**
> Upload your study material (PDFs, recorded audio lectures, YouTube videos, or raw notes), transform them into structured notes and mind maps tailored to your preferred learning style, interact with a grounded RAG tutor, test yourself with instant quizzes and timed exams, and retain knowledge long-term using SM-2 spaced repetition.

---

## Overview & Core Loop

AIDA replaces fragmented study tools by uniting the entire learning lifecycle into one cohesive, automated loop:

```
[ Upload Material ] ─────────► [ Multi-Topic Segmentation & Content Generation ]
  - PDF Textbooks & Slides       - Summaries & Anchored Notes
  - Audio Lecture Recordings     - Visual Mind Map JSON
  - YouTube Video URLs           - Adaptive Quizzes (MCQs & Written)
  - Plain Text Notes             - Formatted to Preferred Learning Style
                                           │
                                           ▼
[ Long-Term Retention ] ◄───── [ Grounded Practice & Review ]
  - SM-2 Spaced Repetition       - RAG-Grounded AI Tutor ("Simplify This")
  - 30-Day Review Calendar       - Instant MCQ & LLM Written Grading
  - Weekly Progress Digest Email - Server-Enforced Timed Exam Mode
```

---

## Repository Architecture

AIDA is built as an **npm workspaces monorepo** with strict TypeScript type-safety:

```
aida/
├── apps/
│   ├── api/                 # NestJS 11 backend server
│   │   ├── prisma/          # Prisma schema, migrations, and seed scripts
│   │   └── src/
│   │       ├── admin/       # Admin controller, service, and BullMQ dashboard
│   │       ├── auth/        # JWT auth, argon2, age gate, and role guards
│   │       ├── contact/     # Public contact form & admin inbox
│   │       ├── documents/   # Document ingestion, workers, chunking & embeddings
│   │       ├── exam/        # Timed exam sessions & server-side expiration checks
│   │       ├── progress/    # Weekly mastery calculation & email report worker
│   │       ├── providers/   # Modular AI, transcription, email & storage providers
│   │       ├── queue/       # BullMQ queue definitions & constants
│   │       ├── quiz/        # MCQ grading & LLM written response evaluation
│   │       ├── review/      # SM-2 spaced repetition, review queue & calendar
│   │       ├── topics/      # Topic aggregation & multi-topic endpoints
│   │       ├── tutor/       # RAG vector-search tutor chat with "Simplify" mode
│   │       └── users/       # User profile, GDPR export & deletion, email opt-out
│   │
│   └── web/                 # Next.js 16 (App Router) + React 19 frontend
│       ├── e2e/             # Playwright end-to-end test suite
│       └── src/
│           ├── app/         # App router pages (marketing, auth, app dashboard, admin)
│           ├── components/  # Reusable UI components, upload sheet, mind-map, tutor chat
│           └── lib/         # API client, cookie consent state, privacy telemetry
│
├── packages/
│   └── shared/              # Shared DTOs, TypeScript interfaces, enums (LearningStyle, etc.)
│
├── infra/                   # Docker Compose configuration (Postgres pgvector, Redis, MinIO)
└── aida_docs/               # Technical specs, PRDs, architectures, and compliance docs
```

---

## Key Features

### 1. Multi-Modal Ingestion Pipeline

* **PDFs**: Asynchronous parsing via BullMQ background workers (`parse-pdf`).
* **Audio Recordings**: In-browser microphone recorder or file upload, transcribed with **Groq Whisper Large v3 Turbo** (primary) and **Cloudflare Workers AI Whisper** (automatic failover).
* **YouTube**: Automated transcript extraction from YouTube video links (`fetch-youtube-transcript`).
* **Plain Text**: Direct Markdown or raw text note ingestion.

### 2. Multi-Topic Segmentation & Content Generation

* Automatically breaks down long documents (e.g. multi-chapter PDFs) into distinct topics with individual UUID identifiers.
* Generates comprehensive summaries, anchored bullet-point notes, visual mind-map graphs, and assessment questions.
* **Learning Style Adaptability**: Prompts dynamically condition explanations based on the student's selected learning style:
  * **Diagrams & Visuals**
  * **Stories & Narratives**
  * **Analogies & Metaphors**
  * **Formulas & Logic**
  * **Audio-Style Conversational Phrasing**

### 3. Grounded RAG AI Tutor

* Retrieves high-relevance chunks from the student's personal notes using PostgreSQL `pgvector` embeddings (`vector(1536)`).
* Includes a **"Simplify this"** toggle to re-explain difficult concepts at a foundational level.
* Student feedback mechanism (thumbs up/down with qualitative comments).
* Protected by per-user rate limiting to ensure cost guardrails.

### 4. Adaptive Quizzes & Timed Exam Mode

* **Instant MCQ Grading**: Immediate feedback with rationale.
* **AI Written-Response Grading**: Qualitative assessment scoring depth of understanding and providing actionable feedback.
* **Timed Exam Mode**: Server-side enforced countdown timers that automatically transition expired sessions to prevent overdue submissions.

### 5. SM-2 Spaced Repetition Engine

* Algorithmic review scheduling following the SuperMemo-2 (SM-2) formula:
  * Custom ease-factor recalculation and repetition interval growth.
  * Review Queue of items due today.
  * 30-Day forward-looking visual review calendar.
  * Consecutive low-score detection triggering review recommendations.

### 6. Automated Weekly Digest & Email Delivery

* BullMQ scheduled cron (`0 8 * * 1` default, configurable via `WEEKLY_REPORT_CRON` UTC env var).
* Computes weekly quizzes taken, topics reviewed, mastery percentages, top strengths, and focus review areas.
* HTML email templates with one-click unsubscribe links compliant with CAN-SPAM and GDPR.

### 7. Privacy, Safety & Compliance

* **COPPA Minor Account Protection**: Birthdate check at registration; accounts under 13 require parental consent; minor accounts (13–17) have tracking disabled.
* **GDPR In-App Controls**:
  * Machine-readable data export (`GET /users/me/export`).
  * Permanent account and asset purge (`DELETE /users/me`) with audit logging.
* **Cross-Device Cookie Preferences**: Cookie consent banner synchronizes preferences to the user profile when authenticated.

### 8. Admin Portal & Queue Observability

* Role-based access control (`STUDENT`, `SUPPORT`, `ADMIN`).
* Admin contact message inbox for user inquiries.
* Embedded **Bull-Board** queue management dashboard mounted at `/admin/queues`.
* Quality review dashboard for spot-checking AI grading accuracy and tutor conversations.

---

## Technology Stack

| Layer                       | Technologies                                                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**          | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, GSAP                                                                             |
| **Backend**           | NestJS 11, Express, Passport JWT, class-validator, Throttler                                                                                                |
| **Database & Cache**  | PostgreSQL 16 with`pgvector` extension, Prisma ORM 7.10, Redis 7                                                                                          |
| **Queues & Workers**  | BullMQ,`@bull-board/nestjs`                                                                                                                               |
| **Storage**           | S3-compatible object storage (MinIO locally, AWS S3 / Cloudflare R2 in production)                                                                          |
| **AI Providers**      | **Groq** (Llama 3.3 70B & Whisper Large v3 Turbo), **Cloudflare Workers AI** (backup failover), **Mock Provider** (zero-cost offline dev) |
| **Email**             | Brevo / Nodemailer (with Mock fallback)                                                                                                                     |
| **Testing & Quality** | Jest (unit/service tests), Playwright (end-to-end), ESLint, Sentry                                                                                          |

---

## Getting Started

### Prerequisites

* **Node.js**: v20.x or v22.x
* **npm**: v10+
* **Docker & Docker Compose** (for PostgreSQL, Redis, and MinIO)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/joykefas/AIDA.git
cd AIDA

# Install dependencies across all workspaces
npm install
```

### 2. Start Local Infrastructure

Launch PostgreSQL (pgvector), Redis, and MinIO:

```bash
npm run infra:up
```

* **PostgreSQL**: `localhost:5434` (User: `aida`, Pass: `aida_dev_password`, DB: `aida`)
* **Redis**: `localhost:6379`
* **MinIO API**: `localhost:9000` (Console: `http://localhost:9001`, User: `aida_minio`, Pass: `aida_minio_password`)

### 3. Configure Environment Variables

Copy the example files and customize as needed:

```bash
# Backend Environment
cp apps/api/.env.example apps/api/.env

# Frontend Environment
cp apps/web/.env.example apps/web/.env.local
```

> **Default Offline Mode**: By default, `AI_PROVIDER_MODE=mock` and `EMAIL_PROVIDER_MODE=mock`. The application runs completely offline without third-party API keys. To enable live AI, set `AI_PROVIDER_MODE=live` and supply your `GROQ_API_KEY` in `apps/api/.env`.

### 4. Initialize Database

Apply database migrations and seed the super-admin user and demo data:

```bash
# Generate Prisma client
npm run prisma:generate --workspace=apps/api

# Run database migrations
npm run prisma:migrate --workspace=apps/api

# Seed initial admin user (admin@aida.app / admin123)
npm run db:seed --workspace=apps/api
```

### 5. Build Shared Library & Run Development Servers

```bash
# Build the shared TypeScript package
npm run build --workspace=packages/shared

# Start both web and API simultaneously
npm run dev
```

* **Web Application**: [http://localhost:8000](http://localhost:8000)
* **NestJS API**: [http://localhost:6001](http://localhost:6001)
* **BullMQ Dashboard**: [http://localhost:6001/admin/queues](http://localhost:6001/admin/queues) *(Admin login required)*

---

## Available NPM Scripts

From the repository root:

| Script                                   | Description                                               |
| ---------------------------------------- | --------------------------------------------------------- |
| `npm run dev`                          | Runs both Next.js frontend and NestJS API concurrently    |
| `npm run dev:web`                      | Runs Next.js frontend only on port 8000                   |
| `npm run dev:api`                      | Runs NestJS API only on port 6001                         |
| `npm run build`                        | Builds`packages/shared`, `apps/api`, and `apps/web` |
| `npm run start`                        | Runs production builds of web and API concurrently        |
| `npm run test` / `npm run test:unit` | Executes Jest unit and service test suites                |
| `npm run test:e2e`                     | Runs Playwright end-to-end integration tests              |
| `npm run lint`                         | Lints API and Web codebases                               |
| `npm run infra:up`                     | Starts local Docker Compose containers (DB, Redis, MinIO) |
| `npm run infra:down`                   | Stops local Docker Compose containers                     |

---

## BullMQ Worker Pipelines

Document processing runs via a multi-stage distributed queue:

```
Stage 1: Ingestion
  ├── Upload PDF      ──► QUEUE_PARSE_PDF                (extracts raw text)
  ├── Upload Audio    ──► QUEUE_TRANSCRIBE_AUDIO         (Whisper transcription)
  ├── Submit YouTube  ──► QUEUE_FETCH_YOUTUBE_TRANSCRIPT (pulls video captions)
  └── Plain Text      ──► (Direct text storage)
                                │
                                ▼
Stage 2: Embeddings
  └── Extracted Text  ──► QUEUE_GENERATE_EMBEDDINGS      (chunks text & generates pgvector embeddings)
                                │
                                ▼
Stage 3: Content Generation
  └── Chunks & Vector ──► QUEUE_GENERATE_CONTENT         (LLM generates summary, notes, mindmap, quiz)
                                │
                                ▼
                           Document Status: READY
```

Scheduled jobs:

* `QUEUE_SEND_WEEKLY_REPORT`: Batch-processes all active, subscribed learners every Monday at 08:00 UTC.

---

## Security & Privacy

* **Passwords**: Hashed with Argon2id.
* **Session Tokens**: 15-minute JWT access tokens in memory / secure headers; 30-day refresh tokens stored in hashed DB records and `HttpOnly`, `SameSite=Lax` cookies.
* **Tenant Isolation**: Every database query and vector retrieval query is strictly scoped by the authenticated user's `userId`.
* **Rate Limiting**: Configured globally with `@nestjs/throttler` (60 req/min) with tighter limits on LLM routes (`POST /tutor`: 20 req/min).

## License

Internal educational software. All rights reserved.
