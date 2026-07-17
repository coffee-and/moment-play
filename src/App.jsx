import { AppRoutes } from "./routes/AppRoutes.jsx";
import { AuthProvider } from "./shared/auth/AuthContext.jsx";
import { InviteNotificationProvider } from "./shared/invitations/InviteNotificationContext.jsx";
import { ThemeProvider } from "./shared/theme/ThemeContext.jsx";
import { GameAudioProvider } from "./shared/audio/GameAudioContext.jsx";
import { GameFeedbackProvider } from "./shared/feedback/GameFeedbackContext.jsx";

function App() {
  return (
    <ThemeProvider>
      <GameFeedbackProvider>
        <GameAudioProvider>
          <AuthProvider>
            <InviteNotificationProvider>
              <AppRoutes />
            </InviteNotificationProvider>
          </AuthProvider>
        </GameAudioProvider>
      </GameFeedbackProvider>
    </ThemeProvider>
  );
}

export default App;
