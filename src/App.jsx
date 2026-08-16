import { AppRoutes } from "./routes/AppRoutes.jsx";
import { AuthProvider } from "./shared/auth/AuthContext.jsx";
import { InviteNotificationProvider } from "./shared/invitations/InviteNotificationContext.jsx";
import { GameAudioProvider } from "./shared/audio/GameAudioContext.jsx";
import { ThemeProvider } from "./shared/theme/ThemeContext.jsx";
import { Button } from "./shared/components/Button.jsx";
import { ErrorBoundary } from "./shared/errors/ErrorBoundary.jsx";
import { ErrorFallback } from "./shared/errors/ErrorFallback.jsx";
import { reloadDocument } from "./shared/errors/errorRecovery.js";

function AppErrorFallback() {
  return (
    <ErrorFallback
      mode="viewport"
      title="잠시 문제가 발생했어요."
      description="앱을 다시 불러오면 계속 이용할 수 있어요."
      actions={(
        <Button type="button" onClick={reloadDocument}>
          앱 다시 불러오기
        </Button>
      )}
    />
  );
}

function App() {
  return (
    <ErrorBoundary fallback={<AppErrorFallback />}>
      <ThemeProvider>
        <GameAudioProvider>
          <AuthProvider>
            <InviteNotificationProvider>
              <AppRoutes />
            </InviteNotificationProvider>
          </AuthProvider>
        </GameAudioProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
