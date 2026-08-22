# Mobile app release plan

Last reviewed: 2026-08-22

## Purpose and scope

This document is the implementation plan for releasing Moment Play as an
Android application. It is a planning contract, not a statement that the work
below is already implemented. Android is the first target; iOS-specific work is
listed separately so that the shared design does not block a later iOS build.

The intended application shape is a bundled web application running through
Capacitor. Single-player games and their required assets remain local. Supabase
continues to provide authentication and online features; the native shell must
not load the product UI from a remote website.

Before native implementation begins, decide and keep stable:

- the Android application ID, such as `com.momentplay.game`
- the public HTTPS domain used by privacy, deletion, and verified deep links
- the store-facing application name, publisher name, and support contact
- the Android orientation policy

The example application ID above is not final until it is recorded in the
native project and store configuration.

## Implementation principles

- Keep platform APIs behind shared adapters instead of scattering Capacitor
  calls through game components.
- Keep secrets and the Supabase `service_role` key out of the Vite client and
  native application bundle.
- Derive callback and public-page URLs from environment configuration; do not
  repeat production URLs in components.
- Preserve the current web build and HashRouter behavior while adding a native
  callback path.
- Make online failures explicit without preventing access to local
  single-player games.
- Add only behavior-focused tests that protect security, lifecycle, or offline
  contracts. Do not test incidental text positions or markup order.

## 1. In-app account deletion

### User experience

Add account deletion to authenticated account settings. The action must use a
destructive confirmation flow that explains what will be removed, requires a
fresh confirmation, prevents duplicate submission, and shows a recoverable
error if the server cannot complete the request. On success, clear local
session and account-scoped state and return to the guest home screen.

### Server contract

Implement deletion as an authenticated Supabase Edge Function. The function
must derive the target user from a verified access token and must never accept
an arbitrary user ID from the client. Only the server function may use the
Supabase admin client and `service_role` credentials.

The repository currently has deletion-order constraints that must be handled
deliberately:

- `public.omok_rooms.host_user_id` references `auth.users(id)` with
  `ON DELETE RESTRICT`, so rooms owned by the user must be removed before the
  Auth user.
- `public.game_results.user_id` cascades from the Auth user, while
  `public.game_results.attempt_id` restricts deletion of its private ranked
  attempt. The final cleanup order must preserve results until their dependent
  ranked data can be removed safely.
- profiles, friendships, invitations, room membership, moves, ranked attempts,
  checkpoints, and results must be covered by an explicit database contract
  test rather than assumed to cascade correctly.

Use a database function or equivalent transaction for application-row cleanup,
then call the Auth admin deletion API. Auth administration and the database
cleanup are not one cross-service transaction, so the workflow must be
idempotent and safe to retry after either phase. Define the response for
already-deleted users and log failures without logging tokens or personal data.

Deleting a user revokes refresh-token-backed sessions, but an already issued
access token can remain valid until it expires. Sensitive RPCs and API paths
must therefore reject a deleted identity, and the deletion verification must
exercise an old access token as well as session restoration.

## 2. External account deletion page

Add a public `/account-deletion` route on the canonical HTTPS site and publish
that URL in Google Play Console and the privacy policy. The page should:

- identify Moment Play and the developer
- explain which data is deleted or retained and for how long
- let an authenticated user invoke the same server deletion contract used by
  the app
- provide a support fallback when the user cannot sign in
- avoid accepting an account identifier as sufficient proof of ownership

The app and web page must share the deletion application service and status
model; they must not implement separate cleanup logic.

## 3. Privacy policy and data inventory

Create one canonical privacy policy and render or link it from the app, public
website, account deletion page, and store listing. Before writing final policy
language, maintain a data inventory that covers at least:

- email address, Supabase user ID, and Google OAuth identity
- profile nickname and friend code
- friendships and game invitations
- online Omok rooms, membership, and moves
- ranked attempts, checkpoints, proof data, and verified results
- local game records and user settings
- session credentials stored on the device
- operational logs required to secure and diagnose the service

For every category record its purpose, storage location, processor, retention,
deletion behavior, and whether it is shared. Name Supabase and Google where
applicable, publish a support contact, and give the policy an effective date
and revision history.

## 4. Google Play Data safety declaration

Draft the declaration from the same data inventory as the privacy policy, but
finalize it only after dependencies, analytics choices, authentication, and the
release build are frozen. For each data type record whether it is collected,
shared, required, optional, encrypted in transit, and deletable.

Keep the final store answers in `docs/google-play-data-safety.md` so later SDK
or feature changes have a reviewable checklist. The declaration must describe
the shipped build, including third-party SDK behavior, rather than only code
written directly by Moment Play.

## 5. Google login and native deep links

Add the Capacitor Android foundation before changing authentication. The
current browser flow uses HashRouter and supports an explicit
`VITE_AUTH_CALLBACK_URL`, but there is no native lifecycle or callback handler
yet.

The native flow should:

