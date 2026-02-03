import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { RoutineRule, RoutineRuleUpsert } from "../types/routine";
import { uuid } from "../utils/workoutForm";
import { getErrorMessage, isTimeLocal } from "@/utils/helpers";

type RoutineSport = "laser_run" | "swim";

const weekdayLabels: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, string> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
  7: "Dimanche",
};

function defaultTimeForSport(sport: RoutineSport): string {
  return sport === "laser_run" ? "19:00" : "12:00";
}

export default function Routines() {
  const [routines, setRoutines] = useState<RoutineRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [sport, setSport] = useState<RoutineSport>("laser_run");
  const [weekday, setWeekday] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [timeLocal, setTimeLocal] = useState(defaultTimeForSport("laser_run"));
  const [durationMin, setDurationMin] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);

  const canSubmit = useMemo(() => {
    if (sport !== "laser_run" && sport !== "swim") return false;
    if (!(weekday >= 1 && weekday <= 7)) return false;
    if (!isTimeLocal(timeLocal)) return false;
    if (durationMin !== "" && Number(durationMin) <= 0) return false;
    return true;
  }, [sport, weekday, timeLocal, durationMin]);

  const resetForm = () => {
    setEditingId(null);
    setSport("laser_run");
    setWeekday(2);
    setTimeLocal(defaultTimeForSport("laser_run"));
    setDurationMin("");
    setNotes("");
    setIsEnabled(true);
  };

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const list = await api.routinesList();
      // tri stable: weekday puis time
      const sorted = [...list].sort((a, b) => (a.weekday - b.weekday) || a.timeLocal.localeCompare(b.timeLocal));
      setRoutines(sorted);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Erreur lors du chargement des routines"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const loadRoutineIntoForm = (r: RoutineRule) => {
    setEditingId(r.id);
    setSport(r.sport);
    setWeekday(r.weekday);
    setTimeLocal(r.timeLocal);
    setDurationMin(r.durationMin ?? "");
    setNotes(r.notes ?? "");
    setIsEnabled(r.isEnabled);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    if (!canSubmit) return;

    setErr("");

    const upsert: RoutineRuleUpsert = {
      id: editingId ?? uuid(),
      sport,
      weekday,
      timeLocal,
      ...(durationMin === "" ? {} : { durationMin: Number(durationMin) }),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      isEnabled,
    };

    try {
      if (editingId) {
        await api.routinesUpdate(upsert);
      }
      else {
        await api.routinesCreate(upsert);
      }
      resetForm();
      await load();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Erreur lors de l'enregistrement de la routine"));
    }
  };

  const toggleEnabled = async (r: RoutineRule) => {
    setErr("");
    try {
      await api.routinesUpdate({ id: r.id, isEnabled: !r.isEnabled });
      await load();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Erreur lors de la mise à jour de la routine"));
    }
  };

  const materialize = async () => {
    setErr("");
    try {
      const r = await api.routinesMaterializeWeek();
      // feedback léger
      await load();
      setErr(`Semaine générée. ${r.createdCount} plan(s) ajouté(s).`);
      // optionnel: effacer le message après quelques secondes
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Erreur lors de la génération de la semaine"));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Routines</h1>
          <p className="mt-1 text-sm text-slate-500">
            Définis tes séances récurrentes. Elles seront transformées en plans chaque début de semaine.
          </p>
        </div>

        {err ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {err}
          </div>
        ) : null}

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-slate-900">
              {editingId ? "Modifier une routine" : "Nouvelle routine"}
            </div>

            <div className="flex gap-2">
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Annuler
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => void materialize()}
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Générer la semaine
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Sport</label>
              <select
                value={sport}
                onChange={(e) => {
                  const s = e.target.value as RoutineSport;
                  setSport(s);
                  if (!isTimeLocal(timeLocal)) setTimeLocal(defaultTimeForSport(s));
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="laser_run">Laser-run</option>
                <option value="swim">Piscine</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Jour</label>
              <select
                value={weekday}
                onChange={(e) => setWeekday(Number(e.target.value) as 1|2|3|4|5|6|7)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {Object.entries(weekdayLabels).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Heure</label>
              <input
                type="time"
                value={timeLocal}
                onChange={(e) => setTimeLocal(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Durée (min)</label>
              <input
                type="number"
                min={1}
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-end">
              <label
                className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                />
                Active
              </label>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optionnel"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!canSubmit}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {editingId ? "Sauvegarder" : "Créer"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="text-sm font-medium text-slate-900">Mes routines</div>
            <div className="text-xs text-slate-500">{loading ? "Chargement." : `${routines.length} routine(s)`}</div>
          </div>

          <div className="divide-y divide-slate-100">
            {routines.map((r) => (
              <div key={r.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">
                      {r.sport === "laser_run" ? "Laser-run" : "Piscine"} · {weekdayLabels[r.weekday]} · {r.timeLocal}
                      {!r.isEnabled ? " · Désactivée" : ""}
                    </div>

                    <div className="mt-1 text-sm text-slate-600">
                      {r.durationMin ? `${r.durationMin} min` : "Durée libre"}
                      {r.notes ? ` · ${r.notes}` : ""}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => loadRoutineIntoForm(r)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Modifier
                    </button>

                    <button
                      type="button"
                      onClick={() => void toggleEnabled(r)}
                      className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      {r.isEnabled ? "Désactiver" : "Activer"}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {!loading && routines.length === 0 ? (
              <div className="px-6 py-10 text-sm text-slate-500">Aucune routine pour le moment.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
