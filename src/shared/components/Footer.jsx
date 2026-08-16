import { Brand } from "./Brand.jsx";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="wrap">
        <div className="footer">
          <div className="footer__identity">
            <Brand />
            <div className="foot-copy">© {currentYear} moment Play · 짧은 순간을 위한 미니게임.</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
