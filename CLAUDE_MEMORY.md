# Canathlon — Permanent Project Reference

> This file is the source of truth for stable, unchanging project facts.
> Claude reads this at the start of every session.
> Do NOT store work-in-progress here — that lives in Claude's dynamic memory.

---

## Project

- **Name:** Canathlon (formerly Dog Olympic Games)
- **Domain:** www.canathlon.com
- **Stack:** Next.js 14+ App Router, TypeScript, Supabase (auth + DB + storage), Vercel, GitHub
- **PWA:** Mobile-first from day one
- **Repo:** https://github.com/dogolympicgamesgr-ai/dog-olympic-games
- **Raw file access:** `https://raw.githubusercontent.com/dogolympicgamesgr-ai/dog-olympic-games/main/src/[path]`
- **Vercel:** dog-olympic-games.vercel.app — Team ID `team_39EnlbBUlvwhNNJvVOO9pXIZ`

---

## Auth

- **Provider:** Google OAuth only
- **Callback:** `src/app/auth/callback/route.ts` — exchanges OAuth code, redirects to `/dashboard`. No profile logic here.
- **Session:** `/auth/session` returns `{ user, profile, isAdmin, roles }`
- **Navbar:** fetches session on mount + `onAuthStateChange` for `SIGNED_OUT` only
- **Cookie:** custom chunked `sb-` cookie reassembly in `src/lib/supabase.ts`
- **Admin check:** `is_admin()` SECURITY DEFINER function — avoids RLS recursion on `user_roles`

---

## New User Creation

- **Trigger:** `on_auth_user_created` on `auth.users` INSERT → calls `handle_new_user()`
- **Function inserts into `public.profiles`:** `id, email, full_name, avatar_url, display_email`
- `display_email` is seeded from `new.email` at creation — **never null**
- Existing users backfilled: `UPDATE profiles SET display_email=email WHERE display_email IS NULL`
- No profile logic in auth callback or application code

---

## Roles

- Stackable: Participant (default), Judge, Organizer, Decoy, Admin
- Non-admin roles assigned by admin only
- Stored in `user_roles` table: `user_id`, `role`
- Exact role strings: `'judge'`, `'organizer'`, `'decoy'`, `'admin'`

---

## File Conventions

- Server Supabase client: `src/lib/supabase-server.ts` → `createServerSupabaseClient()`
- Browser Supabase client: `src/lib/supabase.ts` → `createClient()`
- i18n: `t(el, en)` pattern via `LanguageContext` — all new pages use this from day one
- Dynamic route brackets URL-encoded in raw GitHub URLs: `%5Bid%5D`
- `params` in App Router on Vercel must be unwrapped with `use(params)`

---

## Database — Key Tables & Columns

### `profiles`
| column | type | notes |
|---|---|---|
| id | uuid | PK (NOT user_id) |
| email | text | Google account email |
| display_email | text | Public email, seeded from email, never null |
| full_name | text | |
| avatar_url | text | |
| member_id | text | 5-digit zero-padded |
| status | text | active / banned / deleted |
| ban_reason | text | |
| no_show_count | int | current warning count |
| total_no_shows | int | lifetime count |
| push_notifications | bool | |
| email_notifications | bool | |

### `dogs`
- `dog_id` format: `memberid.dogcount` (e.g. `00001.1`)
- `chip_number` text, required at creation
- `neutered` bool
- `photo_url`, `status` (active / retired / in our memories)
- Breeds from fixed seeded table (555 entries)

### `notifications`
| column | type |
|---|---|
| id | uuid |
| user_id | uuid |
| type | text |
| title_el | text |
| title_en | text |
| message_el | text |
| message_en | text |
| read | bool |
| metadata | jsonb |
| created_at | timestamptz |
| expires_at | timestamptz |

- No `action_url` column
- `pg_cron` daily cleanup job (30-day expiry via `expires_at`)
- INSERT triggers Edge Function `notify` → push to all user devices + email for `title_earned` / `no_show_warning`

### `user_roles`
- `user_id`, `role` (text)

### `judge_qualifications`
- `judge_user_id`, `sport_id`, `max_sublevel`

### `foundation_ranking`
- `entry_top2_points`, `basic_top2_points`, `entry_locked`, `basic_locked`
- Lock logic: `entry_locked=true` on any Basic attempt; `basic_locked=true` on any discipline attempt
- Score = top 2 successful attempts sum. 2 passes = title minimum.
- `entry_participations` / `basic_participations` count **successful passes only**, NOT total runs — never use for display as "times run"
- A dog can run at the same level unlimited times; lock triggers only on attempting the next stage

### `dog_sport_ranking`
- `dog_id`, `sport_id`, `current_sublevel`, `participations`, `title`, `total_points`

### `competition_results`
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| event_id | uuid | FK events |
| dog_id | uuid | FK dogs |
| owner_id | uuid | FK profiles |
| category_id | uuid | FK event_categories |
| score | numeric | |
| placement | integer | |
| passed | boolean | |
| level_at_time | text | |
| submitted_by | uuid | FK profiles |
| approved_by | uuid | FK profiles |
| status | result_status | enum: pending, approved |
| created_at | timestamptz | |

### `seminar_registrations`
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| seminar_id | uuid | FK seminars |
| user_id | uuid | FK profiles |
| status | text | default 'confirmed' |
| attendance_status | text | attended / no_show |
| created_at | timestamptz | |

