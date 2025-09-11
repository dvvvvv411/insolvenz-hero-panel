import { useState, useEffect } from "react";
import { Plus, Upload, ExternalLink, Trash2, Package, FileText, Pencil } from "lucide-react";
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedEditFile, setSelectedEditFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [editingNische, setEditingNische] = useState<Nische | null>(null);
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

  const editForm = useForm<FormData>({
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

  const handleOpenPdf = async (path: string) => {
    if (!path) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Keine PDF-Datei verfügbar",
      });
      return;
    }

    setIsPdfLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("bestandslisten")
        .createSignedUrl(path, 600);

      if (error) throw error;

      setPdfUrl(data.signedUrl);
      setIsPdfOpen(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "PDF konnte nicht geladen werden",
      });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleEdit = (nische: Nische) => {
    setEditingNische(nische);
    editForm.reset({
      nische: nische.nische,
      insolventes_unternehmen: nische.insolventes_unternehmen || "",
      empfaenger: nische.empfaenger,
      transporter_dropbox_url: nische.transporter_dropbox_url || "",
      pkw_dropbox_url: nische.pkw_dropbox_url || "",
      kanzlei: nische.kanzlei || "",
    });
    setIsEditDialogOpen(true);
  };

  const onEditSubmit = async (data: FormData) => {
    if (!user || !editingNische) return;

    setIsLoading(true);

    try {
      let bestandsliste_path = editingNische.bestandsliste_path;

      if (selectedEditFile) {
        bestandsliste_path = await uploadFile(selectedEditFile);
        if (!bestandsliste_path) {
          setIsLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from("nischen")
        .update({
          nische: data.nische,
          insolventes_unternehmen: data.insolventes_unternehmen || null,
          empfaenger: data.empfaenger,
          bestandsliste_path,
          transporter_dropbox_url: data.transporter_dropbox_url || null,
          pkw_dropbox_url: data.pkw_dropbox_url || null,
          kanzlei: data.kanzlei || null,
        })
        .eq("id", editingNische.id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Nische wurde erfolgreich aktualisiert",
      });

      editForm.reset();
      setSelectedEditFile(null);
      setIsEditDialogOpen(false);
      setEditingNische(null);
      fetchNischen();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Nische konnte nicht aktualisiert werden",
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
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-2 py-2">Nische</TableHead>
                  <TableHead className="px-2 py-2">Empfänger</TableHead>
                  <TableHead className="px-2 py-2">Bestandsliste</TableHead>
                  <TableHead className="px-2 py-2">Transporter</TableHead>
                  <TableHead className="px-2 py-2">PKW</TableHead>
                  <TableHead className="px-2 py-2">Kanzlei</TableHead>
                  <TableHead className="px-2 py-2 w-28">Erstellt</TableHead>
                  <TableHead className="px-2 py-2 w-32">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nischen.map((nische) => (
                  <TableRow key={nische.id}>
                    <TableCell className="px-2 py-2 font-medium whitespace-nowrap">
                      <div className="max-w-32 truncate">{nische.nische}</div>
                      {nische.insolventes_unternehmen && (
                        <div className="text-xs text-muted-foreground max-w-32 truncate">
                          {nische.insolventes_unternehmen}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-2 whitespace-nowrap">
                      {nische.empfaenger.toLocaleString()}
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      {nische.bestandsliste_path ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPdf(nische.bestandsliste_path!)}
                          disabled={isPdfLoading}
                          className="h-7 px-2 text-xs"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Öffnen
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Keine Datei</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      {nische.transporter_dropbox_url ? (
                        <a
                          href={nische.transporter_dropbox_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Link
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Kein Link</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      {nische.pkw_dropbox_url ? (
                        <a
                          href={nische.pkw_dropbox_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Link
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Kein Link</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-2 whitespace-nowrap">
                      <div className="max-w-24 truncate">
                        {nische.kanzlei || (
                          <span className="text-xs text-muted-foreground">Nicht angegeben</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-2 whitespace-nowrap text-xs">
                      {new Date(nische.created_at).toLocaleDateString("de-DE")}
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(nische)}
                          className="h-7 w-7 p-0"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNische(nische.id)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* PDF Viewer Dialog */}
      <Dialog open={isPdfOpen} onOpenChange={(open) => {
        setIsPdfOpen(open);
        if (!open) setPdfUrl(null);
      }}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>PDF Vorschau</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {pdfUrl && (
              <iframe
                src={pdfUrl}
                className="w-full h-[80vh] border rounded"
                title="PDF Vorschau"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nische bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Details der ausgewählten Nische.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
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
                  control={editForm.control}
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
                <Label htmlFor="edit-bestandsliste">Bestandsliste ersetzen (PDF)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="edit-bestandsliste"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setSelectedEditFile(e.target.files?.[0] || null)}
                    className="flex-1"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Lassen Sie das Feld leer, um die aktuelle Datei zu behalten.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
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
                  control={editForm.control}
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
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Wird gespeichert..." : "Änderungen speichern"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}