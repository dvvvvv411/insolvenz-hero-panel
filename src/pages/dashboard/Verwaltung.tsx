import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Phone, Mail, FileText, Eye, Trash2, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const formSchema = z.object({
  unternehmensname: z.string().min(1, "Unternehmensname ist erforderlich"),
  ansprechpartner: z.string().min(1, "Ansprechpartner ist erforderlich"),
  email: z.string().email("Gültige E-Mail-Adresse erforderlich"),
  telefonnummer: z.string().min(1, "Telefonnummer ist erforderlich"),
  mobilfunknummer: z.string().optional(),
  nische: z.string().min(1, "Nische ist erforderlich"),
});

type FormData = z.infer<typeof formSchema>;

interface Interessent {
  id: string;
  unternehmensname: string;
  ansprechpartner: string;
  email: string;
  telefonnummer: string;
  mobilfunknummer?: string;
  nische: string;
  status: string;
  call_notwendig: string;
  call_notwendig_grund?: string;
  created_at: string;
}

interface EmailVerlauf {
  id: string;
  screenshot_path: string;
  created_at: string;
}

interface CallVerlauf {
  id: string;
  typ: string;
  notiz?: string;
  created_at: string;
}

interface Notiz {
  id: string;
  notiz: string;
  created_at: string;
}

const statusOptions = [
  "Mail raus",
  "KV versendet", 
  "Möchte KV",
  "Möchte Rechnung",
  "Rechnung versendet",
  "Überwiesen",
  "Exchanged",
  "Kein Interesse"
];

const statusOrder = {
  "Exchanged": 1,
  "Überwiesen": 2,
  "Rechnung versendet": 3,
  "Möchte Rechnung": 4,
  "KV versendet": 5,
  "Möchte KV": 6,
  "Mail raus": 7,
  "Kein Interesse": 8
};

const callOptions = [
  "Kein Call notwendig",
  "Call notwendig", 
  "Call erledigt"
];

