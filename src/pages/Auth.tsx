import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

const authSchema = z.object({
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein"),
  password: z.string().min(6, "Das Passwort muss mindestens 6 Zeichen lang sein"),
});

type AuthForm = z.infer<typeof authSchema>;

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useSupabaseAuth();

  const loginForm = useForm<AuthForm>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<AuthForm>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      navigate("/dashboard", { replace: true });
    }
  }, [session, navigate]);

  const handleLogin = async (data: AuthForm) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Anmeldung fehlgeschlagen",
          description: error.message === "Invalid login credentials" 
            ? "E-Mail oder Passwort ist nicht korrekt" 
            : error.message,
        });
        return;
      }

      navigate("/dashboard");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (data: AuthForm) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Registrierung fehlgeschlagen",
          description: error.message === "User already registered" 
            ? "Diese E-Mail-Adresse ist bereits registriert" 
            : error.message,
        });
        return;
      }

      toast({
        title: "Registrierung erfolgreich",
        description: "Bitte prüfen Sie Ihre E-Mails zur Bestätigung",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageMeta 
        title="Anmelden – Insolvenzverwaltung"
        description="Melden Sie sich in Ihrem Konto an oder erstellen Sie ein neues Konto für die professionelle Insolvenzverwaltung."
      />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Insolvenz<span className="text-primary">verwaltung</span>
          </h1>
          <p className="text-muted-foreground">
            Anmelden oder Konto erstellen
          </p>
        </div>

        <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Willkommen
            </CardTitle>
            <CardDescription>
              Geben Sie Ihre Daten ein, um fortzufahren
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Anmelden</TabsTrigger>
                <TabsTrigger value="signup">Registrieren</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-Mail</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="ihre@email.de"
                              {...field}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passwort</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              {...field}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full h-11 mt-6"
                      disabled={isLoading}
                    >
                      {isLoading ? "Wird angemeldet..." : "Anmelden"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="signup">
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-Mail</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="ihre@email.de"
                              {...field}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passwort</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              {...field}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full h-11 mt-6"
                      disabled={isLoading}
                    >
                      {isLoading ? "Wird registriert..." : "Konto erstellen"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  );
};

export default Auth;