# Heuristic Evaluation
## Visibility of System Status
The UI have excellent real-time feedback throughout
### Advantage
 - Map screen shows live count '6 nearby' and radius (2.0 km) updating in real time — users always know what the system is doing.
 - Chat list shows 'SOCKET.IO · 7 ONLINE' in the header — connection state is surfaced directly to the user.
 - Video screen shows '♦ PLAYING · 135 CLIP FROM QUAIL HILL' as a live status bar — playback state is always visible.
### Issue
 - Registration form has no loading indicator after tapping 'Continue →'. The API call (INSERT INTO users) could take 1–2 seconds — the user receives no feedback during this time and may tap again.

## Match System Words to the Real World
## User Control and Freedom
## Consistency and Standards
The UI have strong visual visual and interaction consistency
### Advantage
 - Bottom navigation is consistent across Map, Vids, Chat, and You screens — the same four tabs appear in the same order everywhere.
 - Avatar initials style (coloured circle + 2-letter monogram) is used uniformly for users across Map pins, Chat list, Group members, and in-chat bubbles.
 - The '+' floating action button appears on Chat and Map with consistent placement and style — users learn the pattern once and apply it everywhere.

## Error Prevention
The UI might miss for confirmation on some key actions
### Advantage
 - The tag customisation sheet requires an explicit 'Save' tap, means changes are not auto-committed, which correctly prevents accidental tag additions.
### Issue
 - Tapping a user's pin on the map likely initiates contact or reveals their location — there is no confirmation step shown. For privacy-sensitive social apps, accidental disclosure of intent (e.g. opening a chat) should be preventable.
 - The 'Export to Instagram DM / Discord' links in the group detail sheet appear as one-tap actions with no confirmation dialog. Exporting a chat to an external platform is irreversible and should require an explicit confirm step.

## Recognition Rather than Recall
The UI have excellent use of persistent visual cues
### Advantage
 - Interest tags are always shown as coloured pills on the profile and map filter bar — users never need to remember what they selected.
 - The map filter bar ('Pickleball · Coffee · Photography…') shows active filters inline, so users can see at a glance what is affecting their results.
 - The tag customisation sheet surfaces 'SUGGESTED' subtags before the free-text input — reduces cognitive load by making the common choices visible.

## Accelerators
## Minimalist Design
## Help Users Recognize/Recover From Errors
## Help and Documentaiton
