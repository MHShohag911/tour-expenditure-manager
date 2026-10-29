
import { NavBar } from "@/components/NavBar";
import Footer from "@/components/Footer";
import Dashboard from "@/components/Dashboard";

export default function Page() {
  return (
    <div className="container mx-auto flex min-h-screen flex-col px-4">
      <NavBar />
      <main className="min-h-screen flex-1">
        <Dashboard />
      </main>
      <Footer />
    </div>
  );
}