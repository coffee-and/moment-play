import { AppRoutes } from "./routes/AppRoutes.jsx";
import { AuthProvider } from "./shared/auth/AuthContext.jsx";
import { ThemeProvider } from "./shared/theme/ThemeContext.jsx";

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
