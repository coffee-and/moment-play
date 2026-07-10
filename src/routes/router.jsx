import { HashRouter as Router } from "react-router-dom";

// Centralized so the router can be swapped for BrowserRouter once
// server-side SPA rewrite rules are confirmed for the deployment target.
export { Router };
