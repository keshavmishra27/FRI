import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const { pathname } = useLocation();

  const linkClass = (path: string) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      pathname === path
        ? "bg-accent-600/20 text-accent-300"
        : "text-slate-400 hover:text-white hover:bg-white/5"
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-glass-border bg-surface-900/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-purple-500 text-white font-bold text-sm shadow-lg shadow-accent-500/20 group-hover:shadow-accent-500/40 transition-shadow">
            SC
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
            Smart<span className="text-accent-400">Class</span>
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1">
          <Link to="/" className={linkClass("/")}>
            Find Rooms
          </Link>
          <Link to="/admin" className={linkClass("/admin")}>
            Admin
          </Link>
        </div>
      </div>
    </nav>
  );
}
