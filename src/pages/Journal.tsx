import {useEffect, useState} from "react";
import {api} from "../lib/api";
import type {Workout} from "../types/workout";

function uuid() {
  return crypto.randomUUID();
}

export default function Journal() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");

  console.log(workouts);
  const load = async () => {
    setLoading(true);
    try {
      const res = await api.workoutsList(30);
      setWorkouts(res.workouts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const addQuickRun = async () => {
    const startedAt = new Date().toISOString();
    const w: Workout = {
      id: uuid(),
      startedAt,
      sport: "run",
      durationMin: 45,
      rpe: 6,
      notes: notes || undefined,
      details: {distanceKm: 8, paceSecPerKm: 330},
    };
    await api.workoutsCreate(w);
    setNotes("");
    await load();
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Journal</h1>
            <p className="mt-1 text-sm text-slate-500">Ajoute et consulte tes séances</p>
          </div>

          <button
            onClick={() => void addQuickRun()}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            Ajouter un run test
          </button>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition"
            placeholder="Ex: bonnes sensations, vent, etc."
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="text-sm font-medium text-slate-900">Historique</div>
            <div className="text-xs text-slate-500">{loading ? "Chargement." : `${workouts.length} séance(s)`}</div>
          </div>

          <div className="divide-y divide-slate-100">
            {workouts.map((w) => (
              <div key={w.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-900">{w.sport}</div>
                  <div className="text-sm text-slate-500">{new Date(w.startedAt).toLocaleString()}</div>
                </div>
                <div className="mt-1 text-sm text-slate-700">
                  {w.durationMin} min
                  {"distanceKm" in w.details ? ` · ${w.details.distanceKm} km` : null}
                  {"distanceM" in w.details ? ` · ${w.details.distanceM} m` : null}
                </div>
                {w.notes ? <div className="mt-1 text-sm text-slate-500">{w.notes}</div> : null}
              </div>
            ))}

            {!loading && workouts.length === 0 ? (
              <div className="px-6 py-10 text-sm text-slate-500">Aucune séance pour le moment.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
