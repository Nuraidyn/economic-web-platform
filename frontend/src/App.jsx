import Home from "./pages/Home";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <Home />
    </div>
  );
}
