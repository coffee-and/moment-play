import { Route, Routes } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { CompleteSignupPage } from "../features/auth/pages/CompleteSignupPage.jsx";
import { LoginPage } from "../features/auth/pages/LoginPage.jsx";
import { OnboardingPage } from "../features/auth/pages/OnboardingPage.jsx";
import { SignupPage } from "../features/auth/pages/SignupPage.jsx";
import { COMPLETE_SIGNUP_PATH } from "../shared/auth/authConstants.js";
import { MiniGamesPage } from "../features/minigames/pages/MiniGamesPage.jsx";
import { MinigamePlayPage } from "../features/minigames/pages/MinigamePlayPage.jsx";
import { NotFoundPage } from "./NotFoundPage.jsx";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<MiniGamesPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path={COMPLETE_SIGNUP_PATH} element={<CompleteSignupPage />} />
        <Route path="/minigames/:gameId/room/:roomId" element={<MinigamePlayPage />} />
        <Route path="/minigames/:gameId" element={<MinigamePlayPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
