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
The UI have natural language and metaphors
### Advantage
 - 'Who's around right now?' uses conversational, social language rather than technical jargon — matches how users think about the problem.
 - Interest tags use everyday names (Pickleball, Coffee, Hiking) not system identifiers — the tag picker feels like selecting stickers, not filling a database field.
 - The map pin metaphor is universally understood. Pinning users to a physical map directly mirrors the real-world concept of knowing who's nearby.

## User Control and Freedom
The UI didn't have exit for group chat deletion
### Advantage
 - Back arrow on registration and tag picker screens gives users a clear way to undo navigation steps.
 - 'Cancel' button on the tag customisation bottom sheet lets users dismiss without saving — correct for a potentially destructive action.
### Issue
 - No visible way to leave or delete a group chat from the chat detail screen. Users can see members and export links but cannot exit the group — a significant missing control for social apps.

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
The UI have power-user paths alongside beginner flows
### Advantage
 - Radius slider on the map lets experienced users quickly tune their search distance without navigating to a settings screen.
 - 'Filter by interest…' search bar on the map is an accelerator for users who know exactly what they want — skips browsing the tag picker.
 - Chat export links (Instagram DM, Discord) serve power users who prefer to move conversations to their primary messaging platform.

## Minimalist Design
The UI is clean and purposeful, with no visual clutter
### Advantage
 - The onboarding screen ('who's around right now?') uses a single headline, one subline, and two actions — nothing extra. Exemplary minimalism.
 - The video feed uses nearly the full screen for the video, with only a creator name, location, hashtag, and three interaction icons overlaid — content-first design.
### Issue
 - The registration screen shows a developer annotation ('ON SUBMIT: API GATEWAY → USER SERVICE → INSERT INTO users → JWT ISSUED') which is clearly prototype scaffolding. This must be removed before any user testing or release.

## Help Users Recognize/Recover From Errors
The UI might not shown error states that might occur
### Issue
 - No error states are shown for the registration form (invalid email, weak password, duplicate account). These are the highest-frequency errors in any onboarding flow and must be designed explicitly.
 - The map shows no empty state for 0 nearby users. If no one is within the selected radius, users need a clear message and a suggested action (e.g. 'Try widening your radius') rather than just an empty map.

## Help and Documentaiton
The UI might need in-context guidance
### Advantage
 - The prototype annotations (POST /auth/register, GEORADIUSBYMEMBER) serve as excellent internal documentation for the development team, even though they must be removed from the final UI.
### Issue
 - The tag customisation concept ('tap a selected one again to add specifics — e.g. Volleyball · #beach') is a novel interaction pattern not found in mainstream apps. The instructional copy on the tag picker screen is helpful, but a first-use tooltip or onboarding hint would reduce drop-off for users who miss it.
 - The map radius slider has no tooltip or help text explaining that the circle represents a GPS radius and that users outside it cannot see you. New users may misunderstand what the radius controls.