export default function Verwaltung() {
  const [interessenten, setInteressenten] = useState<Interessent[]>([]);
  const [nischen, setNischen] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [isNotizDialogOpen, setIsNotizDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isCallGrundDialogOpen, setIsCallGrundDialogOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [isCallViewerOpen, setIsCallViewerOpen] = useState(false);
  const [isNotizViewerOpen, setIsNotizViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedInteressent, setSelectedInteressent] = useState<Interessent | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [isUrlUploadLoading, setIsUrlUploadLoading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<"file" | "url">("url");
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const [currentViewingScreenshot, setCurrentViewingScreenshot] = useState<EmailVerlauf | null>(null);
  const [callNotiz, setCallNotiz] = useState("");
  const [notizText, setNotizText] = useState("");
  const [callGrund, setCallGrund] = useState("");
  const [emailVerlauf, setEmailVerlauf] = useState<Record<string, EmailVerlauf[]>>({});
  const [callVerlauf, setCallVerlauf] = useState<Record<string, CallVerlauf[]>>({});
  const [notizenVerlauf, setNotizenVerlauf] = useState<Record<string, Notiz[]>>({});
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);
  const [viewCall, setViewCall] = useState<CallVerlauf | null>(null);
  const [viewNotiz, setViewNotiz] = useState<Notiz | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      unternehmensname: "",
      ansprechpartner: "",
      email: "",
      telefonnummer: "",
      mobilfunknummer: "",
      nische: "",
    },
  });

  const fetchNischen = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from("nischen")
      .select("nische")
      .eq("user_id", user.user.id);

    if (error) {
      toast({
        title: "Fehler",
        description: "Nischen konnten nicht geladen werden",
        variant: "destructive",
      });
      return;
    }

    const uniqueNischen = [...new Set(data.map(item => item.nische))];
    setNischen(uniqueNischen);
  };

  const fetchInteressenten = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from("interessenten")
      .select("*")
      .eq("user_id", user.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Fehler",
        description: "Interessenten konnten nicht geladen werden",
        variant: "destructive",
      });
      return;
    }

    setInteressenten(data || []);
    await fetchAllVerlauf(data || []);
  };

  const fetchAllVerlauf = async (interessentenList: Interessent[]) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    // Fetch email verlauf
    const { data: emailData } = await supabase
      .from("interessenten_email_verlauf")
      .select("*")
      .eq("user_id", user.user.id);

    const emailMap: Record<string, EmailVerlauf[]> = {};
    const thumbnails: Record<string, string> = {};
    
    emailData?.forEach(item => {
      if (!emailMap[item.interessent_id]) emailMap[item.interessent_id] = [];
      emailMap[item.interessent_id].push(item);
    });
    setEmailVerlauf(emailMap);

    // Generate thumbnail URLs
    if (emailData) {
      for (const item of emailData) {
        try {
          const { data } = await supabase.storage
            .from("email-screenshots")
            .createSignedUrl(item.screenshot_path, 600);
          if (data) {
            thumbnails[item.id] = data.signedUrl;
          }
        } catch (error) {
          console.error('Error creating thumbnail URL:', error);
        }
      }
    }
    setThumbnailUrls(thumbnails);

    // Fetch call verlauf
    const { data: callData } = await supabase
      .from("interessenten_calls")
      .select("*")
      .eq("user_id", user.user.id);

    const callMap: Record<string, CallVerlauf[]> = {};
    callData?.forEach(item => {
      if (!callMap[item.interessent_id]) callMap[item.interessent_id] = [];
      callMap[item.interessent_id].push(item);
    });
    setCallVerlauf(callMap);

    // Fetch notizen verlauf
    const { data: notizenData } = await supabase
      .from("interessenten_notizen")
      .select("*")
      .eq("user_id", user.user.id);

    const notizenMap: Record<string, Notiz[]> = {};
    notizenData?.forEach(item => {
      if (!notizenMap[item.interessent_id]) notizenMap[item.interessent_id] = [];
      notizenMap[item.interessent_id].push(item);
    });
    setNotizenVerlauf(notizenMap);
  };

  const onSubmit = async (data: FormData) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase
      .from("interessenten")
      .insert({
        ...data,
        user_id: user.user.id,
      });

    if (error) {
      toast({
        title: "Fehler",
        description: "Interessent konnte nicht hinzugefügt werden",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Erfolg",
      description: "Interessent wurde hinzugefügt",
    });

    form.reset();
    setIsAddDialogOpen(false);
    fetchInteressenten();
  };

  const uploadEmailScreenshot = async () => {
    if (uploadMethod === "file" && (!selectedFile || !selectedInteressent)) return;
    if (uploadMethod === "url" && (!screenshotUrl || !selectedInteressent)) return;

    if (uploadMethod === "file") {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const fileExt = selectedFile!.name.split('.').pop();
      const fileName = `${user.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("email-screenshots")
        .upload(fileName, selectedFile!);

      if (uploadError) {
        toast({
          title: "Fehler",
          description: "Screenshot konnte nicht hochgeladen werden",
          variant: "destructive",
        });
        return;
      }

      const { error: dbError } = await supabase
        .from("interessenten_email_verlauf")
        .insert({
          interessent_id: selectedInteressent.id,
          user_id: user.user.id,
          screenshot_path: fileName,
        });

      if (dbError) {
        toast({
          title: "Fehler",
          description: "Email-Verlauf konnte nicht gespeichert werden",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Erfolg",
        description: "Email-Screenshot wurde hinzugefügt",
      });

      setIsEmailDialogOpen(false);
      setSelectedFile(null);
      fetchInteressenten();
    } else {
      await saveScreenshotFromUrl();
    }
  };

  const saveScreenshotFromUrl = async () => {
    if (!screenshotUrl || !selectedInteressent) return;

    setIsUrlUploadLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('save-screenshot-from-url', {
        body: {
          imageUrl: screenshotUrl,
          interessentId: selectedInteressent.id
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Unbekannter Fehler');
      }

      toast({
        title: "Erfolg",
        description: "Screenshot wurde von URL gespeichert",
      });

      setIsEmailDialogOpen(false);
      setScreenshotUrl("");
      fetchInteressenten();

    } catch (error) {
      console.error('Error saving screenshot from URL:', error);
      toast({
        title: "Fehler",
        description: error.message || "Screenshot konnte nicht von URL gespeichert werden",
        variant: "destructive",
      });
    } finally {
      setIsUrlUploadLoading(false);
    }
  };

  const addCall = async (typ: string) => {
    if (!selectedInteressent) return;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase
      .from("interessenten_calls")
      .insert({
        interessent_id: selectedInteressent.id,
        user_id: user.user.id,
        typ,
        notiz: typ === "Call" ? callNotiz : null,
      });

    if (error) {
      toast({
        title: "Fehler",
        description: "Call konnte nicht hinzugefügt werden",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Erfolg",
      description: `${typ} wurde hinzugefügt`,
    });

    setIsCallDialogOpen(false);
    setCallNotiz("");
    fetchInteressenten();
  };

  const addNotiz = async () => {
    if (!selectedInteressent || !notizText.trim()) return;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase
      .from("interessenten_notizen")
      .insert({
        interessent_id: selectedInteressent.id,
        user_id: user.user.id,
        notiz: notizText,
      });

    if (error) {
      toast({
        title: "Fehler",
        description: "Notiz konnte nicht hinzugefügt werden",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Erfolg",
      description: "Notiz wurde hinzugefügt",
    });

    setIsNotizDialogOpen(false);
    setNotizText("");
    fetchInteressenten();
  };

  const updateStatus = async (interessentId: string, newStatus: string) => {
    const { error } = await supabase
      .from("interessenten")
      .update({ status: newStatus })
      .eq("id", interessentId);

    if (error) {
      toast({
        title: "Fehler",
        description: "Status konnte nicht aktualisiert werden",
        variant: "destructive",
      });
      return;
    }

    fetchInteressenten();
  };

  const updateCallNotwendig = async (interessentId: string, callStatus: string, grund?: string) => {
    const { error } = await supabase
      .from("interessenten")
      .update({ 
        call_notwendig: callStatus,
        call_notwendig_grund: grund
      })
      .eq("id", interessentId);

    if (error) {
      toast({
        title: "Fehler",
        description: "Call-Status konnte nicht aktualisiert werden",
        variant: "destructive",
      });
      return;
    }

    setIsCallGrundDialogOpen(false);
    setCallGrund("");
    fetchInteressenten();
  };

  const viewEmailScreenshot = async (screenshot: EmailVerlauf) => {
    const { data, error } = await supabase.storage
      .from("email-screenshots")
      .createSignedUrl(screenshot.screenshot_path, 600);

    if (error || !data) {
      toast({
        title: "Fehler",
        description: "Screenshot konnte nicht geladen werden",
        variant: "destructive",
      });
      return;
    }

    setViewImageUrl(data.signedUrl);
    setCurrentViewingScreenshot(screenshot);
    setIsImageViewerOpen(true);
  };

  const deleteEmailScreenshot = async (screenshot: EmailVerlauf) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("email-screenshots")
      .remove([screenshot.screenshot_path]);

    if (storageError) {
      toast({
        title: "Fehler",
        description: "Screenshot konnte nicht aus dem Speicher gelöscht werden",
        variant: "destructive",
      });
      return;
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("interessenten_email_verlauf")
      .delete()
      .eq("id", screenshot.id)
      .eq("user_id", user.user.id);

    if (dbError) {
      toast({
        title: "Fehler",
        description: "Screenshot konnte nicht aus der Datenbank gelöscht werden",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Erfolg",
      description: "Screenshot wurde gelöscht",
    });

    setIsImageViewerOpen(false);
    setCurrentViewingScreenshot(null);
    fetchInteressenten();
  };

  const getSortedInteressenten = () => {
    const filtered = showHidden 
      ? interessenten 
      : interessenten.filter(i => i.status !== "Kein Interesse");

    return filtered.sort((a, b) => {
      // Call notwendig has highest priority
      if (a.call_notwendig === "Call notwendig" && b.call_notwendig !== "Call notwendig") return -1;
      if (b.call_notwendig === "Call notwendig" && a.call_notwendig !== "Call notwendig") return 1;

      // Then sort by status
      const statusA = statusOrder[a.status as keyof typeof statusOrder] || 999;
      const statusB = statusOrder[b.status as keyof typeof statusOrder] || 999;
      
      if (statusA !== statusB) return statusA - statusB;

      // Finally by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchNischen(), fetchInteressenten()]);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="p-6">Lädt...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Verwaltung</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowHidden(!showHidden)}
          >
            {showHidden ? "Ausgeblendete verstecken" : "Ausgeblendete anzeigen"}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Interessent hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Neuen Interessent hinzufügen</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="unternehmensname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unternehmensname</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ansprechpartner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ansprechpartner</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-Mail</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="telefonnummer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefonnummer</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mobilfunknummer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobilfunknummer (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nische"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nische</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Nische auswählen" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {nischen.map((nische) => (
                              <SelectItem key={nische} value={nische}>
                                {nische}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button type="submit">Hinzufügen</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="px-2 py-2 w-40">Kontakt</TableHead>
              <TableHead className="px-2 py-2 w-24">Nische</TableHead>
              <TableHead className="px-2 py-2 w-40">Email-Verlauf</TableHead>
              <TableHead className="px-2 py-2 w-32">Call-Verlauf</TableHead>
              <TableHead className="px-2 py-2 w-32">Notizen</TableHead>
              <TableHead className="px-2 py-2 w-28">Status</TableHead>
              <TableHead className="px-2 py-2 w-32">Call Notwendig</TableHead>
              <TableHead className="px-2 py-2 w-20">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {getSortedInteressenten().map((interessent) => (
              <TableRow key={interessent.id} className={interessent.call_notwendig === "Call notwendig" ? "bg-accent/50" : ""}>
                <TableCell className="px-2 py-2">
                  <div className="space-y-1">
                    <div className="font-medium">{interessent.unternehmensname}</div>
                    <div className="text-sm text-muted-foreground">{interessent.ansprechpartner}</div>
                    <div className="text-sm text-muted-foreground">{interessent.email}</div>
                    <div className="text-sm text-muted-foreground">{interessent.telefonnummer}</div>
                    {interessent.mobilfunknummer && (
                      <div className="text-sm text-muted-foreground">{interessent.mobilfunknummer}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-2 whitespace-nowrap">{interessent.nische}</TableCell>
                <TableCell className="px-2 py-2">
                  <div className="flex gap-1 flex-wrap">
                     {emailVerlauf[interessent.id]?.map((email, index) => (
                       <div key={email.id} className="relative">
                         <button
                           className="w-16 h-28 border border-border rounded overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"
                           onClick={() => viewEmailScreenshot(email)}
                         >
                           {thumbnailUrls[email.id] ? (
                             <img 
                               src={thumbnailUrls[email.id]} 
                               alt={`Screenshot ${index + 1}`}
                               className="w-full h-full object-cover"
                             />
                           ) : (
                             <div className="w-full h-full bg-muted flex items-center justify-center">
                               <Eye className="w-4 h-4 text-muted-foreground" />
                             </div>
                           )}
                         </button>
                         <TooltipProvider>
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <button
                                 className="absolute top-1 right-1 w-4 h-4 bg-background/80 rounded-full flex items-center justify-center hover:bg-background transition-colors"
                                 onClick={(e) => e.stopPropagation()}
                               >
                                 <Info className="w-2.5 h-2.5 text-muted-foreground" />
                               </button>
                             </TooltipTrigger>
                             <TooltipContent>
                               <p>Hinzugefügt am {format(new Date(email.created_at), "dd.MM.yyyy, HH:mm", { locale: de })}</p>
                             </TooltipContent>
                           </Tooltip>
                         </TooltipProvider>
                       </div>
                     ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 mt-1"
                       onClick={() => {
                         setSelectedInteressent(interessent);
                         setUploadMethod("url");
                         setIsEmailDialogOpen(true);
                       }}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="px-2 py-2">
                  <div className="flex flex-wrap gap-1">
                     {callVerlauf[interessent.id]?.map((call, index) => (
                       <div key={call.id} className="relative inline-block">
                         <Button
                           variant="outline"
                           size="sm"
                           className="h-8 px-2 pr-6 text-xs"
                           onClick={() => {
                             setViewCall(call);
                             setIsCallViewerOpen(true);
                           }}
                         >
                           {call.typ} {index + 1}
                         </Button>
                         <TooltipProvider>
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <button
                                 className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center hover:bg-muted rounded-sm transition-colors"
                                 onClick={(e) => e.stopPropagation()}
                               >
                                 <Info className="w-2.5 h-2.5 text-muted-foreground" />
                               </button>
                             </TooltipTrigger>
                             <TooltipContent>
                               <p>Eingetragen am {format(new Date(call.created_at), "dd.MM.yyyy, HH:mm", { locale: de })}</p>
                             </TooltipContent>
                           </Tooltip>
                         </TooltipProvider>
                       </div>
                     ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        setSelectedInteressent(interessent);
                        setIsCallDialogOpen(true);
                      }}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="px-2 py-2">
                  <div className="flex flex-wrap gap-1">
                    {notizenVerlauf[interessent.id]?.map((notiz, index) => (
                      <Button
                        key={notiz.id}
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => {
                          setViewNotiz(notiz);
                          setIsNotizViewerOpen(true);
                        }}
                      >
                        Notiz {index + 1}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        setSelectedInteressent(interessent);
                        setIsNotizDialogOpen(true);
                      }}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="px-2 py-2">
                  <Select
                    value={interessent.status}
                    onValueChange={(value) => updateStatus(interessent.id, value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="px-2 py-2">
                  <div className="space-y-1">
                    <Select
                      value={interessent.call_notwendig}
                      onValueChange={(value) => {
                        if (value === "Call notwendig") {
                          setSelectedInteressent(interessent);
                          setIsCallGrundDialogOpen(true);
                        } else {
                          updateCallNotwendig(interessent.id, value);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {callOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {interessent.call_notwendig_grund && (
                      <div className="text-xs text-muted-foreground">
                        {interessent.call_notwendig_grund}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      setSelectedInteressent(interessent);
                      setIsDetailsDialogOpen(true);
                    }}
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email-Screenshot hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={uploadMethod} onValueChange={(value: "file" | "url") => setUploadMethod(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="file" id="file" />
                <Label htmlFor="file">Datei hochladen</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="url" id="url" />
                <Label htmlFor="url">Von URL</Label>
              </div>
            </RadioGroup>

            {uploadMethod === "file" && (
              <div>
                <Label htmlFor="email-file">Screenshot auswählen</Label>
                <Input
                  id="email-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
            )}

            {uploadMethod === "url" && (
              <div>
                <Label htmlFor="screenshot-url">Screenshot URL</Label>
                <Input
                  id="screenshot-url"
                  type="url"
                  placeholder="https://prnt.sc/... oder https://example.com/screenshot.png"
                  value={screenshotUrl}
                  onChange={(e) => setScreenshotUrl(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button 
                onClick={uploadEmailScreenshot} 
                disabled={
                  (uploadMethod === "file" && !selectedFile) || 
                  (uploadMethod === "url" && (!screenshotUrl || isUrlUploadLoading))
                }
              >
                {isUrlUploadLoading ? "Lädt..." : "Hochladen"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Call Dialog */}
      <Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Call hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="call-notiz">Notiz zum Call</Label>
              <Textarea
                id="call-notiz"
                value={callNotiz}
                onChange={(e) => setCallNotiz(e.target.value)}
                placeholder="Was wurde besprochen?"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCallDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button variant="outline" onClick={() => addCall("Mailbox")}>
                Mailbox
              </Button>
              <Button onClick={() => addCall("Call")}>
                Call hinzufügen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notiz Dialog */}
      <Dialog open={isNotizDialogOpen} onOpenChange={setIsNotizDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notiz hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notiz-text">Notiz</Label>
              <Textarea
                id="notiz-text"
                value={notizText}
                onChange={(e) => setNotizText(e.target.value)}
                placeholder="Notiz eingeben..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsNotizDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={addNotiz} disabled={!notizText.trim()}>
                Hinzufügen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Call Grund Dialog */}
      <Dialog open={isCallGrundDialogOpen} onOpenChange={setIsCallGrundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grund für Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="call-grund">Wozu ist der Call notwendig?</Label>
              <Textarea
                id="call-grund"
                value={callGrund}
                onChange={(e) => setCallGrund(e.target.value)}
                placeholder="Grund eingeben..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCallGrundDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button 
                onClick={() => selectedInteressent && updateCallNotwendig(selectedInteressent.id, "Call notwendig", callGrund)}
                disabled={!callGrund.trim()}
              >
                Speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Email-Screenshot</DialogTitle>
              {currentViewingScreenshot && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteEmailScreenshot(currentViewingScreenshot)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </Button>
              )}
            </div>
          </DialogHeader>
          {viewImageUrl && (
            <div className="w-full">
              <img src={viewImageUrl} alt="Email Screenshot" className="max-w-full h-auto" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Call Viewer Dialog */}
      <Dialog open={isCallViewerOpen} onOpenChange={setIsCallViewerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Call Details</DialogTitle>
          </DialogHeader>
          {viewCall && (
            <div className="space-y-4">
              <div>
                <strong>Typ:</strong> {viewCall.typ}
              </div>
              <div>
                <strong>Datum:</strong> {format(new Date(viewCall.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
              </div>
              {viewCall.notiz && (
                <div>
                  <strong>Notiz:</strong>
                  <div className="mt-2 p-3 bg-muted rounded">{viewCall.notiz}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Notiz Viewer Dialog */}
      <Dialog open={isNotizViewerOpen} onOpenChange={setIsNotizViewerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notiz Details</DialogTitle>
          </DialogHeader>
          {viewNotiz && (
            <div className="space-y-4">
              <div>
                <strong>Datum:</strong> {format(new Date(viewNotiz.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
              </div>
              <div>
                <strong>Notiz:</strong>
                <div className="mt-2 p-3 bg-muted rounded">{viewNotiz.notiz}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Interessent Details</DialogTitle>
          </DialogHeader>
          {selectedInteressent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Unternehmensname:</strong>
                  <div>{selectedInteressent.unternehmensname}</div>
                </div>
                <div>
                  <strong>Ansprechpartner:</strong>
                  <div>{selectedInteressent.ansprechpartner}</div>
                </div>
                <div>
                  <strong>E-Mail:</strong>
                  <div>{selectedInteressent.email}</div>
                </div>
                <div>
                  <strong>Telefonnummer:</strong>
                  <div>{selectedInteressent.telefonnummer}</div>
                </div>
                {selectedInteressent.mobilfunknummer && (
                  <div>
                    <strong>Mobilfunknummer:</strong>
                    <div>{selectedInteressent.mobilfunknummer}</div>
                  </div>
                )}
                <div>
                  <strong>Nische:</strong>
                  <div>{selectedInteressent.nische}</div>
                </div>
                <div>
                  <strong>Status:</strong>
                  <div>{selectedInteressent.status}</div>
                </div>
                <div>
                  <strong>Call Notwendig:</strong>
                  <div>{selectedInteressent.call_notwendig}</div>
                </div>
                {selectedInteressent.call_notwendig_grund && (
                  <div className="col-span-2">
                    <strong>Call Grund:</strong>
                    <div>{selectedInteressent.call_notwendig_grund}</div>
                  </div>
                )}
                <div>
                  <strong>Erstellt:</strong>
                  <div>{format(new Date(selectedInteressent.created_at), "dd.MM.yyyy HH:mm", { locale: de })}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}