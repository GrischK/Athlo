import {useEffect, useState} from "react";
import type {StrengthPlan} from "@/types/workout.ts";
import {displaySportName} from "@/utils/planStrength-helper.ts";

export default function Home() {
  const [plans, setPlans] = useState<StrengthPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/plans");
        const data = await res.json();
        const today = new Date().toISOString().split("T")[0];

        const plansForToday = (data.plans ?? []).filter((plan: StrengthPlan) =>
          plan.plannedFor.startsWith(today)
        );

        setPlans(plansForToday);
      } catch (error) {
        console.error("Erreur récupération plans :", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

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
              {loading ? (
                <p className="mt-1 text-slate-400">Chargement...</p>
              ) : plans.length === 0 ? (
                <p className="mt-1 font-medium text-slate-900">
                  Aucune séance planifiée
                </p>
              ) : (
                plans.map((plan) => (
                  <p
                    key={plan.id}
                    className="mt-1 font-medium text-slate-900"
                  >
                    {plan.sport ? displaySportName(plan.sport) : "Séance"}
                  </p>
                ))
              )}
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
