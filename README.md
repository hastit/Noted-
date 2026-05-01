<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/08c7b7cb-f9fb-4c12-abfa-f64a405078bc

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set Supabase URL/anon key and edge endpoint in `.env.local` (client-side only):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_AI_SCHEDULER_ENDPOINT`
3. Create a free Gemini key in Google AI Studio:
   [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
4. Set the server secret for the edge function:
   `supabase secrets set GEMINI_API_KEY=your_key_here`
5. Run the app:
   `npm run dev`

## AI Scheduler Provider

The AI scheduler uses **Google Gemini Flash** (`gemini-2.0-flash`) via a Supabase Edge Function.
The API key is server-side only and is never exposed in the client app.

## Deploy Edge Function

1. Deploy the scheduler function:
   `supabase functions deploy ai-schedule`
2. Ensure the secret is set in the target project:
   `supabase secrets set GEMINI_API_KEY=your_key_here`
