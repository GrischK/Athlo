import React from "react";
import {Navigate, useLocation} from "react-router-dom";
import {useAuth} from "./AuthProvider";

export function RequireAuth({children}: { children: React.ReactNode }) {
  const {state} = useAuth();
  const location = useLocation();

  if (state.status === "loading") {
    return <div style={{padding: 24}}>Chargement.</div>;
  }

  if (state.status === "anonymous") {
    return <Navigate to="/login" replace state={{from: location.pathname}}/>;
  }

  return <>{children}</>;
}
