# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

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
