import { useRef, useState } from "react";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { AUTH_MESSAGES } from "../../../shared/auth/authConstants.js";
import { getAuthProvider } from "../../../shared/auth/authProviders.js";
import { Button } from "../../../shared/components/Button.jsx";

function ProviderIcon({ provider }) {
  if (provider === "google") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 18 18">
        <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.797 2.716v2.258h2.909c1.703-1.568 2.684-3.879 2.684-6.614Z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.584-5.037-3.71H.956v2.332A9 9 0 0 0 9 18Z" />
        <path fill="#FBBC05" d="M3.963 10.71A5.41 5.41 0 0 1 3.681 9c0-.593.102-1.17.282-1.71V4.958H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.042l3.007-2.332Z" />
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.893 11.426 0 9 0A9 9 0 0 0 .956 4.958L3.963 7.29C4.672 5.164 6.656 3.58 9 3.58Z" />
      </svg>
    );
  }

  if (provider === "kakao") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 3C6.477 3 2 6.492 2 10.8c0 2.72 1.79 5.115 4.505 6.51l-1.146 3.496a.46.46 0 0 0 .704.51l4.02-2.666c.624.1 1.265.15 1.917.15 5.523 0 10-3.492 10-7.8S17.523 3 12 3Z" />
      </svg>
    );
  }

  return <span aria-hidden="true" className="auth-provider-button__naver-mark">N</span>;
}

export function SocialLoginOptions({ returnTo }) {
  const { providers = [], signInWithProvider } = useAuth();
  const inFlightRef = useRef(false);
  const [pendingProvider, setPendingProvider] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  if (providers.length === 0) return null;

  async function handleProviderSignIn(provider) {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setPendingProvider(provider);
    setErrorMessage(null);

    try {
      await signInWithProvider(provider, { returnTo });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : AUTH_MESSAGES.providerSignInFailed);
    } finally {
      inFlightRef.current = false;
      setPendingProvider(null);
    }
  }

  return (
    <section className="auth-provider-options" aria-label="소셜 로그인">
      <div className="auth-provider-options__buttons">
        {providers.map((provider) => {
          const definition = getAuthProvider(provider);
          if (!definition) return null;
          const pending = pendingProvider === provider;

          return (
            <Button
              key={provider}
              className={`auth-provider-button auth-provider-button--${provider}`}
              fullWidth
              disabled={Boolean(pendingProvider)}
              onClick={() => handleProviderSignIn(provider)}
              aria-busy={pending || undefined}
            >
              <span className="auth-provider-button__icon">
                <ProviderIcon provider={provider} />
              </span>
              <span>{pending ? `${definition.label}…` : definition.label}</span>
            </Button>
          );
        })}
      </div>
      {errorMessage ? <p className="auth-notice is-error" role="alert">{errorMessage}</p> : null}
      <div className="auth-divider" aria-hidden="true"><span>또는</span></div>
    </section>
  );
}
