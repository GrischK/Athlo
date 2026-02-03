import {Route, Routes} from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import {RequireAuth} from "./auth/RequireAuth";
import Journal from "./pages/Journal.tsx";
import AppLayout from "./layouts/AppLayout.tsx";
import PlanStrength from "@/pages/PlanStrength.tsx";
import Goal from "@/pages/Goal.tsx";
import Routines from "@/pages/Routine.tsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login/>}/>
      <Route element={<AppLayout/>}>
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
        <Route
          path="/journal"
          element={
            <RequireAuth>
              <Journal/>
            </RequireAuth>
          }
        />
        <Route
          path="/plan"
          element={
            <RequireAuth>
              <PlanStrength/>
            </RequireAuth>
          }
        />
        <Route
          path="/goal"
          element={
            <RequireAuth>
              < Goal/>
            </RequireAuth>
          }
        />
        <Route
          path="/routine"
          element={
            <RequireAuth>
              <Routines/>
            </RequireAuth>
          }
        />
      </Route>

    </Routes>
  );
}
