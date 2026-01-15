import React, {useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {useAuth} from "../auth/AuthProvider";

export default function Login() {
  const {login, state} = useAuth();
  const nav = useNavigate();
  const location = useLocation() as any;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = location.state?.from || "/";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      nav(from, {replace: true});
    } catch (err: any) {
      setError(err?.message || "Connexion impossible");
    } finally {
      setSubmitting(false);
    }
  };

  if (state.status === "authenticated") {
    nav("/", {replace: true});
  }

  return (
    <div style={{minHeight: "100vh", display: "grid", placeItems: "center", padding: 24}}>
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: 360,
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 20,
          display: "grid",
          gap: 12,
        }}
      >
        <h1 style={{margin: 0, fontSize: 22}}>Connexion</h1>

        <label style={{display: "grid", gap: 6}}>
          <span>Identifiant</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            style={{padding: 10, borderRadius: 10, border: "1px solid #ccc"}}
          />
        </label>

        <label style={{display: "grid", gap: 6}}>
          <span>Mot de passe</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
            style={{padding: 10, borderRadius: 10, border: "1px solid #ccc"}}
          />
        </label>

        {error ? (
          <div style={{padding: 10, borderRadius: 10, border: "1px solid #f3c2c2"}}>
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #333",
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Connexion." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
