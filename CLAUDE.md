# ella: YouTube history documentaries

This repo stores the scripts, photos, thumbnails, YouTube text and render tools for each video, one folder per subject (e.g. `helen_keller/`).

**Videos are made in the cloud, not on the user's PC** (the user finds the PC setup too hard). Everything runs in a cloud session on this repo:
- Keys come from the cloud environment's variables: `ELEVENLABS_API_KEY` (narration; if it starts with `Sk_`, lowercase the first letter) and `FAL_KEY` (gpt-image-2 paintings, ElevenLabs music via `fal-ai/elevenlabs/music`). If a key is missing, ask the user to add it under the environment's Environment variables (gear icon next to "Default").
- Reference pipeline: `helen_keller/tools/tts.py` (narration with timestamps), `helen_keller/v2/render4.py` (JFK-style cut: archival film + paintings + photo cards, words popping in as they are spoken, three music beds, film grain, burned-in subtitles).
- Wikimedia Commons is blocked from the cloud (HTTP 429): ask the user to download Commons files and attach them as files (a .zip works); pasted images can't be saved.
- Deliver files with SendUserFile (400 MB limit: two-pass encode to ~1.55 Mb/s for a 30-min video). GitHub releases are blocked; for big files, a branch with <100 MB parts works.

## Thumbnail rules (always, no need to ask)
- 1280x720 JPG, named `<Name>_thumbnail.jpg`.
- **Face on the LEFT, name on the RIGHT.** The portrait fills the left side and fades into a dark background toward the centre. The name is right-aligned on the right side.
- Use a real photo of the person, in sepia.
- First name in white, last name in yellow, in a heavy condensed font (Anton) with a black outline and drop shadow. A short tagline (2 lines, e.g. "BLIND. DEAF." / "UNSTOPPABLE.") goes under the name, also right-aligned.
- The face must look forward (toward the camera), not in profile. If the head is turned slightly, flip the photo so it turns toward the name.

## Video conventions
- Language: English. Voice: ElevenLabs "Bill".
- Pictures: real historical photos (public domain / no known restrictions, e.g. Library of Congress). The person's face appears only in real photos, never in AI images.
- Before any paid step (TTS, image generation), show the estimated cost and get the user's approval.
- Style (the user's series, "like the JFK video", reference channel The People Profiles): continuous picture with long crossfades, no cuts to black; key words pop in on screen as Bill says them; real archival film wherever public-domain footage exists; background music under the narration (about -19 dB relative to speech); no sound effects on zooms.
- Subtitles burned in: white text on a black box, 52 px; also deliver the .srt.
- Deliverables: `<Name>_English.mp4`, `<Name>_English.srt`, `<Name>_thumbnail.jpg`, `<Name>_YouTube.txt`.
- `<Name>_YouTube.txt` sections: TITLE, DESCRIPTION (with sources and an AI-image disclosure if paintings are used), [Time Line] (chapter timestamps from the final narration audio), TAGS, PINNED COMMENT.

## Korean channel "지식파노라마" (explainer videos, e.g. `korea_demographics/`)
- Language: Korean. Voice: ElevenLabs "Anna Kim" (`uyVNoMrnUku1dZyVEXwD`), speed 1.08. The key now belongs to the user's Creator account, where cloned voices work: "Chris voice 1/2/3" and "Chris korean voice 1" are the user's own voice (list them via `/v1/voices`). Use **Chris voice 2** (`Qg9lUXBd42BAuxhVkzCB`) with model **eleven_v4** (`KR_MODEL=eleven_v4`, `KR_SETTINGS='{"_replace":true,"stability":0.5,"similarity_boost":0.8}'`) for new videos: the user loves it because it sounds like talking, not reading a book. (Older choices: Chris korean voice 1 `GGRqXGDNcapWV0dZaziM`, Chris voice 3 `BcCPDhuA3CoK5sgmilX6` on multilingual_v2.) The user may edit the script themselves: keep their wording, only fix spelling (읍니다→습니다, 구요→고요) and stray punctuation. Write the script conversationally: vary sentence endings (~는데요, ~죠, ~거든요), avoid runs of short "~니다." sentences (user dislikes the choppy 다다다 rhythm). Ask viewers only where they are watching, not their age.
- The ElevenLabs key may be stored as `ELEVENLABS_API_KEy` (lowercase y): code reads both spellings. Never print key values.
- Script: ~3,000 chars, hook first, "어디서 시청하고 있는지 댓글에" early, 구독·좋아요 mid-roll, 구독·좋아요·알림 설정 at the end. Narration text only, one paragraph per scene (`script_ko.txt`).
- Style: dark motion graphics (HTML5 canvas rendered with Playwright Chromium, Pretendard font) with animated charts of the script's numbers, keywords popping in as spoken, chapter cards, procedural SFX (no BGM unless asked). Pipeline: `tools/tts_ko.py` → `tools/builddata.py` → `index_ko.html` + `scenes_ko.js` + `main_ko.js` → `render.mjs check / events / video` (4 parallel chunks) → `mix_ko.py` → mux + two-pass compress.
- Subtitles: 62 px white on black box (user chose 62), ≤24 chars per line, from ElevenLabs character timestamps; deliver the .srt.
- Deliverables: `<주제>.mp4`, `<주제>.srt`, `<주제>_thumbnail.jpg` (no person → big headline left, chart/line right, brand top-right), `<주제>_YouTube.txt` with [제목 후보], [설명란] (⏱ 타임라인, 자료 출처, AI 음성 고지), [태그], [고정 댓글].
- AI video clips (fal.ai Kling, ~$0.07/s) are a paid step: show cost and get approval first.
