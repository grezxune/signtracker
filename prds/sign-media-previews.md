---
title: Sign Media Previews
created: 2026-04-29
owner: Tommy
log:
  - 2026-04-29: Documented robust Lifeprint media extraction and Show Sign failure-state improvements
---

## Problem
The Show Sign control can appear broken when Lifeprint media scraping returns no URL. Some signs have GIFs or multiple media variations, but the current scraper only recognizes a narrow HTML pattern and cached previous misses as `mediaType: "none"`.

## Business Context
Parents use SignTracker as a quick reference while practicing ASL with children. Inline media previews reduce context switching and make tracked signs more useful during repeated practice.

## Goals & KPIs
- Increase successful inline preview retrieval for Lifeprint-backed signs.
- Make every Show Sign click produce a visible outcome: media, loading, no-preview fallback, or error.
- Preserve the Learn Sign fallback for signs without embeddable media.

## Personas/Journeys
- Parent owner opens a child's sign list, taps Show Sign, and sees a GIF/video/image without leaving the page.
- Parent owner taps Show Sign on a sign without embeddable media and receives a clear fallback message.
- Shared family member receives the same visible outcome without elevated permissions.

## Functional Requirements
- Extract media from Lifeprint pages using normalized URL parsing rather than one hard-coded relative path pattern.
- Prefer animated GIFs from Lifeprint GIF directories, then direct videos, then static sign images.
- Track multiple discovered candidate URLs in the action response for future UI expansion.
- Retry records previously cached as `mediaType: "none"` so older false negatives can self-heal.
- Generate a Lifeprint URL from the sign id when a tracked sign has no saved dictionary row, then cache the result.
- Show an inline no-preview message when no media is found.
- Show an inline error message when fetching media fails.

## Non-functional Requirements
- Keep the scraper deterministic and resilient to HTML formatting variations.
- Avoid browser-native alerts/prompts.
- Maintain responsive, accessible button and status states.

## Security Architecture & Threat Model
- Lifeprint URLs are treated as untrusted remote content; only normalized HTTP(S) media URLs are returned.
- The media action does not grant child data access by itself and only fetches public dictionary media.
- No secrets or authenticated user data are sent to Lifeprint.

## Performance Strategy & Budgets
- Use cached saved-sign media when present.
- Perform Lifeprint scraping only on demand from Show Sign.
- Keep a single Show Sign interaction under a practical p95 target of 3 seconds when Lifeprint responds normally.

## Data & Integrations
- Convex `savedSigns.mediaType`, `gifUrl`, `videoUrl`, and `imageUrl` remain the persisted cache fields.
- Action responses may include non-persisted `variants` for discovered alternate candidates.
- Lifeprint remains the source for scraped public sign media.

## Open Questions
- Should future UI expose a variation picker when multiple GIFs are found?
- Should no-preview results get a timestamped cache field to avoid repeated retries for true misses?

## Risks & Mitigations
- Risk: Lifeprint HTML changes again.
  - Mitigation: extract and rank URLs generically by path/type.
- Risk: Repeated misses can re-fetch Lifeprint.
  - Mitigation: the interaction remains user-triggered and scoped to one sign at a time.

## Success Metrics
- Known Lifeprint pages such as dad/eat/pig resolve inline media.
- Failed media fetches no longer look like no-ops.

## Rollout Plan
1. Ship scraper improvements and UI status handling.
2. Validate with local tests and production-like sign samples.
3. Monitor user feedback for signs that still lack previews.

## Next Steps
- Add a variation picker if multiple candidates prove useful in practice.
