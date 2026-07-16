import { AppRoutes } from "./routes/AppRoutes.jsx";
import { AuthProvider } from "./shared/auth/AuthContext.jsx";
import { ThemeProvider } from "./shared/theme/ThemeContext.jsx";
import "./features/minigames/games/omok/omok-stones.css";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
