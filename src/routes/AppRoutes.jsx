import { Route, Routes } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { MiniGamesPage } from "../features/minigames/pages/MiniGamesPage.jsx";
import { MinigamePlayPage } from "../features/minigames/pages/MinigamePlayPage.jsx";
import { NotFoundPage } from "./NotFoundPage.jsx";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<MiniGamesPage />} />
        <Route path="/minigames/:gameId/room/:roomId" element={<MinigamePlayPage />} />
        <Route path="/minigames/:gameId" element={<MinigamePlayPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
