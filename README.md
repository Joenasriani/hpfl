# Hybrid Product Fusion Lab (HPFL)

An AI-assisted product ideation prototype that compares **2 to 5 existing products**, examines their strengths and shortcomings, generates hybrid concepts, and develops structured product blueprints.

## Workflow

1. Enter at least two products; add up to five.
2. Analyze each product with the configured AI service.
3. Generate and review combinations and hybrid concept directions.
4. Develop a selected concept into a blueprint, including product specifications, market framing, business strategy, and implementation planning.

The application presents this work through its **11-phase product-development framing**. The phases organize the exploration; they do not constitute independent validation.

## Technology

- React, TypeScript, and Vite frontend.
- Server-side `api/gemini.ts` endpoint using the Google Gen AI SDK.
- Frontend requests to `/api/gemini` rather than placing a Gemini API key directly in client code.
- The API handler expects `GEMINI_API_KEY` in the server environment.

## Running and deploying

```bash
npm install
npm run dev
```

A Vite development server alone does not provide the serverless `/api/gemini` endpoint. AI requests require a host or local development setup that runs the API handler and supplies `GEMINI_API_KEY` securely. Deployments must verify API routing and protection separately.

## Status and limits

**Product-development prototype.** Generated claims about competitors, market size, novelty, feasibility, costs, and business opportunities require independent corroboration. A generated blueprint is not proof of market demand, patent clearance, technical feasibility, or manufacturing readiness.

The API includes application-level request limits, but the source alone does not establish production-grade abuse protection or a validated security posture.

Credit: Joe Nasr

Portfolio: https://joe-nasr-signals.vercel.app/
