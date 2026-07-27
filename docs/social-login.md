# Social login foundation

## Scope and current deployment state

Moment Play supports Google and Kakao through Supabase's built-in OAuth
providers. Naver is wired to the Supabase custom-provider identifier
`custom:naver`, but remains deliberately feature-gated until its nested
userinfo response has been proven compatible in the hosted project.

The hosted project `nshpwruurbbxomduvinj` was inspected on 2026-07-28.
Google, Kakao, and custom OAuth providers were disabled at that time. No
provider settings were changed by this implementation and no credentials were
added to the repository.

Provider buttons are hidden unless their corresponding build-time flag is
exactly `true`:

```text
VITE_AUTH_GOOGLE_ENABLED
VITE_AUTH_KAKAO_ENABLED
VITE_AUTH_NAVER_ENABLED
```

These flags are public UI configuration, not authorization controls. Supabase
must also have the provider enabled. OAuth client secrets belong only in the
provider console and Supabase Dashboard; never put them in a `VITE_` variable.

## Shared application flow

All enabled providers use the same path:

1. A login or signup button calls the shared Auth context.
2. The auth gateway calls Supabase `signInWithOAuth`.
3. `buildAuthCallbackUrl` creates one environment-aware application callback
   and carries a validated internal `returnTo`.
4. Supabase completes provider authorization and redirects to
   `/#/auth/callback`.
5. The callback exchanges the PKCE code once, restores the session, and
   navigates to the safe internal screen.

Provider cancellation and disabled/misconfigured-provider responses become
recoverable messages. The callback never starts a game, joins a room, submits a
score, or consumes a future ticket. A returning provider session reuses the
same Auth user/profile; the profile trigger creates a server-owned
`Player-xxxxx` nickname for a new non-anonymous Auth user and does not trust
provider metadata as a protected nickname.

## The two redirect layers

Provider consoles and Supabase URL configuration serve different redirects.

The OAuth provider callback, registered with Google, Kakao, or a custom
provider, is Supabase:

```text
https://nshpwruurbbxomduvinj.supabase.co/auth/v1/callback
```

The application callbacks, added to the Supabase Auth redirect allow list, are:

```text
http://127.0.0.1:3000/#/auth/callback
https://coffee-and.github.io/moment-play/#/auth/callback
```

Add the deployed production origin if it differs from GitHub Pages. A future
native build may set `VITE_AUTH_CALLBACK_URL=momentplay://auth/callback`, but
the deep-link handler itself belongs to the later Capacitor task.

## Google configuration

1. Create or select the Google Cloud OAuth web client and configure its consent
   screen.
2. Register the Supabase provider callback above as an authorized redirect URI.
3. Put the Google client ID and client secret in Supabase's Google provider
   configuration and enable it.
4. Add the application callback URLs to the Supabase redirect allow list.
5. Set `VITE_AUTH_GOOGLE_ENABLED=true` only for the deployed environment that
   has completed configuration.

References:

- [Supabase Google login](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google identity branding](https://developers.google.com/identity/branding-guidelines)

## Kakao configuration

1. Create or select the Kakao application, enable Kakao Login, and register the
   required web domains.
2. Register the Supabase provider callback above as the Kakao redirect URI.
3. Configure the Kakao REST API key as the client ID and the Kakao client secret
   in Supabase, then enable the provider.
4. Review the Kakao consent items. Email can be unavailable, so application
   identity and profile ownership must continue to use `auth.users.id`, not
   email.
5. Set `VITE_AUTH_KAKAO_ENABLED=true` only after configuration and a real
   callback test.

References:

- [Supabase Kakao login](https://supabase.com/docs/guides/auth/social-login/auth-kakao)
- [Kakao Login prerequisites](https://developers.kakao.com/docs/en/kakaologin/prerequisite)
- [Kakao Login design guide](https://developers.kakao.com/docs/en/kakaologin/design-guide)

## Naver compatibility gate

Naver authorization requires a server-held client secret and a CSRF `state`.
Supabase custom OAuth can provide the server-side OAuth/PKCE boundary, so the
client maps the app provider `naver` to `custom:naver`. However, Naver returns
profile fields inside a nested `response` object. The hosted Supabase custom
provider must be shown to map a stable subject and any optional email correctly
before this flag is enabled.

Required follow-up:

1. Configure a Naver custom provider in Supabase with the official authorize,
   token, and userinfo endpoints.
2. Prove the nested userinfo mapping in a non-production project or implement a
   reviewed server-side adapter if the hosted custom provider cannot map it.
3. Verify new login, repeat login, cancellation, missing email, denied consent,
   account collision, logout, and refresh.
4. Only then set `VITE_AUTH_NAVER_ENABLED=true`.

Until those checks pass, keep the Naver flag unset. Do not put the Naver client
secret in frontend code.

References:

- [Supabase custom OAuth providers](https://supabase.com/docs/guides/auth/custom-oauth-providers)
- [Naver Login API](https://developers.naver.com/docs/login/api/api.md)

## Account linking and collision policy

This task adds no client-side account merge or unlink behavior. Supabase owns
identities and sessions; application ownership always follows the resulting
`auth.users.id`. Before providers are enabled for release, verify Supabase's
automatic linking behavior for verified matching emails and the separate-user
behavior where email is missing or differs. Any later manual linking must
require a fresh authenticated session and explicit user confirmation.

Reference:

- [Supabase identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking)

## Release verification

Automated tests cover provider mapping and flags, duplicate-click prevention,
safe `returnTo` propagation, callback success/error normalization, session
application, and protected profile creation for provider users.

The following require real browser and provider accounts after dashboard
configuration:

- Google and Kakao consent, cancellation, callback, logout, and refresh
- repeat login and same-email collision behavior
- mobile-width provider button appearance
- popup/blocker and browser back-button recovery
- Naver's complete compatibility checklist above
