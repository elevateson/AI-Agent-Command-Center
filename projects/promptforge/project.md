# ⚡ PromptForge

**Project ID:** PRJ-001  
**Status:** LIVE 🟢  
**Last Synced:** 2026-01-31

---

## 📝 Description

AI-powered prompt builder SaaS. LIVE at getpromptforge.app. Supabase auth configured, Google OAuth credentials ready.

---

## 📋 Tasks

| Status | Task |
|--------|------|
| 🔵 PROGRESS | Fix Google OAuth |
| ⬜ TODO | GitHub OAuth |
| ⬜ TODO | User dashboard |
| ⬜ TODO | Save prompts to DB |

---

## 📂 Key Files

/app/login/page.tsx — Auth UI
/lib/supabase.ts — Client config
/app/api/enhance/route.ts — AI API

---

## 🚧 Blockers

Google OAuth button not clickable — need Vercel env vars

---

## 📤 Handoff Notes

Last worked on OAuth. Supabase client configured. Google credentials created in GCP console. Next: verify Vercel env vars are set, redeploy, test login flow.

---

*Auto-synced from Taylor's Board*
