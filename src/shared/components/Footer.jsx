import { Link } from "react-router-dom";
import { MINIGAMES_PATH } from "../../features/minigames/data/minigameCatalog.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { AUTH_LABELS, getAccountLabel, LOGIN_PATH } from "../auth/authConstants.js";
import { Brand } from "./Brand.jsx";

function FooterAccountItem() {
  const { status, user } = useAuth();

  if (status === "loading") return <span aria-label={AUTH_LABELS.loading} />;
  if (status === "authenticated") return <span>{getAccountLabel(user)}</span>;
  return <Link to={LOGIN_PATH}>{AUTH_LABELS.login}</Link>;
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="wrap">
        <div className="card footer">
          <Brand />
          <div className="foot-links">
            <Link to="/">홈</Link>
            <Link to={MINIGAMES_PATH}>게임</Link>
            <FooterAccountItem />
          </div>
          <div className="foot-copy">© {currentYear} moment Play · 짧은 순간을 위한 미니게임.</div>
        </div>
      </div>
    </footer>
  );
}
