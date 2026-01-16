import {useEffect, useMemo, useState} from "react";
import {api} from "../lib/api";
import type {Workout, WorkoutRecord} from "../types/workout";
import {localInputToIso, nowLocalInputValue, type SetGroup, uuid} from "../utils/workoutForm.ts";


type Sport = Workout["sport"];
const INITIAL_GROUPS: SetGroup[] = [
  {count: "", reps: "", weightKg: "", durationSec: ""},
];

export default function Journal() {
  const [records, setRecords] = useState<WorkoutRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [sport, setSport] = useState<Sport>("run");
  const [startedAtLocal, setStartedAtLocal] = useState(nowLocalInputValue());
  const [durationMin, setDurationMin] = useState<number>();
  const [rpe, setRpe] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  // Run / Laser-run
  const [distanceKm, setDistanceKm] = useState<number>();
  const [paceSecPerKm, setPaceSecPerKm] = useState<number | "">();

  // Swim
  const [distanceM, setDistanceM] = useState<number>();
  const [poolLengthM, setPoolLengthM] = useState<25 | 50 | "">("");

  // Strength (simple. 1 exercice, plusieurs sets)
  const [exName, setExName] = useState("");
  const [groups, setGroups] = useState<SetGroup[]>(INITIAL_GROUPS);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.workoutsList(30);
      setRecords(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const startedAtIso = useMemo(
    () => localInputToIso(startedAtLocal),
    [startedAtLocal]
  );

  const canSubmit = useMemo(() => {
    if (!durationMin || durationMin <= 0) return false;

    if (sport === "run" || sport === "laser_run") {
      if (!distanceKm || distanceKm <= 0) return false;
      if (paceSecPerKm !== "" && Number(paceSecPerKm) <= 0) return false;
      return true;
    }

    if (sport === "swim") {
      if (!distanceM || distanceM <= 0) return false;
      if (poolLengthM !== "" && poolLengthM !== 25 && poolLengthM !== 50) return false;
      return true;
    }

    if (sport === "strength") {
      if (!groups.length) return false;

      for (const g of groups) {
        if (!g.count || g.count < 1) return false;

        const hasReps = g.reps !== "" && Number(g.reps) > 0;
        const hasDur = g.durationSec !== "" && Number(g.durationSec) > 0;
        if (!hasReps && !hasDur) return false;

        if (g.weightKg !== "" && Number(g.weightKg) < 0) return false;
      }
      return true;
    }

    return false;
  }, [durationMin, sport, distanceKm, paceSecPerKm, distanceM, poolLengthM, exName, groups]);

  const resetForm = () => {
    setSport("run");
    setStartedAtLocal(nowLocalInputValue());
    setDurationMin(undefined);
    setRpe("");
    setNotes("");

    setDistanceKm(undefined);
    setPaceSecPerKm("");

    setDistanceM(undefined);
    setPoolLengthM("");

    setExName("");
    setGroups(INITIAL_GROUPS);
  };

  const submit = async () => {
    if (!canSubmit) return;

    const base: Omit<Workout, "details"> = {
      id: uuid(),
      startedAt: startedAtIso,
      sport,
      durationMin: Number(durationMin),
      ...(rpe === "" ? {} : {rpe: Number(rpe)}),
      ...(notes.trim() ? {notes: notes.trim()} : {}),
    };

    let workout: Workout;

    if (sport === "run" || sport === "laser_run") {
      workout = {
        ...(base as any),
        sport,
        details: {
          distanceKm: Number(distanceKm),
          ...(paceSecPerKm === "" ? {} : {paceSecPerKm: Number(paceSecPerKm)}),
        },
      };
    } else if (sport === "swim") {
      workout = {
        ...(base as any),
        sport: "swim",
        details: {
          distanceM: Number(distanceM),
          ...(poolLengthM === "" ? {} : {poolLengthM}),
        },
      };
    } else {
      const expandedSets = groups.flatMap((g) => {
        const n = Math.max(1, Math.floor(Number(g.count) || 1));
        const set = {
          ...(g.reps === "" ? {} : {reps: Number(g.reps)}),
          ...(g.weightKg === "" ? {} : {weightKg: Number(g.weightKg)}),
          ...(g.durationSec === "" ? {} : {durationSec: Number(g.durationSec)}),
        };
        return Array.from({length: n}, () => set);
      });

      workout = {
        ...(base as any),
        sport: "strength",
        details: {
          exercises: [
            {
              name: exName.trim(),
              sets: expandedSets,
            },
          ],
        },
      };
    }

    await api.workoutsCreate(workout);

    resetForm();
    await load();
  };

  const addGroup = () =>
    setGroups((prev) => [...prev, {count: 3, reps: "", weightKg: "", durationSec: ""}]);

  const removeGroup = (idx: number) =>
    setGroups((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Journal</h1>
          <p className="mt-1 text-sm text-slate-500">Ajoute et consulte tes séances</p>
        </div>

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 text-sm font-medium text-slate-900">Nouvelle séance</div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Sport</label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value as Sport)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="run">Run</option>
                <option value="laser_run">Laser-run</option>
                <option value="swim">Swim</option>
                <option value="strength">Strength</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date / heure</label>
              <input
                type="datetime-local"
                value={startedAtLocal}
                onChange={(e) => setStartedAtLocal(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Durée (min)</label>
              <input
                type="number"
                min={1}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">RPE (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={rpe}
                onChange={(e) => setRpe(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="Optionnel"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="Ex: bonnes sensations, vent, etc."
            />
          </div>

          {(sport === "run" || sport === "laser_run") && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Distance (km)</label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Allure (sec/km)</label>
                <input
                  type="number"
                  min={1}
                  value={paceSecPerKm}
                  onChange={(e) => setPaceSecPerKm(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="Optionnel"
                />
              </div>
            </div>
          )}

          {sport === "swim" && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Distance (m)</label>
                <input
                  type="number"
                  min={1}
                  value={distanceM}
                  onChange={(e) => setDistanceM(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bassin</label>
                <select
                  value={poolLengthM}
                  onChange={(e) => setPoolLengthM(e.target.value === "" ? "" : (Number(e.target.value) as 25 | 50))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">Optionnel</option>
                  <option value="25">25 m</option>
                  <option value="50">50 m</option>
                </select>
              </div>
            </div>
          )}

          {sport === "strength" && (
            <div className="mt-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Exercice</label>
                <input
                  placeholder={"Ex: pompes"}
                  value={exName}
                  onChange={(e) => setExName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="text-sm font-medium text-slate-900 mb-2">Groupes</div>
              <div className="space-y-3">
                {groups.map((g, idx) => (
                  <div key={idx} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                    <input
                      type="number"
                      min={1}
                      value={g.count}
                      onChange={(e) => {
                        const value = e.target.value;
                        setGroups((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? {...x, count: value === "" ? "" : Number(value)}
                              : x
                          )
                        );
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      placeholder="Séries"
                    />

                    <input
                      type="number"
                      min={1}
                      value={g.reps}
                      onChange={(e) => {
                        const v = e.target.value === "" ? "" : Number(e.target.value);
                        setGroups((prev) => prev.map((x, i) => (i === idx ? {...x, reps: v} : x)));
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      placeholder="Reps"
                    />

                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={g.weightKg}
                      onChange={(e) => {
                        const v = e.target.value === "" ? "" : Number(e.target.value);
                        setGroups((prev) => prev.map((x, i) => (i === idx ? {...x, weightKg: v} : x)));
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      placeholder="Kg (opt.)"
                    />

                    <input
                      type="number"
                      min={1}
                      value={g.durationSec}
                      onChange={(e) => {
                        const v = e.target.value === "" ? "" : Number(e.target.value);
                        setGroups((prev) => prev.map((x, i) => (i === idx ? {...x, durationSec: v} : x)));
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      placeholder="Sec (opt.)"
                    />

                    <button
                      type="button"
                      onClick={() => removeGroup(idx)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addGroup}
                className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Ajouter un groupe
              </button>

            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={() => void submit()}
              disabled={!canSubmit}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Enregistrer
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="text-sm font-medium text-slate-900">Historique</div>
            <div className="text-xs text-slate-500">{loading ? "Chargement." : `${records.length} séance(s)`}</div>
          </div>

          <div className="divide-y divide-slate-100">
            {records.map((r) => {
              const w = r.workout;
              return (
                <div key={w.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-slate-900">{w.sport}</div>
                      {r.status !== "done" ?
                        (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                            {r.status === "planned" ? "Planifié" : "Annulé"}
                          </span>
                        ) : null
                      }
                    </div>
                    <div className="text-sm text-slate-500">{new Date(w.startedAt).toLocaleString()}</div>
                  </div>
                  <div className="mt-1 text-sm text-slate-700">
                    {w.durationMin} min
                    {"distanceKm" in w.details ? ` · ${w.details.distanceKm} km` : null}
                    {"distanceM" in w.details ? ` · ${w.details.distanceM} m` : null}
                  </div>

                  {w.notes ? <div className="mt-1 text-sm text-slate-500">{w.notes}</div> : null}
                </div>
              );
            })}

            {!loading && records.length === 0 ? (
              <div className="px-6 py-10 text-sm text-slate-500">Aucune séance pour le moment.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

