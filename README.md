# Speak City — interactive demo

Open `index.html` (works on phone and desktop).

- Phone: full-screen 9:16, ⚙︎ opens settings, ⛶ toggles full screen. On iPhone: Share → Add to Home Screen to open it like an app.
- URL params: `?mode=auto|play&char=ana|leo&lang=es|fr|it|de&speed=1`
- Play mode: tap a building, the hero walks there; drag to look around.
- Render video (auto mode): records the scenario in real time and downloads the file.
- Score card mode (`?mode=score`): the post-dialogue score screen — attempts, transcript, retry, then NEW DISTRICT UNLOCKED. Settings: attempts (1–3), scores out of 25, district name, background (blurred city or green screen), finger taps, animation speed. Render video saves it as an MP4 at 1080×1920.
  URL params: `scores=14,18,23&district=Aeropuerto&bg=green&taps=0&speed=1`
- Phrase cards tab (`cards.html`): paste lines like `¿Perdona, cómo? (Sorry, what was that?) /pehr-DOH-nah, KOH-moh/` and export ad phrase cards as transparent PNG (one, or all as a zip) or as a video with word-by-word highlight (WebM with transparency in Chrome/Firefox, MP4 in Safari).
- Coach module (`modules/coach.js`, see `modules/COACH_README.md`): pronunciation drill, 3-minute timer, score card with transcript and Retry, plus ad shots `?mode=cta-score|cta-cuts|cta-timer|cta-drill`. `?coach=0` turns it off.

Hosted with GitHub Pages: Settings → Pages → Deploy from branch → `main` / `(root)`.
