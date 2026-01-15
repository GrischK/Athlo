import {useAuth} from "../auth/AuthProvider";

export default function Home() {
  const {state, logout} = useAuth();

  return (
    <div style={{padding: 24}}>
      <h1>Accueil</h1>
      <p>
        Connecté en tant que <b>{state.status === "authenticated" ? state.username : "?"}</b>
      </p>
      <button
        onClick={() => void logout()}
        style={{padding: 10, borderRadius: 10, border: "1px solid #333"}}
      >
        Se déconnecter
      </button>
    </div>
  );
}
