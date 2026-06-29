# Reframe

![Java](https://img.shields.io/badge/Java-25-orange) ![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1-green) ![React](https://img.shields.io/badge/React-19-blue) ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

AI-powered cognitive triage for overwhelmed students. Talk or type out everything that's stressing you out — Reframe runs it through a 5-stage reasoning pipeline and hands back one clear, confidence-scored next move, not a wall of reorganized chaos.

Originally built for [USAII's Global AI Hackathon 2026](https://aihackathon.usaii.org/), since rebuilt and shipped as a real product (v3).

**[Try it live](https://reframe-platform.netlify.app)** · **[Watch the v2 demo](https://youtu.be/i5htORaUKBk)** (pre-redesign — sphere, full-page graph explorer, and deployment have all changed since; a v3 demo is coming) · **[Devpost submission](https://devpost.com/software/reframe-of3glt?ref_content=user-portfolio&ref_feature=in_progress)**

![Reframe landing page](docs/screenshot-landing.png)
![Reframe workspace — issue sphere, Your Next Move, and dependency graph](docs/screenshot-workspace.png)

## What it does

You dump your mental overload by voice or text. The pipeline:

1. **Triage** — splits the dump into distinct issues and classifies each (urgency, cognitive weight, actionability, category).
2. **Hidden Assumptions** — surfaces what's implied but unstated in each issue, one Claude call per issue for depth over breadth.
3. **Dependency Graph** — maps which issues block, cause, or relate to each other.
4. **Scoring** — computes priority with deterministic Java math, not an AI guess, then asks Claude to narrate the *already-computed* score in two sentences. The number is reproducible and auditable; the AI only explains it.
5. **RAG Action Plan** — embeds the issue with Voyage AI, retrieves the closest-matching framework from a small corpus of real, established methods (GTD, CBT cognitive defusion, the Eisenhower Matrix, and others) by cosine similarity, and generates a plan grounded in that framework specifically.

You get back a prioritized, explainable list of issues, a dependency graph, and one surfaced "next move."

## What makes this different from a ChatGPT wrapper

- **Real RAG, not a hardcoded lookup table.** Retrieval is driven by actual vector embeddings and cosine similarity over a real framework corpus, not a fixed category-to-advice map.
- **Explainable scoring.** Priority scores are plain arithmetic (`urgency * 0.4 + cognitiveWeight * 0.6`, scaled by feasibility and graph impact), never an opaque AI-generated number.
- **Human-in-the-loop that's actually real.** Rejecting one of the AI's inferred assumptions about you isn't cosmetic — it's persisted server-side via a dedicated endpoint and recomputes your confidence interval for real.
- **Voice and text are equally first-class.** The conversational voice agent and the type-it-out path both feed the same pipeline; neither is a fallback for the other.
- **Two hand-rolled visualization engines, not a charting library.** The issue sphere is raw WebGL2 with custom shaders, instanced rendering, and a 2D-canvas overlay for inter-issue relationship threads. The full dependency graph view is hand-rolled SVG with a deterministic tiered layout — no Three.js, no D3, no React Three Fiber.
- **Safety-first by design, not by detection.** A country-aware crisis resource bar is always present, regardless of what the AI does or doesn't flag — deliberately not gated behind sentiment/crisis detection, since a false negative there is a much worse failure than a false positive.
- **Real cost protection.** Per-user monthly usage caps are enforced server-side, before any Claude/Voyage/ElevenLabs call fires — not just a UI suggestion.

## Architecture

```
                              ┌─────────────────────────┐
                              │   Netlify (frontend)     │
                              │   React 19 + Vite        │
                              │   Hand-rolled WebGL2 +   │
                              │   SVG graph explorer     │
                              └────────────┬─────────────┘
                                           │ REST/JSON (JWT auth)
                              ┌────────────▼─────────────┐
                              │   Render (backend)        │
                              │   Spring Boot 4.1 / Java 25│
                              │   5-stage reasoning        │
                              │   pipeline + usage caps    │
                              └──┬───────┬───────┬────────┘
                                 │       │       │
                        ┌────────▼┐ ┌────▼────┐ ┌▼─────────┐      ┌─────────────────┐
                        │ Claude  │ │ Voyage  │ │ElevenLabs│      │ MongoDB Atlas    │
                        │ API     │ │ AI      │ │          │◀────▶│ (persistence,   │
                        │(reason- │ │(RAG     │ │(voice    │      │ managed cloud)  │
                        │ing)     │ │embed.)  │ │output)   │      └─────────────────┘
                        └─────────┘ └─────────┘ └──────────┘
```

Both services are containerized (`Dockerfile` for the backend, `Dockerfile` + nginx for an alternate same-origin deployment) and can run together locally via `docker-compose.yml`. In the live deployment, the frontend builds natively on Netlify and talks to the Render backend cross-origin (CORS-configured), rather than through the nginx reverse-proxy path. Voice input runs entirely in-browser via the Web Speech API (free, no extra service); voice *output* is the only piece that goes through ElevenLabs.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Java 25, Spring Boot 4.1, Spring Security 7, Spring Data MongoDB |
| Frontend | React 19, Vite, hand-rolled WebGL2, hand-rolled SVG |
| AI reasoning | Claude API (Anthropic) |
| Retrieval | Voyage AI embeddings (`voyage-3-lite`), cosine similarity |
| Voice | Web Speech API (input), ElevenLabs (output) |
| Auth | JWT |
| Database | MongoDB Atlas |
| Deployment | Docker, Render (backend), Netlify (frontend) |

## Getting started

**Backend** — `application.properties` is committed and contains no secrets; real values are supplied as environment variables.
```bash
cp .env.example .env
# fill in your own MongoDB URI, Claude/Voyage/ElevenLabs keys, and JWT secret
./run-local.sh        # or run-local.ps1 on Windows — sources .env, then runs the app
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

The app expects the backend on `:8080` and the frontend dev server on `:5173` (proxies `/api` to the backend automatically).

**Docker (both services together)**
```bash
docker compose up --build
```

## Team

Built by [Sidharth Nair](https://github.com/sidharthnair7) and [Basudev Biju](https://github.com/basudevbiju).
