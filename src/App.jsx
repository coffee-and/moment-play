import { AppRoutes } from "./routes/AppRoutes.jsx";
import { AuthProvider } from "./shared/auth/AuthContext.jsx";
import { InviteNotificationProvider } from "./shared/invitations/InviteNotificationContext.jsx";
import { GameAudioProvider } from "./shared/audio/GameAudioContext.jsx";
import { GameFeedbackProvider } from "./shared/feedback/GameFeedbackContext.jsx";

function App() {
  return (
    <GameFeedbackProvider>
      <GameAudioProvider>
        <AuthProvider>
          <InviteNotificationProvider>
            <AppRoutes />
          </InviteNotificationProvider>
        </AuthProvider>
      </GameAudioProvider>
    </GameFeedbackProvider>
  );
}

export default App;
