# Coach module — handoff for the Speak City demo

Source: the Spanish-learners ad brief (split screen, barista Lucas, phrase cards). The module adds the product features the ad shows, as one file: `modules/coach.js`. Without it (or with `?coach=0`) the demo behaves exactly as before.

## What it adds
1. **Pronunciation drill** (café, play mode and `cta-drill`). A phrase card at the top of the scene shows the English (black, underlined), the target phrase (red, large) and the spelled-out pronunciation (`BAH-leh`). The word being spoken gets a yellow box. In the pronunciation line, the active chunk or syllable turns dark with a yellow dot under it. The first try gets an orange "Casi · try again" chip, and Lucas repeats the word syllable by syllable. The retry gets a green check, a green border flash and coins. Phrases for es/fr/it/de are in `DRILL`.
2. **3-minute conversation timer.** A countdown chip under "Your mission" while inside a place.
3. **Honest score card** after the conversation: score /30, then Pronunciation / Grammar / Fluency /10, then a transcript (NPC and YOU) with weak words underlined in orange plus "say LEH-cheh", then one natural-phrasing tip, then **Retry** and **Continue**. Each Retry climbs `LADDER = [12, 19, 27]` and shows "+N since last try". Retry replays drill + dialogue. Continue closes the scene (stamp, as before).
4. **NPC names from the brief:** café = Lucas (Lucas art forced), pharmacy = Emilio, kiosk = Imma (label "Tickets", 🎟️ pin). Applied only in play mode and ad shots, not in the default auto video.
5. **Ad shots** (auto, end with `window.__done`, so the existing "Render video" button records them):
   - `?mode=cta-score`: built plaza, score card climbs 12 → 19 → 27 with Week 1–3 bars (0:51)
   - `?mode=cta-cuts`: three quick iris cuts into café (Lucas), pharmacy (Emilio), ticket kiosk (Imma) (0:58)
   - `?mode=cta-timer`: clock spins to "3 MIN", then the score card with transcript; Retry gets pressed (1:01)
   - `?mode=cta-drill`: café drill Vale → Casi → ¡Eso! ✓
   They are also listed in the Mode select of the settings panel.

## Integration (already done, 3 edits in index.html, each marked `coach hook`)
1. `<script src="modules/coach.js"></script>` goes **before** the main `<script>`. The module only defines things at load time and reads the demo globals lazily.
2. Boot: `spawn((window.SCX&&SCX.boot())||(CFG.mode==='play'?playDirector():director()));`
   `SCX.boot()` returns a shot generator for `cta-*` modes, or `null`. In play mode it also replaces the global `enterScene` with `enterSceneCoach`, which is the original plus timer, drill (café), and the score-card loop.
3. Last line of `draw()`: `if(window.SCX)SCX.overlay();` draws the drill card, timer chip, score climb, clock and score card on top.

Taps on Retry/Continue use a capture-phase `pointerdown` listener on the canvas. Button rects live in `SCX.state.btns`.

## Notes / next steps for the agent
- Scores are simulated, like the rest of the demo. Plug real ASR and scoring into `enterSceneCoach`: replace the fixed `LADDER` value with the real score, and replace `WEAK` with the words the recogniser flagged.
- If you change `enterScene` in index.html, mirror it in `enterSceneCoach` (it is a copy plus additions).
- `capture.py` (next to index.html) renders any mode to MP4 deterministically: `python3 capture.py "mode=cta-score&lang=es" out.mp4`.
