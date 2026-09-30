---
name: implement-motion
description: Use for substantial animation and interactive motion.
---

# Implement Motion

Use for substantial animation and interactive motion.

## Process

1. Understand the purpose of the approved motion before implementing it.
2. Use the project's existing motion libraries and conventions.
3. Keep durations, easing, thresholds, and similar values easy to tune.
4. Prefer performant transform/opacity animation where practical.
5. Provide an appropriate reduced-motion experience.
6. Test the complete interaction in the browser, including entering and leaving the affected section.

## Principles

- Motion should support the experience, not compete with it.
- Essential content must never depend on animation.
- Avoid unnecessary simultaneous effects.
- Avoid scroll behavior that makes navigation frustrating.
- Clean up listeners, timelines, and animation state correctly.
