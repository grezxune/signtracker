# SignTracker - Development Guidelines

## Project Overview
SignTracker is a family-friendly app for tracking children's ASL sign language learning progress. It must be polished, intuitive, and safe.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Database:** Convex (real-time backend)
- **Auth:** Auth.js (NextAuth v5)
- **Styling:** Tailwind CSS
- **Language:** TypeScript (strict)

## UX Principles

### 1. No Dangerous Actions Without Confirmation
Every destructive action MUST use a confirmation modal:
- Delete/remove operations
- Unshare/revoke access
- Clear/reset operations
- Any action that cannot be undone

Use the `<ConfirmationModal>` component from `@/components/ui/ConfirmationModal`.

### 2. Visual Design Language
- **Corners:** Rounded (rounded-xl for cards, rounded-lg for buttons)
- **Shadows:** Subtle (shadow-lg for modals, shadow-sm for cards)
- **Colors:**
  - Primary: Indigo (indigo-600, indigo-50)
  - Danger: Red (red-600, red-50)
  - Success: Green (green-600, green-50)
  - Neutral: Gray scale
- **Spacing:** Generous padding (p-4, p-6)
- **Typography:** Clear hierarchy (text-lg for headings, text-sm for secondary)

### 3. Mobile-First Design
- Touch-friendly tap targets (min 44px)
- Large buttons (py-3 minimum for primary actions)
- Readable text sizes (text-base minimum for body)
- Proper spacing for thumbs

### 4. Loading & Error States
- Always show loading indicators
- Graceful error messages (user-friendly, not technical)
- Optimistic UI updates where appropriate

### 5. Accessibility
- Proper focus management in modals
- Keyboard navigation (Escape to close modals)
- Screen reader friendly labels
- Color contrast compliance

## Component Guidelines

### Shared Components (src/components/ui/)
- `ConfirmationModal` - For dangerous actions
- `Select` - Custom dropdown selects
- Create reusable components for repeated patterns

### File Organization
```
src/
  app/           # Next.js App Router pages
  components/
    ui/          # Shared UI components
  lib/           # Utilities
convex/          # Backend functions
```

## Code Style

### TypeScript
- Strict mode enabled
- Explicit types for function params
- No `any` unless absolutely necessary (mark with comment)

### React
- Prefer functional components
- Use proper React 19 patterns (use() for params)
- Handle loading/error states explicitly

### Convex
- Validate all inputs
- Use indexes for queries
- Handle edge cases (not found, no access)

## Testing Checklist
Before shipping any feature:
- [ ] Works on mobile
- [ ] Dangerous actions have confirmations
- [ ] Loading states shown
- [ ] Error states handled gracefully
- [ ] Keyboard accessible