## Component Conventions
- Pagination: Mobile 7 (lists) / 3 (widgets), Desktop 20. Load More adds same amount.
- `t('el','en') === 'el'` for language detection when arrays needed (not passing arrays to `t()`)
- `EventCalendar`: `src/components/EventCalendar.tsx` — shared, used by events + seminars listing
- Events/Seminars listing: two-query architecture (lightweight dots query + paginated full records)

### `team_members` RLS
- INSERT: allows self OR captain (team's `created_by`)
- UPDATE: allows captain OR invited user

---

## Sport IDs (hardcoded in results + eligibility logic)

| Sport | ID |
|---|---|
| Entry Level | `eed3995d-6e70-42c9-994d-4c684c7e9286` |
| Basic Level | `72b6e4ff-3ef5-4f85-bcba-9385ead2b37f` |
| Obedience | `7fb8f0e4-b196-4bbf-adfc-a242388834a2` |
| Protection | `8b541fbf-5677-4511-8c30-cb0b45285352` |
| Detection | `6d4d3351-b297-4fcf-8eb1-53f01abc2ded` |
| Agility | `28b101f4-c34d-48d9-a003-c47ea51009e9` |

- Entry + Basic are **independent** (not sequential) — branch strictly on `sport_id`
- `is_foundation` flag on sports table distinguishes foundation from discipline sports
- Disciplines: 2 runs = sublevel up, 3 sublevels, title at sublevel 3

---

## Storage Buckets

All public: `avatars`, `dogs`, `seminars`

---

## Status Enums

- Events/Seminars: `content_status` enum (NOT `event_status`)
- Values: `pending`, `approved`, `completed`, `results_approved`, `cancelled`
- UI label overrides: `completed` → "Pending Results", `results_approved` → "Completed"

---

## Push Notifications

- VAPID keys: Supabase secrets + `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in Vercel
- `push_subscriptions` table: `user_id`, `endpoint`, `p256dh`, `auth`
- SW: `public/sw.js`
- `PushProvider`: `src/components/PushProvider.tsx`

---

## Email

- Provider: Resend
- From: `noreply@canathlon.com`
- Catch-all: ImprovMX → `dogolympicgamesgr@gmail.com`
- Key: `RESEND_API_KEY` in Supabase secrets + Vercel
- Templates: `src/lib/emailTemplates.ts` — `newEventTemplate()`, `newSeminarTemplate()`, `broadcastTemplate()`
- Edge Function sends email for `title_earned` + `no_show_warning` only
- Broadcast emails sent directly from `src/app/api/admin/broadcast/route.ts`

---

## Admin Panel — `src/app/admin/page.tsx`

Sections: Users, Roles, Events, Seminars, Results, Teams, Dogs, Absences, Communications

### AdminCommunications
- Audience: All / Judges / Organizers / Decoys
- Channels: Push + Email (independently selectable)
- Bilingual message fields (Greek + English)
- Email preview modal (iframe, live-generated)
- Calls `/api/admin/broadcast`

### AdminEvents / AdminSeminars
- 📢 Notify button on approved items → modal → push/email choice → calls broadcast API

---

## Key Architectural Rules

- **RLS is the most common silent failure.** Always check policies before touching code when queries return nothing.
- **`profiles.id` is the PK** — never `user_id`.
- **Notification delivery failures are non-blocking by design.**
- **`browser_batch` for GitHub fetching is unreliable** — navigate first, then `get_page_text` separately.
- **Chrome MCP viewport capped ~638px** — never rely on it for desktop layout.
- **Supabase FK join ambiguity** resolved with explicit key hint syntax.
- **`content_status` enum** — not `event_status`. Always confirm enum names before migrations.

---

## Pending Fixes (move to Claude dynamic memory when working on these)

- **(D)** Notification action links — `action_url` column exists, UI never uses it
## Session Log — May 2026

### Completed
- Placeholder pages: /about, /rules, /videos, /terms (pure server components, no hooks)
- teams/page.tsx: removed points, live client-side search, single stat, 2-query architecture
- teams/[id]/page.tsx: removed points, fixed dogs N+1 (single batched query), breeds fix
- Ban system: navbar checks on init + every pathname change + real-time Supabase channel, /banned page with reason fetched from /auth/session
- notifications.expires_at default: 30 days → 7 days (DB column default altered)
- breeds table: only has id+name (no name_el/name_en) — always use breeds(name), render as dog.breeds?.name with no t()

### Pending DB Cleanup (needs admin approval)
- teams table: drop point-related columns (total_points etc) — UI already removed, columns dormant
- dogs/[id]/page.tsx: 3rd stat circle replaced with Best Rank (#N + category) via get_dog_best_rank() Postgres function
- profile/[member_id]/page.tsx: fetches foundation+sport rankings for all active dogs, passes dogRankings to StatsCircles
- StatsCircles.tsx: dropped 3rd circle, now Dogs+Events only; added Titles section listing all earned titles across owner's active dogs grouped by dog, clickable to dog page
- Ranking rows on dog page: participation counts removed entirely (data unreliable — counts passes not runs)
- get_dog_best_rank(p_dog_id uuid): Postgres function returning best rank position across all categories; mirrors ranking page sort logic; uses $func$ delimiter (Greek chars break $$ in Supabase editor); foundation returns 'entry'/'basic' keys mapped client-side via FOUNDATION_LABELS
- StatsCircles dogRankings prop is optional (?) — dashboard page uses StatsCircles without it