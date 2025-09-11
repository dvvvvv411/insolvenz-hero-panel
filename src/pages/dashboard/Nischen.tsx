import { useState, useEffect } from "react";
import { Plus, Upload, ExternalLink, Trash2, Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const formSchema = z.object({
  nische: z.string().min(1, "Nische ist erforderlich"),
  insolventes_unternehmen: z.string().optional(),
  empfaenger: z.number().min(1, "Empfänger muss mindestens 1 sein"),
  transporter_dropbox_url: z.string().url("Ungültige URL").optional().or(z.literal("")),
  pkw_dropbox_url: z.string().url("Ungültige URL").optional().or(z.literal("")),
  kanzlei: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Nische {
  id: string;
  nische: string;
  insolventes_unternehmen?: string;
  empfaenger: number;
  bestandsliste_path?: string;
  transporter_dropbox_url?: string;
  pkw_dropbox_url?: string;
  kanzlei?: string;
  created_at: string;
}

export default function Nischen() {
  const [nischen, setNischen] = useState<Nische[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { user } = useSupabaseAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nische: "",
      insolventes_unternehmen: "",
      empfaenger: 1,
      transporter_dropbox_url: "",
      pkw_dropbox_url: "",
      kanzlei: "",
    },
  });

  const fetchNischen = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("nischen")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNischen(data || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Nischen konnten nicht geladen werden",
      });
    }
  };

  useEffect(() => {
    fetchNischen();
  }, [user]);

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    
    try {
      const { error: uploadError } = await supabase.storage
        .from("bestandslisten")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      return fileName;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload-Fehler",
        description: "Datei konnte nicht hochgeladen werden",
      });
      return null;
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    setIsLoading(true);

    try {
      let bestandsliste_path = null;

      if (selectedFile) {
        bestandsliste_path = await uploadFile(selectedFile);
        if (!bestandsliste_path) {
          setIsLoading(false);
          return;
        }
      }

      const { error } = await supabase.from("nischen").insert({
        user_id: user.id,
        nische: data.nische,
        insolventes_unternehmen: data.insolventes_unternehmen || null,
        empfaenger: data.empfaenger,
        bestandsliste_path,
        transporter_dropbox_url: data.transporter_dropbox_url || null,
        pkw_dropbox_url: data.pkw_dropbox_url || null,
        kanzlei: data.kanzlei || null,
      });

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Nische wurde erfolgreich hinzugefügt",
      });

      form.reset();
      setSelectedFile(null);
      setIsDialogOpen(false);
      fetchNischen();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Nische konnte nicht erstellt werden",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNische = async (id: string) => {
    try {
      const { error } = await supabase.from("nischen").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Nische wurde gelöscht",
      });

      fetchNischen();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Nische konnte nicht gelöscht werden",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nischen</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Insolvenznischen und deren Details
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm hover:shadow-md transition-shadow">
              <Plus className="h-4 w-4" />
              Nische hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Neue Nische hinzufügen</DialogTitle>
              <DialogDescription>
                Erstellen Sie eine neue Insolvenznische mit allen relevanten Informationen.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nische"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nische</FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. Metall" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="insolventes_unternehmen"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insolventes Unternehmen</FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. Müller GmbH" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="empfaenger"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Empfänger</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="z.B. 10000" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bestandsliste">Bestandsliste (PDF)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="bestandsliste"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="flex-1"
                    />
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="transporter_dropbox_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transporter Dropbox</FormLabel>
                        <FormControl>
                          <Input placeholder="https://dropbox.com/..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pkw_dropbox_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PKW Dropbox</FormLabel>
                        <FormControl>
                          <Input placeholder="https://dropbox.com/..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="kanzlei"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kanzlei</FormLabel>
                        <FormControl>
                          <Input placeholder="Name der Kanzlei" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Wird erstellt..." : "Nische erstellen"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Ihre Nischen</CardTitle>
          <CardDescription>
            Übersicht aller Ihrer Insolvenznischen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {nischen.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Noch keine Nischen vorhanden. Fügen Sie Ihre erste Nische hinzu.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nische</TableHead>
                  <TableHead>Empfänger</TableHead>
                  <TableHead>Bestandsliste</TableHead>
                  <TableHead>Transporter</TableHead>
                  <TableHead>PKW</TableHead>
                  <TableHead>Kanzlei</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead className="w-[100px]">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nischen.map((nische) => (
                  <TableRow key={nische.id}>
                    <TableCell className="font-medium">{nische.nische}</TableCell>
                    <TableCell>{nische.empfaenger.toLocaleString()}</TableCell>
                    <TableCell>
                      {nische.bestandsliste_path ? (
                        <span className="text-sm text-green-600">✓ Hochgeladen</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Keine Datei</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {nische.transporter_dropbox_url ? (
                        <a
                          href={nische.transporter_dropbox_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Link
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">Kein Link</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {nische.pkw_dropbox_url ? (
                        <a
                          href={nische.pkw_dropbox_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Link
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">Kein Link</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {nische.kanzlei || (
                        <span className="text-sm text-muted-foreground">Nicht angegeben</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(nische.created_at).toLocaleDateString("de-DE")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNische(nische.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}