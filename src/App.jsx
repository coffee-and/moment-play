import { AppRoutes } from "./routes/AppRoutes.jsx";
import { AuthProvider } from "./shared/auth/AuthContext.jsx";
import { InviteNotificationProvider } from "./shared/invitations/InviteNotificationContext.jsx";
import { GameAudioProvider } from "./shared/audio/GameAudioContext.jsx";
import { ThemeProvider } from "./shared/theme/ThemeContext.jsx";

function App() {
  return (
    <ThemeProvider>
      <GameAudioProvider>
        <AuthProvider>
          <InviteNotificationProvider>
            <AppRoutes />
          </InviteNotificationProvider>
        </AuthProvider>
      </GameAudioProvider>
    </ThemeProvider>
  );
}

export default App;
