import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useEffect, useState } from "react";
import logo from "../assets/logo.svg";

const navLinkBase =
  "block rounded-lg px-3 py-2 text-sm font-medium transition";

function navClass({ isActive }:{ isActive:boolean }) {
  return `${navLinkBase} ${
    isActive
      ? "bg-slate-100 text-slate-900"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
  }`;
}

export default function Navbar() {
  const { state, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Prevent background scroll when menu is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Left */}
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-semibold text-slate-900"
        >
          <img src={logo} alt="Athlo" className="h-8 w-8" />
          <span>Athlo</span>
        </Link>

        {/* Center (desktop) */}
        <nav className="hidden items-center gap-2 sm:flex">
          <NavLink to="/" end className={navClass}>
            Accueil
          </NavLink>
          <NavLink to="/journal" className={navClass}>
            Journal
          </NavLink>
          <NavLink to="/plan" className={navClass}>
            Plan
          </NavLink>
          <NavLink to="/goal" className={navClass}>
            Objectif
          </NavLink>
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2 sm:gap-4">
          {state.status === "authenticated" && (
            <span className="hidden text-sm text-slate-500 sm:block">
              {state.username}
            </span>
          )}

          {/* Desktop logout */}
          <button
            onClick={() => void logout()}
            className="hidden rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 sm:inline-flex"
          >
            Déconnexion
          </button>

          {/* Mobile menu button */}
          <button
            type="button"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 sm:hidden"
          >
            {open ? (
              // X icon
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              // Hamburger icon
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <>
          {/* Overlay */}
          <button
            aria-label="Fermer"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-black/30 sm:hidden"
          />

          {/* Panel */}
          <div className="fixed left-0 right-0 top-16 z-50 border-b border-slate-200 bg-white sm:hidden">
            <div className="mx-auto max-w-5xl px-4 py-3">
              <div className="space-y-1">
                <NavLink to="/" end className={navClass}>
                  Accueil
                </NavLink>
                <NavLink to="/journal" className={navClass}>
                  Journal
                </NavLink>
                <NavLink to="/plan" className={navClass}>
                  Plan
                </NavLink>
                <NavLink to="/goal" className={navClass}>
                  Objectif
                </NavLink>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                {state.status === "authenticated" ? (
                  <span className="text-sm text-slate-600">
                    Connecté: <span className="font-medium">{state.username}</span>
                  </span>
                ) : (
                  <span className="text-sm text-slate-600">Non connecté</span>
                )}

                <button
                  onClick={() => void logout()}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
