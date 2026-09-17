<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1nVU-FQhb74BR-xD1hJTt_1-zVBjtcrLk

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set `GEMINI_API_KEY` in `.env.local`. This key is server-only; do not expose it through a `VITE_` variable or browser bundle.
3. Run the full app, including the server API route:
   `npx vercel dev`

`npm run dev` starts the Vite frontend only and does not provide the `/api/gemini` server function.

## Vercel

Set `GEMINI_API_KEY` as a Vercel server environment variable for the project. The browser calls `/api/gemini`; the Gemini credential remains on the server.
