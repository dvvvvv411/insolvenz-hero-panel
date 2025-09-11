import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

const Index = () => {
  const navigate = useNavigate();
  const { session, initialized } = useSupabaseAuth();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (initialized && session) {
      navigate("/dashboard", { replace: true });
    }
  }, [session, initialized, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10"></div>
      
      <div className="container mx-auto px-6 text-center relative z-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground">
            Insolvenz
            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent block">
              Verwaltung
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Professionelle Verwaltung und Abwicklung von Insolvenzverfahren. 
            Digitale Effizienz für komplexe Prozesse.
          </p>
          
          <div className="pt-8">
            <Button 
              asChild
              size="lg" 
              className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link to="/auth">Jetzt starten</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
