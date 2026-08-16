import { Suspense } from "react";
import { Outlet, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { FRIENDS_PATH } from "../features/friends/friendsConstants.js";
import { SETTINGS_PATH } from "../features/settings/settingsConstants.js";
import { AUTH_CALLBACK_PATH, LOGIN_PATH, SIGNUP_PATH } from "../shared/auth/authConstants.js";
import { HomePage } from "../features/minigames/pages/HomePage.jsx";
import { MINIGAMES_PATH } from "../features/minigames/data/minigameCatalog.js";
import { RANKING_PATH } from "../features/ranking/rankingConstants.js";
import { LoadingIndicator } from "../shared/components/LoadingIndicator.jsx";
import { StatusPanel } from "../shared/components/StatusPanel.jsx";
import { lazyNamedComponent } from "../shared/components/lazyNamedComponent.js";

const AuthCallbackPage = lazyNamedComponent(
  () => import("../features/auth/pages/AuthCallbackPage.jsx"),
  "AuthCallbackPage",
);
const LoginPage = lazyNamedComponent(
  () => import("../features/auth/pages/LoginPage.jsx"),
  "LoginPage",
);
const OnboardingPage = lazyNamedComponent(
  () => import("../features/auth/pages/OnboardingPage.jsx"),
  "OnboardingPage",
);
const SignupPage = lazyNamedComponent(
  () => import("../features/auth/pages/SignupPage.jsx"),
  "SignupPage",
);
const FriendsPage = lazyNamedComponent(
  () => import("../features/friends/FriendsPage.jsx"),
  "FriendsPage",
);
const SettingsPage = lazyNamedComponent(
  () => import("../features/settings/SettingsPage.jsx"),
  "SettingsPage",
);
const MiniGamesPage = lazyNamedComponent(
  () => import("../features/minigames/pages/MiniGamesPage.jsx"),
  "MiniGamesPage",
);
const MinigamePlayPage = lazyNamedComponent(
  () => import("../features/minigames/pages/MinigamePlayPage.jsx"),
  "MinigamePlayPage",
);
const RankingPage = lazyNamedComponent(
  () => import("../features/ranking/RankingPage.jsx"),
  "RankingPage",
);
const NotFoundPage = lazyNamedComponent(
  () => import("./NotFoundPage.jsx"),
  "NotFoundPage",
);

function RouteLoadingBoundary() {
  return (
    <Suspense
      fallback={(
        <div className="wrap page-content">
          <StatusPanel
            title="화면을 불러오고 있어요."
            action={<LoadingIndicator label="화면 불러오는 중" />}
          />
        </div>
      )}
    >
      <Outlet />
    </Suspense>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route element={<RouteLoadingBoundary />}>
          <Route path="/" element={<HomePage />} />
          <Route path={MINIGAMES_PATH} element={<MiniGamesPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path={LOGIN_PATH} element={<LoginPage />} />
          <Route path={SIGNUP_PATH} element={<SignupPage />} />
          <Route path={AUTH_CALLBACK_PATH} element={<AuthCallbackPage />} />
          <Route path={RANKING_PATH} element={<RankingPage />} />
          <Route path={FRIENDS_PATH} element={<FriendsPage />} />
          <Route path={SETTINGS_PATH} element={<SettingsPage />} />
          <Route path="/minigames/:gameId/room/:roomId" element={<MinigamePlayPage />} />
          <Route path="/minigames/:gameId" element={<MinigamePlayPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
