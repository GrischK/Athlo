import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
