import { useAuth } from "../auth/AuthProvider";

export default function Home() {
  const { state, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Accueil
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Bienvenue sur Athlo
            </p>
          </div>

          <button
            onClick={() => void logout()}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            Se déconnecter
          </button>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-700">
            Connecté en tant que{" "}
            <span className="font-medium text-slate-900">
              {state.status === "authenticated" ? state.username : "—"}
            </span>
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Séance du jour</p>
              <p className="mt-1 font-medium text-slate-900">
                Aucune séance planifiée
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Dernière activité</p>
              <p className="mt-1 font-medium text-slate-900">
                —
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
