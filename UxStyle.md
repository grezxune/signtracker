# SignTracker UX Style

## Product Tone
- Calm, supportive, family-safe.
- Clear guidance over dense controls.
- Encourage progress visibility and low-friction data entry.

## Visual Direction
- Primary palette: Indigo + Blue accents for progress and trust.
- Success states: Green.
- Warning/destructive states: Red.
- Surfaces: Rounded cards (`rounded-xl` / `rounded-2xl`) with subtle shadow.

## Typography
- Use Geist Sans for UI text.
- Keep hierarchy simple: large page title, medium section titles, readable body text.

## Layout
- Mobile-first spacing and controls.
- No full-page horizontal scrolling (`overflow-x: hidden` at root).
- Sticky headers for dictionary/detail workflows.

## Motion
- Short, purposeful transitions (`duration-150` to `duration-200`).
- Loading indicators for async states.

## Accessibility
- Keyboard-close for modals and menus.
- Maintain visible focus styles.
- Ensure color contrast for badges and action buttons.

## UI Rules
- Never use browser native `alert`, `confirm`, or `prompt`.
- Use `ConfirmationModal` for destructive actions.
- Keep forms explicit, with clear success/error states.
