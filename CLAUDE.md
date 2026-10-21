# ella: YouTube history documentaries

This repo stores the scripts, photos, thumbnails, and YouTube text for each video, one folder per subject (e.g. `helen_keller/`). Narration and video rendering are done on the user's PC (the long-form kit in `롱폼생성기\projects\`), which holds the ElevenLabs key.

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
- Deliverables go to a Desktop folder "<이름> 영상": `<Name>_English.mp4`, `<Name>_English.srt`, `<Name>_thumbnail.jpg`, `<Name>_YouTube.txt`.
- `<Name>_YouTube.txt` sections: TITLE, DESCRIPTION, [Time Line] (chapter timestamps from the final narration audio), TAGS.
