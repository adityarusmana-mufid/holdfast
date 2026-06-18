# Bug: Clicking empty squad slots does not enter unit selection

**Date:** 2026-06-16

## Description

In the SquadScene, clicking on an empty squad slot should enter the unit selection
flow (show picker and allow choosing a unit for that slot). Currently:

- **Auto Fill** button works correctly — fills all 12 slots with the recommended
  composition.
- **Clicking an empty slot** does nothing. No picker appears, no state changes.

## Expected Behavior

1. Click empty slot → picker panel opens → click unit in picker → unit assigned to slot.

## Current Behavior

1. Click empty slot → nothing happens. Slot remains empty.

## Investigation Notes (if any)

- The auto-fill button works, so the slot assignment logic exists.
- The click handler on empty slots likely lacks a listener or the event
  propagation is blocked.
- File: `src/scenes/SquadScene.ts` — check click handlers on slot containers.

## Priority

Medium — blocks squad customization flow.
