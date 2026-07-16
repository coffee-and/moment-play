import { AppRoutes } from "./routes/AppRoutes.jsx";
import { AuthProvider } from "./shared/auth/AuthContext.jsx";
import { InviteNotificationProvider } from "./shared/invitations/InviteNotificationContext.jsx";
import { ThemeProvider } from "./shared/theme/ThemeContext.jsx";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <InviteNotificationProvider>
          <AppRoutes />
        </InviteNotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
