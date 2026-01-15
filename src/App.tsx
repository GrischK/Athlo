import React from "react";
import {Route, Routes} from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import {RequireAuth} from "./auth/RequireAuth";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login/>}/>
      <Route
        path="/"
        element={
          <RequireAuth>
            <Home/>
          </RequireAuth>
        }
      />
      <Route
        path="*"
        element={
          <RequireAuth>
            <Home/>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
