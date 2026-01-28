import Home from "./pages/Home";
import Navbar from "./components/Navbar";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-canvas text-white">
        <Navbar />
        <Home />
      </div>
    </AuthProvider>
  );
}
