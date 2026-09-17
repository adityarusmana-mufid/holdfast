# In-Game Guide System (Narrator)

## Concept
A non-diegetic guide that speaks directly to the player about gameplay mechanics. No in-world military framing — the guide acknowledges this is a game and acts as a tutorial voice. Think of it as a coach, not a character.

## Design Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Diegesis | Non-diegetic | Avoids religious concerns with narrative characters; honest about being a game |
| Voice | Text only | No voice lines (no audio asset overhead) |
| Persona | Minimal, instructional | Short imperative sentences: "Deploy a unit here. Drones fly over blockers." |
| Placement | Per-stage intro panel | Shows on level load, player clicks to dismiss |
| TR stages | Mechanic teaching | Explains the concept the TR stage teaches |
| Story stages | Tactical hint | Brief description of what to expect |

## Writing Guidelines
- **Instruction over flavor**: every guide text must teach a player action or game concept. "Enemies come from the red tile and must be stopped before the blue tile" is better than "Scout cars approaching from the east."
- **First level priority**: 0-1 must explicitly teach: red spawn = enemy entry, blue goal = enemy exit, player must block to prevent goal reach.
- **Red/blue language**: always refer to spawn/goal tiles by color (red/blue) so UI language matches visual tile language.
- **Avoid narrative framing**: no in-universe tactics, no lore, no military jargon. "Place a unit here to block enemies" not "hold the line."
- **Minimum viable**: if the player can play without reading it, the guide failed. Each guide text must answer "what do I do and why."
- **Rewrite needed**: current v0.1 guides are too story-oriented (see AGENTS.md session 2026-06-22). Future pass required to make all 15 guides instructional.

## Data Model
Add optional `guideText?: string` to `LevelData` type. Each level JSON can include it. When absent, no guide panel shows.

Example:
```json
{
  "name": "Forward Base",
  "guideText": "Enemies emerge from the red tile on the left. If they reach the blue tile on the right, you lose. Deploy a unit on the path to block them.",
  ...
}
```

## UI Pattern
- Semi-transparent dark overlay (like pause screen)
- Centered white panel with guide text content
- "OK" button or tap-to-dismiss
- Auto-dismiss on first mouse click/tap to avoid blocking gameplay
- No blocking — player can read while battle starts (battle begins behind overlay)

## Implementation
- `guideText` field parsed in `jsonToLevelData()` in `chapters.ts`
- `GameScene.init()` stores guide text
- `GameScene.create()` checks for guide text, shows panel if present
- Reuse pause overlay pattern (full-screen semi-transparent Graphics + centered Text)

## v0.1 Status
- [x] `guideText` field in `LevelData` type (`src/types/index.ts:61`)
- [x] Parsing in `jsonToLevelData()` (`src/config/chapters.ts:42`)
- [x] 15 level JSONs populated with guide texts (`levels/*.json`)
- [x] Guide overlay in `GameScene.showGuide()` (`src/scenes/GameScene.ts`)
- [ ] **Needs rewrite** — current texts are too narrative, not instructional enough. See writing guidelines above.

## TR Stage Guide Texts (draft — needs rewrite)
```
TR-1: "Scout cars deal light damage, but they add up. Deploy a Medic behind your frontline to keep units repaired."
TR-2: "Units attack in the direction they're facing. Face them toward the road so they engage hostiles as they pass."
TR-3: "Drones fly over ground units. Marksman Snipers can target them from range tiles."
TR-4: "Vanguards generate Deployment Points. Deploy them early so you can afford stronger units later."
TR-5: "Armored tanks shrug off bullets. Casters deal thermal damage that burns through armor."
TR-6: "When hostiles cluster together, AoE attacks hit multiple at once. Defenders can hold the line while blast units clear the swarm."
TR-7: "Combined arms: use blockers, damage, medics, and casters together."
```

