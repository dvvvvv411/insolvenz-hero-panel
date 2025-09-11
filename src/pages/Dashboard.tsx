import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useSupabaseAuth();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
      toast({
        title: "Abgemeldet",
        description: "Sie wurden erfolgreich abgemeldet",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fehler beim Abmelden",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            Insolvenz<span className="text-primary">verwaltung</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Angemeldet als: {user?.email}
            </span>
            <Button variant="outline" onClick={handleLogout}>
              Abmelden
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold tracking-tight">
                Dashboard
              </CardTitle>
              <CardDescription className="text-lg">
                Willkommen in Ihrer Insolvenzverwaltung
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <div className="w-8 h-8 bg-primary/20 rounded-full"></div>
                </div>
                <p className="text-muted-foreground">
                  Platzhalter – Die Funktionen werden nachher implementiert.
                </p>
                <p className="text-sm text-muted-foreground">
                  Hier werden alle Insolvenzverfahren und Verwaltungsfunktionen verfügbar sein.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;