1. start Supabase Google OAuth with `skipBrowserRedirect: true`
2. open the provider in the system browser
3. receive the redirect through the centralized native URL adapter
4. validate and exchange the PKCE callback through the existing shared auth
   callback service
5. validate `returnTo` with the existing internal-path rules
6. close the browser and restore the intended screen without starting a game or
   joining a room automatically

Prefer a verified HTTPS Android App Link for the production callback. A custom
scheme such as `momentplay://auth/callback` may be retained as a documented
fallback, not as an independently implemented auth flow. Handle cold start,
warm start, cancellation, duplicate callbacks, expired codes, and a callback
received while the app is already open.

## 6. Android lifecycle and layout behavior

Create one native runtime service that translates platform events into shared
application events. Games and pages should consume that contract instead of
registering their own global listeners.

### Back button order

1. Close the topmost modal or overlay.
2. Ask for confirmation when leaving an active game would discard progress.
3. Navigate to the previous in-app route.
4. Allow application exit only from the root state.

### Background and resume

- Pause game timers, audio, animation loops, and input while inactive.
- Resume exactly once without double-counting elapsed time.
- Preserve recoverable game state through ordinary backgrounding and activity
  recreation.
- Revalidate online state after a meaningful network interruption.

### Rotation and safe area

Choose the orientation policy explicitly rather than relying on a default.
Responsive layouts must not reset game state during configuration changes.
Expose safe-area insets as semantic tokens in
`src/shared/styles/foundation.css`; shared page and modal layouts consume those
tokens so game-specific CSS does not repeat device padding.

## 7. Icons, splash screen, and store assets

Maintain master source assets and generate platform sizes from them. Required
outputs include:

- Android adaptive icon foreground and background
- launcher icon and notification-safe variants where needed
- splash screen for supported themes and resolutions
- Google Play icon, feature graphic, phone screenshots, and tablet screenshots
- short description, full description, privacy URL, deletion URL, and support
  contact

Do not manually maintain many resized copies or use assets without a recorded
license. Validate legibility, cropping, dark mode, and launch transitions on
real device densities.

## 8. Offline single-player contract

Bundle all code, fonts, illustrations, sound, and game data needed to launch and
play locally. A fresh install in airplane mode must reach the guest experience
and run every single-player game:

- 2048
- Sudoku
- Memory
- Star Flight
- Glow Sequence
- Timing Tap
- Solitaire
- Minesweeper
- LITS
- Shikaku
- Mosaic
- SET
- Block Blast
- local Omok

Rankings, friends, online Omok, account actions, and Google login may report
that a connection is required, but their failure must not block the catalogue
or local games. Verify fresh install, existing and expired sessions, network
loss during play, force-stop and restart, background and resume, rotation, and
local record persistence.

## Delivery order

Implement in this order to avoid rebuilding later stages:

1. Audit the deletion graph and define the retry-safe account deletion contract.
2. Add in-app deletion and the external deletion page through one application
   service.
3. Build the canonical privacy data inventory and initial policy.
4. Add the Capacitor Android project and platform adapter boundaries.
5. Add the native Google OAuth callback flow.
6. Centralize Android back, lifecycle, orientation, and safe-area behavior.
7. Generate application and store assets.
8. Complete offline and device QA.
9. Freeze dependencies and finalize the Play Data safety declaration.

Suggested commit boundaries:

1. `feat(account): add secure account deletion lifecycle`
2. `feat(account): add external account deletion page`
3. `docs(privacy): add canonical privacy and data inventory`
4. `feat(mobile): add Capacitor Android foundation`
5. `feat(auth): add native OAuth deep-link flow`
6. `feat(mobile): centralize Android lifecycle behavior`
7. `chore(mobile): add generated application assets`
8. `test(mobile): verify offline single-player contract`
9. `docs(play): finalize Data safety declaration`

## Quality gates

Before a store build is accepted, run the existing static quality, unit,
integration, browser, database contract, and production-build gates, followed
by:

- Capacitor Android synchronization
- a clean Gradle release bundle build
- account deletion verification against an isolated database
- native OAuth cold-start and warm-start verification
- back-button, background, resume, rotation, and safe-area device checks
- a fresh-install airplane-mode smoke run for all single-player games

Tests should protect the deletion graph, authorization, OAuth callback
idempotency, runtime lifecycle, and offline availability. Avoid assertions that
only freeze wording, incidental DOM order, or pixel position.

## iOS follow-up

The shared platform boundaries should leave room for iOS without pretending
that the Android release completes it. A later iOS release still requires:

- Sign in with Apple evaluation and implementation where required
- Universal Links and iOS callback registration
- Xcode signing, provisioning, App Store Connect, and TestFlight
- iOS safe-area, lifecycle, and device testing
- Apple privacy labels, policy links, and account deletion review

## Policy and platform references

Policies change, so re-check the current versions before implementation and
again before store submission:

- [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Google Play Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google Play target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Google Play testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Supabase admin user deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)
- [Supabase Edge Function authentication](https://supabase.com/docs/guides/functions/auth)
- [Supabase native mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Capacitor documentation](https://capacitorjs.com/docs)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
