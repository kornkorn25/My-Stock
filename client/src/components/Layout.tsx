import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ThemeToggle } from "./ThemeToggle";
import { CurrencyToggle } from "./CurrencyToggle";
import { Logo } from "./Logo";

export function Layout() {
  const { user, logout } = useAuth();
  const loc = useLocation();

  const navLink = (to: string, label: string) => {
    const active = loc.pathname === to;
    return (
      <Link
        to={to}
        className={`rounded-md px-3 py-2 text-sm font-medium transition ${
          active
            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
            : "text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-2 text-lg font-bold tracking-tight dark:text-white"
            >
              <Logo size={24} />
              MyStock
            </Link>
            <nav className="flex gap-1">
              {navLink("/", "Dashboard")}
              {navLink("/history", "History")}
              {navLink("/profile", "Profile")}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/profile"
              className="hidden text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:inline"
            >
              {user?.displayName}
            </Link>
            <CurrencyToggle />
            <ThemeToggle />
            <button
              onClick={logout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-screen-2xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
