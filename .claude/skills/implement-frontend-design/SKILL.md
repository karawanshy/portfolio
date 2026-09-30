---
name: implement-frontend-design
description: Use when translating an approved portfolio design into frontend code.
---

# Implement Frontend Design

Use when translating an approved portfolio design into frontend code.

## Process

1. Inspect the approved design and relevant existing implementation.
2. Identify the composition, hierarchy, typography, assets, and reusable patterns.
3. Implement using the project's existing architecture and design tokens.
4. Preserve intentional asymmetry, layering, overlaps, and section-specific layouts.
5. Keep content and commonly tuned visual values easy to change.
6. Run relevant typecheck, tests, and build checks.
7. Render the result in the browser before considering implementation finished.

## Principles

- Match the approved design; don't reinterpret it.
- Prefer maintainable layout techniques over excessive hardcoded coordinates.
- Reuse genuine patterns, but don't turn unique sections into generic components.
- Don't optimize away details that are important to the design.
