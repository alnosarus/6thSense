# SenseProbe Project Context

## What This Is

SenseProbe is building a robotic sensing stack that combines:

1. Surface-contact tactile sensing (piezoresistive fingertip arrays)
2. Volumetric non-contact mechanical sensing (ultrasound-driven inference)

The thesis is that robots need both channels to approach human-grade physical interaction.

## Core Value

Deliver the first practical "artificial nervous system" for robots by fusing low-cost tactile fingertips with depth-aware sensing.

## Current Milestone: v0.1 Landing + Positioning

**Goal:** Ship a credible public-facing landing page that explains the two-channel sensing thesis and attracts pilot partners.

**Target features:**
- Distinctive landing page with clear technical narrative
- Evidence-backed claims from existing tactile prototype work
- Early partner waitlist capture

## Requirements

### Validated

- (None yet)

### Active

- [ ] Publish a landing page with clear product narrative
- [ ] Communicate technical architecture (PNS + CNS + Fusion)
- [ ] Include pilot/waitlist conversion CTA

### Out of Scope

- Production backend for lead capture (defer)
- Full interactive product demo (defer)
- YC application copy finalization (separate workstream)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Frame as "complete artificial nervous system" | Clear differentiation from pure tactile systems | Accepted |
| Start with static landing page in existing repo | Fastest path to shipping signal | Accepted |
| Keep medical + non-medical vertical narrative | Preserves broad market thesis | Accepted |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update context with current state

---
*Last updated: 2026-04-09 after initialization*
