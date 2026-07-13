import { AppRoutes } from "./routes/AppRoutes.jsx";
import { ThemeProvider } from "./shared/theme/ThemeContext.jsx";

function App() {
  return (
    <ThemeProvider>
      <AppRoutes />
    </ThemeProvider>
  );
}

export default App;
