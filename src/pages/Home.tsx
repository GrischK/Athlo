export default function Home() {
  return (
    <div className="mx-auto max-w-3xl bg-slate-50 px-6 py-8">
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
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
