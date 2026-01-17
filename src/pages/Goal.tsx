import {useEffect, useState} from "react";
import {api} from "../lib/api";

export default function Goal() {
    const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string>("");
  const [savedAt, setSavedAt] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const g = await api.goalGet();
        if (g) {
          setText(g.text);
          setSavedAt(g.updatedAt);
        }
      } catch (e: any) {
        setErr(e?.message || "Erreur chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setErr("");
    try {
      const g = await api.goalUpdate(text);
      setSavedAt(g.updatedAt);
    } catch (e: any) {
      setErr(e?.message || "Erreur sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Objectif</h1>
          <p className="mt-1 text-sm text-slate-500">
            Cet objectif sera utilisé par l’IA pour proposer tes séances.
          </p>
        </div>

        {err ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {err}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Ton objectif (court. clair)
          </label>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Ex: Prendre de la masse. 3 séances strength/semaine. Focus pecs/bras/abdos. Courir 2 fois/semaine."
            disabled={loading}
          />

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {savedAt ? `Dernière mise à jour: ${new Date(savedAt).toLocaleString()}` : ""}
            </div>

            <button
              onClick={() => void save()}
              disabled={saving || loading || !text.trim()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Sauvegarde." : "Sauvegarder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
