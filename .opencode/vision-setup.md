# Vision Capabilities — Two Approaches

## Context

The current session uses a text-only model (deepseek-v4-flash). The `Read` tool
cannot process images with text-only models — it returns "this model does not
support image input." The bottleneck is the model, not opencode.

Two solutions exist, documented below.

---

## Token Economy (Important)

The 9router proxy has a token budget. The `@vision` subagent uses that budget.
The `vision_describe` MCP tool does NOT — it uses the free Gemini API externally.

**Use MCP (Option B) for frequent analysis. Use @vision (Option A) only when
you need actual pixel-level understanding.**

The vision subagent is instructed to:
1. Keep descriptions brief (1-3 sentences by default)
2. Report approximate output token count at end
3. Use the budget model (combo-ngirit) by default

---

## Option A: @vision Subagent (Vision-Capable Model)

**Best for:** One-off pixel-level analysis. **Default model: combo-ngirit (budget).**

### Available Vision-Capable Models (cheapest first)

| Model | Tier | Provider |
|-------|------|----------|
| `combo-ngirit` | Cheapest (default) | 9router combo |
| `combo-deepseek-flash` | Cheap | 9router combo |
| `cf/@cf/moonshotai/kimi-k2.5` | Cloudflare free tier | Cloudflare |
| `sumopod/gemini/gemini-2.5-flash-lite` | Google budget | Sumopod |
| `sumopod/gpt-4.1-nano` | GPT budget | Sumopod |
| `ollama/qwen3.5` | Local/cheap | Ollama |
| `combo-qwen` | Mid-range | 9router combo |
| `combo-glm` | Mid-range | 9router combo |
| `combo-thinking` | Heavy (expensive) | 9router combo |
| `combo-paid` | Premium (expensive) | 9router combo |

### Setup

Already configured in `opencode.json` — uses `combo-ngirit` (budget):

```json
{
  "agent": {
    "vision": {
      "description": "Image analysis agent. Analyzes screenshots (...). CRITICAL: Be concise — minimize output tokens...",
      "mode": "subagent",
      "model": "9router/combo-ngirit"
    }
  }
}
```

To override the model inline, use the model shorthand:
```
@vision (use combo-qwen) Read /tmp/opencode/game-screenshot.png and describe
```

### Usage

```
@vision Read /tmp/opencode/game-screenshot.png and describe what you see
```

The agent will respond with a brief description and estimated token count:
```
Grid with green tiles, cyan route path, 12 unit cards on left.
~120 output tokens used.
```

### How It Works

1. Subagent uses vision-capable model (default: combo-ngirit)
2. `Read` tool sends image as base64 attachment to the model
3. Model responds with pixel-level analysis

### Cost Gradient

| Model | Relative Cost | Best For |
|-------|--------------|----------|
| combo-ngirit | 1× (baseline) | Default, most use cases |
| cf/kimi-k2.5 | ~1-2× | Cloudflare free tier |
| sumopod/gemini-2.5-flash-lite | ~1-2× | Google budget |
| combo-qwen | ~2-3× | When ngirit lacks detail |
| combo-glm | ~2-3× | Alternative mid-range |
| combo-thinking | ~5-10× | Complex visual reasoning |
| combo-paid | ~10× | Only when nothing else works

---

## Option B: opencode-vision MCP Server (Low Cost)

**Best for:** Frequent/free visual analysis. Uses Gemini Vision API free tier
(1500 req/day) + optional PaddleOCR.

### Setup

Already configured in `opencode.json`:

```json
{
  "mcp": {
    "vision": {
      "type": "local",
      "command": ["python3", "-m", "opencode_vision.server"],
      "enabled": true,
      "timeout": 30000
    }
  }
}
```

**Required: Gemini API Key**

1. Get a free key at https://aistudio.google.com/ (no credit card, 1500/day)
2. Add it to `~/.config/opencode/.env`:
   ```
   GOOGLE_API_KEY=your_key_here
   ```

### Tools Available

| Tool | Purpose |
|------|---------|
| `vision_describe(path, prompt?)` | Describe an image in detail |
| `vision_ocr(path)` | Extract all visible text |
| `vision_analyze(path)` | Description + OCR + metadata |

### Usage

```
Can you look at /tmp/opencode/game-screenshot.png and tell me what you see?
→ model calls vision_describe("/tmp/opencode/game-screenshot.png")
```

### Architecture

```
User image ──► opencode-vision MCP server
                    │
                    ├── PaddleOCR (if installed) ──► text
                    └── Gemini Vision API (fallback) ──► text
                    │
                    └── Result returned as text to model
```

The text-only model never needs to see pixels. The MCP server does all visual
processing externally and returns descriptions as text.

### Pros

- **Zero token cost** on 9router — all vision happens externally
- Works with ANY text-only model (no model switching needed)
- 1500 free Gemini requests/day
- PaddleOCR for SOTA OCR if installed locally

### Cons

- First call on a cold start may be slow (Python process startup)
- Needs PaddleOCR installed for best OCR (adds ~15MB model)
- Without PaddleOCR, all requests go through Gemini API (still free)

### Upgrading to Full OCR

```bash
pip install opencode-vision[paddle]
```

This adds PaddleOCR (PP-OCRv5) which handles rotated/degraded text with 0%
error rate on benchmarks. Falls back to Gemini only when confidence < 70%.

---

## Screenshot Capture Script

Location: `scripts/screenshot.mjs`

Captures the current Holdfast game state automatically (navigates to GameScene,
deploys optional unit, waits for simulation).

```bash
# Basic — just screenshot whatever is on localhost:3000
node scripts/screenshot.mjs

# Deploy unit at card index 0 to grid tile (row=1, col=2)
node scripts/screenshot.mjs 0 1 2

# Custom URL / output
GAME_URL=http://localhost:5173 OUTPUT=/tmp/myshot.png node scripts/screenshot.mjs
```

### Setup

```bash
cd /home/aditya/projects/holdfast/scripts
npm install playwright
```

### How It Works

1. Opens headless Chromium at 1280x720
2. Navigates to `GAME_URL` (default: localhost:3000)
3. Clicks AutoFill → Start Mission → GameScene
4. Optionally clicks a unit card + grid tile to deploy
5. Clicks START SIMULATION
6. Waits 8s for combat to play out
7. Saves screenshot

---

## Decision Flow

```
Need game screenshot analysis?
         │
         ├── Frequent / don't want to waste 9router tokens?
         │   └── Use vision_describe MCP tool (Option B — FREE, Gemini API)
         │
         ├── One-off, need pixel-level detail?
         │   ├── Default: @vision (Option A — combo-ngirit, cheap)
         │   ├── Need more detail? @vision (use combo-qwen) ...
         │   └── Complex scene? @vision (use combo-thinking) ... (expensive!)
         │
         └── Need to capture current game state first?
             └── Run scripts/screenshot.mjs, then use Option A or B
```
