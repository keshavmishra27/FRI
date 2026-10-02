import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import Review from "./pages/Review";
import ShaderBackground from "./components/ui/ShaderBackground";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col relative z-0">
        <ShaderBackground />
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/review/:id" element={<Review />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t border-glass-border bg-surface-900/50 py-4 text-center text-xs text-slate-500">
          Smart Classroom Finder &middot; Built for VIPS-TC
        </footer>
      </div>
    </BrowserRouter>
  );
}
