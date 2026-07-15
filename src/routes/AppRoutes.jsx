import { Route, Routes } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { CompleteSignupPage } from "../features/auth/pages/CompleteSignupPage.jsx";
import { LoginPage } from "../features/auth/pages/LoginPage.jsx";
import { OnboardingPage } from "../features/auth/pages/OnboardingPage.jsx";
import { SignupPage } from "../features/auth/pages/SignupPage.jsx";
import { FriendsPage } from "../features/friends/FriendsPage.jsx";
import { FRIENDS_PATH } from "../features/friends/friendsConstants.js";
import { COMPLETE_SIGNUP_PATH, LOGIN_PATH, SIGNUP_PATH } from "../shared/auth/authConstants.js";
import { MiniGamesPage } from "../features/minigames/pages/MiniGamesPage.jsx";
import { MinigamePlayPage } from "../features/minigames/pages/MinigamePlayPage.jsx";
import { RankingPage } from "../features/ranking/RankingPage.jsx";
import { RANKING_PATH } from "../features/ranking/rankingConstants.js";
import { NotFoundPage } from "./NotFoundPage.jsx";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<MiniGamesPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path={LOGIN_PATH} element={<LoginPage />} />
        <Route path={SIGNUP_PATH} element={<SignupPage />} />
        <Route path={COMPLETE_SIGNUP_PATH} element={<CompleteSignupPage />} />
        <Route path={RANKING_PATH} element={<RankingPage />} />
        <Route path={FRIENDS_PATH} element={<FriendsPage />} />
        <Route path="/minigames/:gameId/room/:roomId" element={<MinigamePlayPage />} />
        <Route path="/minigames/:gameId" element={<MinigamePlayPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
