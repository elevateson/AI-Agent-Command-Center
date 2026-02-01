# PromptForge (PRJ-001)

**Status:** live

**Description:** AI-powered prompt builder SaaS. LIVE at getpromptforge.app. Supabase auth configured, Google OAuth credentials ready.

## Key Files
/app/login/page.tsx — Auth UI
/lib/supabase.ts — Client config
/app/api/enhance/route.ts — AI API

## Blockers
Google OAuth button not clickable — need Vercel env vars

## Handoff Notes
Last worked on OAuth. Supabase client configured. Google credentials created in GCP console. Next: verify Vercel env vars are set, redeploy, test login flow.

## Tasks

| ID | Name | Status |
|----|------|--------|
| PRJ-001-T09 | Fix Google OAuth | progress |
| PRJ-001-T10 | GitHub OAuth | todo |
| PRJ-001-T11 | User dashboard | todo |
| PRJ-001-T12 | Save prompts to DB | todo |