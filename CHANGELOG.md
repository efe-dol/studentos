# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [0.3.0] - 2026-08-30

### Security & Privacy
- Hardened Supabase RLS: froze `role`/`is_blocked` on self-update, closed a delete+re-insert privilege-escalation, restricted `schedule_shares` reads to the owner (token import via a `SECURITY DEFINER` function), pinned `search_path` on all `SECURITY DEFINER` functions and removed public execute on the cleanup function.
- Removed unneeded personal data: dropped `profiles.birthdate` and `push_subscriptions.user_agent`.
- Added self-service data export and account deletion in Settings.
- Push subscription endpoints are now validated against an allowlist (SSRF hardening); admin user ids are no longer exposed to clients.
- API error responses no longer leak PostgREST/DB detail; lightweight CSRF origin check and a durable rate-limit primitive were added.
- Registration now enforces password minimum requirements (client + server) and a confirm-email field.

### Changed
- Per-subject setting for double-weighting Schulaufgaben (`(KL + 2·GL)/3` vs `(KL + GL)/2`) — for subjects like Physics/Chemistry.
- ToDos moved back into the dashboard as a tab.
- Loading animation only appears on genuinely slow loads and is now a plain spinner.
- Reworked Fächer & Noten, ToDos and landing-page animations.
- Updated the About version shown on the Dashboard to `v0.3.0`.

## [0.2.4] - 2026-04-25

### Changed
- Updated app release version to `0.2.4`.
- Updated the About version shown on Home/Dashboard to `v0.2.4`.

## [0.2.3] - 2026-04-25

### Changed
- Updated grade calculation to the GL/KL pot model for subject averages:
  - KL average remains weighted by individual grade weights.
  - GL average is counted double in the final subject average formula.
  - Subject average now uses: `(KL + 2 * GL) / 3` when both pots are present.
- Average displays now always show exactly 2 decimal places (e.g. `2,16` instead of `2,2`).
- Notification-related UI now clearly marks the feature as "in development" in Settings, Dashboard, and app landing content.
- Loading screen animation timings were slightly reduced for a faster perceived app startup.
- Feedback form submission now uses a robust React/AJAX Formspree integration with clearer client-side error messaging.
- Content-Security-Policy was updated to allow Formspree requests (`connect-src` and `form-action`).

### Added
- Added quick presets for individual grade weighting in the grade dialog, including `0,5x`.
- Added a dedicated average formatting helper to keep grade-entry values and average displays separate.
- Added a custom weight input flow for grade entries with support for decimal values like `0,75` (comma and dot parsing).
