# Social login foundation

## Scope and current deployment state

Moment Play supports Google through Supabase's built-in OAuth provider.

The hosted project `nshpwruurbbxomduvinj` was inspected on 2026-07-28. Its Site
URL and application redirect allow list match the GitHub Pages and local URLs
documented below. Google was configured and verified with a real account on
2026-08-03.

Anonymous Auth was found enabled during this audit and was disabled through the
Supabase Management API. A real anonymous sign-in request was rejected with
`anonymous_provider_disabled`, and `auth.users` remained empty.

Current verification state:

| Provider | Application code | Provider console | Supabase | Build flag | Real account QA |
| --- | --- | --- | --- | --- | --- |
| Google | Implemented | Configured | Enabled | Enabled locally and for Pages | Passed 2026-08-03 |

Provider buttons are hidden unless their corresponding build-time flag is
exactly `true`:

```text
VITE_AUTH_GOOGLE_ENABLED
```

These flags are public UI configuration, not authorization controls. Supabase
must also have the provider enabled. OAuth client secrets belong only in the
provider console and Supabase Dashboard; never put them in a `VITE_` variable.

The GitHub Pages workflow requires the repository Actions variable
`VITE_AUTH_GOOGLE_ENABLED=true`. The build fails when it is missing or has a
different value, so the authorized Google login cannot silently disappear from
the deployed application.

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

The OAuth provider callback, registered with Google, is Supabase:

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
2. Register these authorized JavaScript origins as applicable:
   `http://127.0.0.1:3000`, `https://coffee-and.github.io`, the future
   production origin. Origins contain no route or trailing path.
3. Register the Supabase provider callback above as an authorized redirect URI.
4. Put the Google client ID and client secret in Supabase's Google provider
   configuration and enable it.
5. Add the application callback URLs to the Supabase redirect allow list.
6. Set `VITE_AUTH_GOOGLE_ENABLED=true` only for the deployed environment that
   has completed configuration.

References:

- [Supabase Google login](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google identity branding](https://developers.google.com/identity/branding-guidelines)

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

Real Chrome integration checks were run locally with the Google flag set in the
temporary Vite process. At a 390px emulated viewport:

- The Google button and email form rendered
- the page had no horizontal overflow
- the signup link preserved a safe game `returnTo`, while an external
  `returnTo` fell back to `/`
- missing-code, cancellation, and offline callback failures left the loading
  state and showed a recoverable error
- the callback authorization code was removed from browser history before the
  offline exchange failed

These checks found and fixed a React Strict Mode callback defect that could
leave the development callback page permanently loading. The callback now
shares one completion promise across the Strict Mode effect restart, so code
exchange and session refresh still occur once.

### Provider verification status

Google real-account verification completed on 2026-08-03 using the existing
disposable QA user. Repeat login, session restoration after refresh, logout,
provider-screen cancellation recovery, safe return to the gated 2048 route,
browser Back recovery, and the explicit post-login Start gate all passed. The
callback left no authorization code or error parameters in browser history,
and no uncaught browser errors were observed.

Post-login database verification remained stable at one non-anonymous Auth
user, one Google identity, and one matching profile. No anonymous user, orphan
profile, duplicate profile, or provider-metadata nickname overwrite was
observed.

The authorized production state is Google enabled. Repository tests and builds
continue to protect the shared callback, safe-return, session, and
explicit-start behavior.
