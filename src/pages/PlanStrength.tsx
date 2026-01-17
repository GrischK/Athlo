import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type {ExerciseDraft, StrengthPlan} from "../types/workout";
import { localInputToIso, nowLocalInputValue, type SetGroup, uuid } from "../utils/workoutForm";
import {compressSetsToGroups, formatSetSummary, isoToLocalInputValue, sortPlans} from "@/utils/planStrengthForm.ts";
import type {AiStrengthPlanSuggestion} from "@/types/ai.ts";


const newExerciseDraft = (): ExerciseDraft => ({
  id: uuid(),
  name: "",
  groups: [{ count: "", reps: "", weightKg: "", durationSec: "" }],
});

export default function PlanStrength() {
  const [plans, setPlans] = useState<StrengthPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  // Edition
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [plannedForLocal, setPlannedForLocal] = useState(nowLocalInputValue());
  const [durationMin, setDurationMin] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<ExerciseDraft[]>([newExerciseDraft()]);

  const plannedForIso = useMemo(() => localInputToIso(plannedForLocal), [plannedForLocal]);

  const [suggestion, setSuggestion] = useState<AiStrengthPlanSuggestion | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [aiInput, setAiInput] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.plansList(50);
      setPlans(sortPlans(res));
    } catch (e: any) {
      setErr(e?.message || "Erreur lors du chargement des plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const addExercise = () => setExercises((prev) => [...prev, newExerciseDraft()]);

  const removeExercise = (exId: string) => setExercises((prev) => prev.filter((e) => e.id !== exId));

  const updateExerciseName = (exId: string, name: string) =>
    setExercises((prev) => prev.map((e) => (e.id === exId ? { ...e, name } : e)));

  const addGroup = (exId: string) =>
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exId
          ? { ...e, groups: [...e.groups, { count: 3, reps: "", weightKg: "", durationSec: "" }] }
          : e
      )
    );

  const removeGroup = (exId: string, idx: number) =>
    setExercises((prev) =>
      prev.map((e) => (e.id === exId ? { ...e, groups: e.groups.filter((_, i) => i !== idx) } : e))
    );

  const updateGroup = (exId: string, idx: number, patch: Partial<SetGroup>) =>
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exId
          ? { ...e, groups: e.groups.map((g, i) => (i === idx ? { ...g, ...patch } : g)) }
          : e
      )
    );

  const canSubmit = useMemo(() => {
    if (durationMin !== "" && Number(durationMin) <= 0) return false;
      if (!exercises.length) return false;

    for (const ex of exercises) {
      if (!ex.name.trim()) return false;
      if (!ex.groups.length) return false;

      for (const g of ex.groups) {
        if (g.count === "" || Number(g.count) < 1) return false;

        const hasReps = g.reps !== "" && Number(g.reps) > 0;
        const hasDur = g.durationSec !== "" && Number(g.durationSec) > 0;
        if (!hasReps && !hasDur) return false;

        if (g.weightKg !== "" && Number(g.weightKg) < 0) return false;
      }
    }

    return true;
  }, [durationMin, exercises]);

  const resetForm = () => {
    setEditingId(null);
    setPlannedForLocal(nowLocalInputValue());
    setDurationMin("");
    setNotes("");
    setExercises([newExerciseDraft()]);
  };

  const loadPlanIntoForm = (p: StrengthPlan) => {
    setEditingId(p.id);
    setPlannedForLocal(isoToLocalInputValue(p.plannedFor));
    setDurationMin(p.durationMin ?? "");
    setNotes(p.notes ?? "");
    setExercises(
      p.exercises.map((ex) => ({
        id: uuid(),
        name: ex.name,
        groups: compressSetsToGroups(ex.sets),
      }))
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildPlanFromForm = (id: string): StrengthPlan => {
    const expandedExercises = exercises.map((ex) => {
      const sets = ex.groups.flatMap((g) => {
        const n = Math.max(1, Math.floor(Number(g.count) || 1));
        const set = {
          ...(g.reps === "" ? {} : { reps: Number(g.reps) }),
          ...(g.weightKg === "" ? {} : { weightKg: Number(g.weightKg) }),
          ...(g.durationSec === "" ? {} : { durationSec: Number(g.durationSec) }),
        };
        return Array.from({ length: n }, () => set);
      });

      return { name: ex.name.trim(), sets };
    });

    return {
      id,
      plannedFor: plannedForIso,
      ...(durationMin === "" ? {} : { durationMin: Number(durationMin) }),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      exercises: expandedExercises,
    };
  };

  const submit = async () => {
    if (!canSubmit) return;

    setErr("");

    try {
      if (editingId) {
        const plan = buildPlanFromForm(editingId);
        await api.plansUpdate(plan);
      } else {
        const plan = buildPlanFromForm(uuid());
        await api.plansCreate(plan);
      }

      resetForm();
      await load();
    } catch (e: any) {
      setErr(e?.message || "Erreur lors de l'enregistrement du plan");
    }
  };

  const completePlan = async (id: string) => {
    setErr("");
    try {
      await api.plansAction(id, "complete");
      if (editingId === id) resetForm();
      await load();
    } catch (e: any) {
      setErr(e?.message || "Erreur lors de la validation du plan");
    }
  };

  const deletePlan = async (id: string) => {
    setErr("");
    try {
      await api.plansAction(id, "delete");
      if (editingId === id) resetForm();
      await load();
    } catch (e: any) {
      setErr(e?.message || "Erreur lors de la suppression du plan");
    }
  };

  const suggest = async (message?: string) => {
    setSuggestLoading(true);
    setErr("");
    try {
      const s = await api.aiStrengthSuggest(7, message);
      setSuggestion(s);
      setAiInput("");
    } catch (e: any) {
      setErr(e?.message || "Erreur suggestion");
    } finally {
      setSuggestLoading(false);
    }
  };

  const applySuggestion = () => {
    if (!suggestion) return;

    setEditingId(null);
    setDurationMin(suggestion.plan.durationMin ?? "");
    setNotes(suggestion.plan.notes ?? "");

    setExercises(
      suggestion.plan.exercises.map((ex) => ({
        id: uuid(),
        name: ex.name,
        groups: ex.groups.map((g) => ({
          count: g.count,
          reps: g.reps ?? "",
          weightKg: g.weightKg ?? "",
          durationSec: g.durationSec ?? "",
        })),
      }))
    );
  };



  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Plan strength</h1>
          <p className="mt-1 text-sm text-slate-500">
            Crée une séance à faire. Puis clique "J’ai fait" pour l’envoyer dans le journal.
          </p>
        </div>

        {err ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {err}
          </div>
        ) : null}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-slate-900">Suggestion IA</div>

            <button
              type="button"
              onClick={() => void suggest()}
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              {suggestLoading ? "..." : suggestion ? "Régénérer" : "Proposer une séance"}
            </button>
          </div>

          {!suggestion ? (
            <div className="mt-2 text-sm text-slate-600">
              Clique sur “Proposer une séance”. Tu pourras ensuite ajuster en répondant.
            </div>
          ) : (
            <>
              <div className="mt-2 text-sm text-slate-700">{suggestion.message}</div>

              <div className="mt-3 space-y-2">
                {suggestion.plan.exercises.map((ex, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="font-medium text-slate-900">{ex.name}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {ex.groups.map((g) => {
                        const parts = [];
                        parts.push(`${g.count}×`);
                        if (g.reps) parts.push(`${g.reps} reps`);
                        if (g.durationSec) parts.push(`${g.durationSec}s`);
                        if (g.weightKg) parts.push(`${g.weightKg} kg`);
                        return parts.join(" ");
                      }).join(" · ")}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder='Ex: "pas de pompes", "plus court", "focus abdos"...'
                  className="w-full flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />

                <button
                  type="button"
                  onClick={() => void suggest(aiInput)}
                  disabled={!aiInput.trim() || suggestLoading}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Envoyer
                </button>

                <button
                  type="button"
                  onClick={applySuggestion}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Utiliser cette proposition
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-slate-900">
              {editingId ? "Modifier un plan" : "Nouveau plan"}
            </div>

            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date / heure</label>
              <input
                type="datetime-local"
                value={plannedForLocal}
                onChange={(e) => setPlannedForLocal(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Durée (min)</label>
              <input
                type="number"
                min={1}
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="Optionnel"
            />
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium text-slate-900">Exercices</div>

              <button
                type="button"
                onClick={addExercise}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Ajouter un exercice
              </button>
            </div>

            <div className="space-y-4">
              {exercises.map((ex, exIdx) => (
                <div key={ex.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Exercice {exIdx + 1}
                      </label>
                      <input
                        placeholder="Ex: pompes, dead bug..."
                        value={ex.name}
                        onChange={(e) => updateExerciseName(ex.id, e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeExercise(ex.id)}
                      disabled={exercises.length === 1}
                      className="mt-7 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Supprimer
                    </button>
                  </div>

                  <div className="mt-4 text-sm font-medium text-slate-900 mb-2">Groupes</div>

                  <div className="space-y-3">
                    {ex.groups.map((g, idx) => (
                      <div key={idx} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                        <input
                          type="number"
                          min={1}
                          value={g.count}
                          onChange={(e) => {
                            const value = e.target.value;
                            updateGroup(ex.id, idx, { count: value === "" ? "" : Number(value) });
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
                            updateGroup(ex.id, idx, { reps: v });
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
                            updateGroup(ex.id, idx, { weightKg: v });
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
                            updateGroup(ex.id, idx, { durationSec: v });
                          }}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                          placeholder="Sec (opt.)"
                        />

                        <button
                          type="button"
                          onClick={() => removeGroup(ex.id, idx)}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Supprimer
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addGroup(ex.id)}
                    className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Ajouter un groupe
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={() => void submit()}
              disabled={!canSubmit}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {editingId ? "Sauvegarder" : "Planifier"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="text-sm font-medium text-slate-900">Plans</div>
            <div className="text-xs text-slate-500">{loading ? "Chargement." : `${plans.length} plan(s)`}</div>
          </div>

          <div className="divide-y divide-slate-100">
            {plans.map((p) => (
              <div key={p.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">Séance strength</div>
                    <div className="mt-1 text-sm text-slate-700">
                      {p.durationMin ? `${p.durationMin} min · ` : ""}{new Date(p.plannedFor).toLocaleString()}
                    </div>
                    {p.notes ? <div className="mt-1 text-sm text-slate-500">{p.notes}</div> : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => loadPlanIntoForm(p)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Modifier
                    </button>

                    <button
                      type="button"
                      onClick={() => void completePlan(p.id)}
                      className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      J’ai fait
                    </button>

                    <button
                      type="button"
                      onClick={() => void deletePlan(p.id)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                {p.exercises?.length ? (
                  <div className="mt-3 text-sm text-slate-600">
                    {p.exercises.map((ex, i) => (
                      <div key={`${p.id}-${i}`} className="mt-2">
                        <div className="font-medium text-slate-700">{ex.name}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {formatSetSummary(ex.sets).join(" · ")}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {!loading && plans.length === 0 ? (
              <div className="px-6 py-10 text-sm text-slate-500">Aucun plan pour le moment.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
