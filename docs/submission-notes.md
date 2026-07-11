# PassionLedger AI - Submission Notes

Draft notes and reference summaries for the DEV Weekend Challenge.

---

## 1. What I Built
**PassionLedger AI** is a local-first personal bookkeeping application transformed into a dream-funding planner. Instead of just showing where money went in the past, it analyzes discretionary categories, simulates changes, and generates a structured, actionable plan using Gemini AI to fund meaningful life goals (e.g. learning an instrument, starting a business, building a home studio) responsibly.

## 2. Inspiration
Generic expense trackers look like dry utility spreadsheets that guilt-trip users for spending. We wanted an application that turns tracking into motivation. By shifting focus from *what was lost* to *what can be built*, PassionLedger AI inspires users to optimize their finances for goals they actually care about.

## 3. How I Built It
*   **Offline-First & Reactive**: Built on top of React 19, Vite, and TypeScript. It utilizes Dexie.js (IndexedDB) with reactive hooks so that the UI stays in sync with local storage state automatically.
*   **Pure Mathematical Engine**: All core financial metrics, surpluses, timeline estimates, runway projection charts, and feasibility indicators are calculated locally in client-side code. The AI is never trusted to perform primary bookkeeping mathematics.
*   **Privacy-Conscious AI Boundary**: Standard financial apps leak entire bank/transaction databases. PassionLedger AI calculates aggregated totals on-device and transmits only isolated numbers and the target description to the AI endpoint. Names, notes, contact records, bank credentials, and card details are entirely filtered out.

## 4. Google AI Integration
*   **SDK**: Integrated using the official `@google/genai` Node.js client.
*   **Secure API Route**: Implemented a Vercel serverless function (`api/generate-passion-plan.ts`) to avoid exposing API keys in client bundles.
*   **Structured Outputs**: Utilized Zod request schemas and Gemini JSON schema declarations (`responseSchema`) to force the model to return structured data matching the exact TypeScript types.
*   **Deterministic Safety Overrides**: Captured the AI response, validated it with Zod, and overrode the AI-returned `feasibility` parameter with the locally calculated math. This prevents Gemini from hallucinating or falsely telling users they are "on track" when they are not.

## 5. Local Fallback Mechanism
If the server is offline, the API key is missing, or the Gemini quota is exceeded, the application triggers a local deterministic fallback generator. It maps the local calculations to milestones, weekly lists, and suggestions, allowing the user to experience the full app flow seamlessly without showing frightening crash dialogs.

## 6. Challenges & Accomplishments
*   **Challenge**: Getting reliable structured JSON outputs from LLMs. 
*   **Solution**: Standardized on Zod validation combined with native `responseSchema` configurations on the model calls.
*   **Accomplishment**: Designing a highly premium, modern dark-themed financial interface containing a visual progress ring, Recharts line charts, and interactive sliders that respond instantly.
