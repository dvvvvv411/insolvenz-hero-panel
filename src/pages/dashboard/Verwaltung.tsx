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
import { Plus, Phone, Mail, FileText, Eye, Trash2, Info, ExternalLink, Download, Copy, GripVertical, Settings, X } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

interface NischenDetails {
  id: string;
  nische: string;
  insolventes_unternehmen?: string;
  empfaenger: number;
  kanzlei?: string;
  pkw_dropbox_url?: string;
  transporter_dropbox_url?: string;
  bestandsliste_path?: string;
  created_at: string;
}

// Default status order
const defaultStatusOrder = [
  "Exchanged",
  "Überwiesen", 
  "Rechnung versendet",
  "Möchte Rechnung",
  "KV versendet",
  "Möchte KV",
  "Mail raus",
  "Neu"
];

// Get status order from localStorage or use default
const getStatusOrder = () => {
  const saved = localStorage.getItem('statusOrder');
  return saved ? JSON.parse(saved) : defaultStatusOrder;
};

// Status options (excluding "Kein Interesse" which is separate)
const getStatusOptions = () => {
  const order = getStatusOrder();
  return [...order, "Kein Interesse"];
};

// Create status order map for sorting
const getStatusOrderMap = () => {
  const order = getStatusOrder();
  const orderMap: Record<string, number> = {};
  order.forEach((status, index) => {
    orderMap[status] = index + 1;
  });
  orderMap["Kein Interesse"] = 999; // Always last
  return orderMap;
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
  const [isNischenDetailOpen, setIsNischenDetailOpen] = useState(false);
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
  const [selectedNischenDetails, setSelectedNischenDetails] = useState<NischenDetails | null>(null);
  const [nischenDetailsMap, setNischenDetailsMap] = useState<Record<string, NischenDetails>>({});
  const [showHidden, setShowHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isStatusReorderOpen, setIsStatusReorderOpen] = useState(false);
  const [statusOrder, setStatusOrder] = useState(getStatusOrder());
  const [newStatusName, setNewStatusName] = useState("");
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
      .select("*")
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
    
    // Create a map for nischen details
    const detailsMap: Record<string, NischenDetails> = {};
    data.forEach(item => {
      detailsMap[item.nische] = item;
    });
    setNischenDetailsMap(detailsMap);
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Kopiert",
        description: "Telefonnummer wurde in die Zwischenablage kopiert",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Telefonnummer konnte nicht kopiert werden",
        variant: "destructive",
      });
    }
  };

  const handleContactClick = (phoneNumber: string) => {
    copyToClipboard(phoneNumber);
  };

  const handleNischenDetailClick = (nische: string) => {
    const details = nischenDetailsMap[nische];
    if (details) {
      setSelectedNischenDetails(details);
      setIsNischenDetailOpen(true);
    }
  };

  const viewBestandsliste = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("bestandslisten")
        .createSignedUrl(path, 3600);

      if (error || !data) {
        toast({
          title: "Fehler",
          description: "Bestandsliste konnte nicht geladen werden",
          variant: "destructive",
        });
        return;
      }

      setPdfUrl(data.signedUrl);
      setIsPdfViewerOpen(true);
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Bestandsliste konnte nicht geladen werden",
        variant: "destructive",
      });
    }
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

  const saveStatusOrder = (newOrder: string[]) => {
    localStorage.setItem('statusOrder', JSON.stringify(newOrder));
    setStatusOrder(newOrder);
    fetchInteressenten(); // Refresh to apply new sorting
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = [...statusOrder];
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    saveStatusOrder(items);
  };

  const addNewStatus = () => {
    if (!newStatusName.trim()) return;
    
    const trimmedName = newStatusName.trim();
    
    // Check for duplicates (case-insensitive)
    if (statusOrder.some(status => status.toLowerCase() === trimmedName.toLowerCase())) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Dieser Status existiert bereits.",
      });
      return;
    }
    
    // Check for reserved names
    const reservedNames = ["neu", "kontakt", "verhandlung", "abgeschlossen", "kein interesse"];
    if (reservedNames.includes(trimmedName.toLowerCase())) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Dieser Status-Name ist reserviert.",
      });
      return;
    }
    
    const newOrder = [...statusOrder, trimmedName];
    saveStatusOrder(newOrder);
    setNewStatusName("");
    
    toast({
      title: "Erfolg",
      description: `Status "${trimmedName}" wurde hinzugefügt.`,
    });
  };

  const deleteStatus = (statusToDelete: string) => {
    // Check if status is in use
    const usageCount = interessenten.filter(i => i.status === statusToDelete).length;
    
    if (usageCount > 0) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Dieser Status wird von ${usageCount} Interessent${usageCount > 1 ? 'en' : ''} verwendet und kann nicht gelöscht werden.`,
      });
      return;
    }
    
    const newOrder = statusOrder.filter(status => status !== statusToDelete);
    saveStatusOrder(newOrder);
    
    toast({
      title: "Erfolg",
      description: `Status "${statusToDelete}" wurde gelöscht.`,
    });
  };

  const getStatusUsageCount = (status: string) => {
    return interessenten.filter(i => i.status === status).length;
  };

  const getSortedInteressenten = () => {
    const filtered = showHidden 
      ? interessenten 
      : interessenten.filter(i => i.status !== "Kein Interesse");

    const statusOrderMap = getStatusOrderMap();

    return filtered.sort((a, b) => {
      // Call notwendig has highest priority
      if (a.call_notwendig === "Call notwendig" && b.call_notwendig !== "Call notwendig") return -1;
      if (b.call_notwendig === "Call notwendig" && a.call_notwendig !== "Call notwendig") return 1;

      // Then by status order
      const statusA = statusOrderMap[a.status] || 999;
      const statusB = statusOrderMap[b.status] || 999;
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
                    <button 
                      className="text-sm text-muted-foreground hover:text-primary hover:underline cursor-pointer text-left"
                      onClick={() => handleContactClick(interessent.telefonnummer)}
                      title="Klicken zum Kopieren"
                    >
                      {interessent.telefonnummer}
                    </button>
                    {interessent.mobilfunknummer && (
                      <button 
                        className="text-sm text-muted-foreground hover:text-primary hover:underline cursor-pointer text-left block"
                        onClick={() => handleContactClick(interessent.mobilfunknummer)}
                        title="Klicken zum Kopieren"
                      >
                        {interessent.mobilfunknummer}
                      </button>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span>{interessent.nische}</span>
                    {nischenDetailsMap[interessent.nische] && (
                      <button
                        onClick={() => handleNischenDetailClick(interessent.nische)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </TableCell>
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
                                   className="absolute top-1 right-1 w-8 h-8 bg-background/80 rounded-full flex items-center justify-center hover:bg-background transition-colors"
                                   onClick={(e) => e.stopPropagation()}
                                 >
                                   <Info className="w-6 h-6 text-muted-foreground" />
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
                       className="h-8 px-2"
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
                           {call.typ.replace("Mailbox", "MB")} {index + 1}
                         </Button>
                         <TooltipProvider>
                           <Tooltip>
                             <TooltipTrigger asChild>
                                 <button
                                   className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center hover:bg-muted rounded-sm transition-colors"
                                   onClick={(e) => e.stopPropagation()}
                                 >
                                   <Info className="w-4 h-4 text-muted-foreground" />
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
                      <div key={notiz.id} className="relative inline-block">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 pr-6 text-xs"
                          onClick={() => {
                            setViewNotiz(notiz);
                            setIsNotizViewerOpen(true);
                          }}
                        >
                          Notiz {index + 1}
                        </Button>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center hover:bg-muted rounded-sm transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Info className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Hinzugefügt am {format(new Date(notiz.created_at), "dd.MM.yyyy, HH:mm", { locale: de })}</p>
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
                      {getStatusOptions().map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                      <div className="border-t p-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-primary border-primary hover:bg-primary hover:text-primary-foreground"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsStatusReorderOpen(true);
                          }}
                        >
                          <Settings className="w-3 h-3 mr-1" />
                          Reihenfolge ändern
                        </Button>
                      </div>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="px-2 py-2">
                  <div className="relative">
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
                      <div className="absolute top-9 left-0 right-0 text-xs text-muted-foreground bg-background border rounded p-1 z-10">
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
          {viewImageUrl && currentViewingScreenshot && (
            <div className="w-full space-y-3">
              <img src={viewImageUrl} alt="Email Screenshot" className="max-w-full h-auto" />
              <div className="text-sm text-muted-foreground text-center">
                Hinzugefügt am {format(new Date(currentViewingScreenshot.created_at), "dd.MM.yyyy, HH:mm", { locale: de })}
              </div>
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

      {/* Nischen Detail Dialog */}
      <Dialog open={isNischenDetailOpen} onOpenChange={setIsNischenDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nischen Details</DialogTitle>
          </DialogHeader>
          {selectedNischenDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Nische:</strong>
                  <div>{selectedNischenDetails.nische}</div>
                </div>
                {selectedNischenDetails.insolventes_unternehmen && (
                  <div>
                    <strong>Insolventes Unternehmen:</strong>
                    <div>{selectedNischenDetails.insolventes_unternehmen}</div>
                  </div>
                )}
                {selectedNischenDetails.kanzlei && (
                  <div>
                    <strong>Kanzlei:</strong>
                    <div>{selectedNischenDetails.kanzlei}</div>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Dateien & Links</h4>
                
                {selectedNischenDetails.bestandsliste_path && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewBestandsliste(selectedNischenDetails.bestandsliste_path!)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Bestandsliste ansehen
                    </Button>
                  </div>
                )}
                
                {selectedNischenDetails.pkw_dropbox_url && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedNischenDetails.pkw_dropbox_url, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      PKW Dropbox Link
                    </Button>
                  </div>
                )}
                
                {selectedNischenDetails.transporter_dropbox_url && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedNischenDetails.transporter_dropbox_url, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Transporter Dropbox Link
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Dialog */}
      <Dialog open={isPdfViewerOpen} onOpenChange={setIsPdfViewerOpen}>
        <DialogContent className="max-w-5xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Bestandsliste</DialogTitle>
          </DialogHeader>
          {pdfUrl && (
            <div className="w-full h-full">
              <iframe 
                src={pdfUrl} 
                className="w-full h-full rounded border"
                title="Bestandsliste PDF"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Reorder Dialog */}
      <Dialog open={isStatusReorderOpen} onOpenChange={setIsStatusReorderOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Status-Reihenfolge ändern</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ziehen Sie die Status-Einträge, um die Reihenfolge zu ändern:
            </p>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="status-list">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {statusOrder.map((status, index) => {
                      const usageCount = getStatusUsageCount(status);
                      const canDelete = usageCount === 0;
                      
                      return (
                        <Draggable key={status} draggableId={status} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center gap-2 p-3 border rounded-md bg-background ${
                                snapshot.isDragging ? 'shadow-lg border-primary' : ''
                              }`}
                            >
                              <div 
                                {...provided.dragHandleProps}
                                className="cursor-move"
                              >
                                <GripVertical className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <span className="font-medium flex-1">{status}</span>
                              {usageCount > 0 && (
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                  {usageCount}
                                </span>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 w-8 p-0 ${!canDelete ? 'opacity-50 cursor-not-allowed' : 'hover:bg-destructive hover:text-destructive-foreground'}`}
                                onClick={() => canDelete && deleteStatus(status)}
                                disabled={!canDelete}
                                title={canDelete ? `Status "${status}" löschen` : `Status wird von ${usageCount} Interessent${usageCount > 1 ? 'en' : ''} verwendet`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            
            {/* Add new status section */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Neuen Status hinzufügen:</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Status-Name eingeben..."
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addNewStatus();
                    }
                  }}
                  className="flex-1"
                />
                <Button 
                  onClick={addNewStatus}
                  disabled={!newStatusName.trim()}
                  variant="default"
                >
                  Hinzufügen
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsStatusReorderOpen(false)}>
                Schließen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}