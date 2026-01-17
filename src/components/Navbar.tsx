import {Link, NavLink} from "react-router-dom";
import {useAuth} from "../auth/AuthProvider";
import logo from "../assets/logo.svg"

export default function Navbar() {
  const {state, logout} = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        {/* Left */}
        <Link to="/" className="text-lg font-semibold text-slate-900 flex">
          <img
            src={logo}
            alt="Athlo"
            className="h-8 w-8"
          />
          Athlo
        </Link>

        {/* Center */}
        <nav className="hidden gap-6 sm:flex">
          <NavLink
            to="/"
            end
            className={({isActive}) =>
              `text-sm font-medium ${
                isActive
                  ? "text-slate-900"
                  : "text-slate-500 hover:text-slate-900"
              }`
            }
          >
            Accueil
          </NavLink>

          <NavLink
            to="/journal"
            className={({isActive}) =>
              `text-sm font-medium ${
                isActive
                  ? "text-slate-900"
                  : "text-slate-500 hover:text-slate-900"
              }`
            }
          >
            Journal
          </NavLink>

          <NavLink
            to="/plan"
            className={({isActive}) =>
              `text-sm font-medium ${
                isActive
                  ? "text-slate-900"
                  : "text-slate-500 hover:text-slate-900"
              }`
            }
          >
            Plan
          </NavLink>

          <NavLink
            to="/goal"
            className={({isActive}) =>
              `text-sm font-medium ${
                isActive
                  ? "text-slate-900"
                  : "text-slate-500 hover:text-slate-900"
              }`
            }
          >
            Objectif
          </NavLink>
        </nav>

        {/* Right */}
        <div className="flex items-center gap-4">
          {state.status === "authenticated" && (
            <span className="hidden text-sm text-slate-500 sm:block">
              {state.username}
            </span>
          )}

          <button
            onClick={() => void logout()}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}
