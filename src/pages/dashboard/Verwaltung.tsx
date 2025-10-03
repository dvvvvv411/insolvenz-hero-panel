// Verwaltung Component - Manage Interessenten
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PageMeta } from "@/components/PageMeta";
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
import { Plus, Phone, PhoneOff, PhoneMissed, Mail, FileText, Eye, Trash2, Info, ExternalLink, Download, Copy, GripVertical, Settings, X, Edit, Search, Activity, MessageSquare, PhoneCall, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { fetchUserStatusSettings, updateStatusSettings, deleteStatus as deleteStatusFromDB, migrateAllUserStatusData, reorderStatuses, addNewStatus, type StatusSetting } from "@/lib/statusColors";

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
  updated_at: string;
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

interface Aktivitaet {
  id: string;
  interessent_id: string;
  aktivitaets_typ: string;
  alter_wert?: string;
  neuer_wert?: string;
  beschreibung: string;
  created_at: string;
  user_email?: string;
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

// Legacy localStorage functions - now handled by database
const getStatusColors = () => {
  console.warn('getStatusColors() is deprecated, use fetchStatusColors() instead');
  return {};
};

// Get contrasting text color (white or black) based on background
const getContrastingTextColor = (hexColor: string): string => {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white for dark colors, black for light colors
  return luminance > 0.5 ? '#000000' : '#ffffff';
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
  "Nicht erreicht",
  "Call erledigt"
];

export default function Verwaltung() {
  const [interessenten, setInteressenten] = useState<Interessent[]>([]);
  const [nischen, setNischen] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [isNotizDialogOpen, setIsNotizDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isCallGrundDialogOpen, setIsCallGrundDialogOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [detailsImageViewUrl, setDetailsImageViewUrl] = useState<string | null>(null);
  const [detailsImageViewDialogOpen, setDetailsImageViewDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [editingCallNotwendig, setEditingCallNotwendig] = useState<string | null>(null);
  const [editingCallGrund, setEditingCallGrund] = useState("");
  const [isCallViewerOpen, setIsCallViewerOpen] = useState(false);
  const [isNotizViewerOpen, setIsNotizViewerOpen] = useState(false);
  const [isNischenDetailOpen, setIsNischenDetailOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedInteressent, setSelectedInteressent] = useState<Interessent | null>(null);
  const [selectedInteressentForEdit, setSelectedInteressentForEdit] = useState<Interessent | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [isUrlUploadLoading, setIsUrlUploadLoading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<"file" | "url">("url");
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isStatusReorderOpen, setIsStatusReorderOpen] = useState(false);
  const [statusSettings, setStatusSettings] = useState<StatusSetting[]>([]);
  const [newStatusName, setNewStatusName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [aktivitaeten, setAktivitaeten] = useState<Aktivitaet[]>([]);
  const [isActivityLogCollapsed, setIsActivityLogCollapsed] = useState(false);
  const [unreadNotizIds, setUnreadNotizIds] = useState<Set<string>>(new Set());
  const [unreadCallIds, setUnreadCallIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Dynamic niches for Mark Steh (all except "Metall")
  const markStehNischen = useMemo(() => 
    nischen
      .filter(n => n !== "Metall")
      .join(", "),
    [nischen]
  );

  // Helper functions for status settings
  const getStatusColor = (status: string): string => {
    const setting = statusSettings.find(s => s.status === status);
    return setting?.color || '#6b7280';
  };

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

  const editForm = useForm<FormData>({
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

  const fetchNischen = async (user: any) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("nischen")
      .select("*")
      .eq("user_id", user.id);

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

  const fetchInteressenten = async (user: any) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("interessenten")
      .select("*")
      .eq("user_id", user.id)
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
    await fetchAllVerlauf(user, data || []);
  };

  const fetchAllVerlauf = async (user: any, interessentenList: Interessent[]) => {
    if (!user) return;

    // Parallelize all data fetching
    const [emailData, callData, notizenData] = await Promise.all([
      supabase
        .from("interessenten_email_verlauf")
        .select("*")
        .eq("user_id", user.id)
        .then(({ data }) => data),
      supabase
        .from("interessenten_calls")
        .select("*")
        .eq("user_id", user.id)
        .then(({ data }) => data),
      supabase
        .from("interessenten_notizen")
        .select("*")
        .eq("user_id", user.id)
        .then(({ data }) => data)
    ]);

    // Process email data
    const emailMap: Record<string, EmailVerlauf[]> = {};
    emailData?.forEach(item => {
      if (!emailMap[item.interessent_id]) emailMap[item.interessent_id] = [];
      emailMap[item.interessent_id].push(item);
    });
    setEmailVerlauf(emailMap);

    // Process call data
    const callMap: Record<string, CallVerlauf[]> = {};
    callData?.forEach(item => {
      if (!callMap[item.interessent_id]) callMap[item.interessent_id] = [];
      callMap[item.interessent_id].push(item);
    });
    setCallVerlauf(callMap);

    // Process notizen data
    const notizenMap: Record<string, Notiz[]> = {};
    notizenData?.forEach(item => {
      if (!notizenMap[item.interessent_id]) notizenMap[item.interessent_id] = [];
      notizenMap[item.interessent_id].push(item);
    });
    setNotizenVerlauf(notizenMap);

    // Generate thumbnail URLs in background (non-blocking)
    if (emailData) {
      setTimeout(() => {
        generateThumbnailUrls(emailData);
      }, 0);
    }
  };

  const generateThumbnailUrls = async (emailData: any[]) => {
    const thumbnails: Record<string, string> = {};
    
    // Process thumbnails in parallel batches
    const batchSize = 5;
    for (let i = 0; i < emailData.length; i += batchSize) {
      const batch = emailData.slice(i, i + batchSize);
      const promises = batch.map(async (item) => {
        try {
          const { data } = await supabase.storage
            .from("email-screenshots")
            .createSignedUrl(item.screenshot_path, 600);
          if (data) {
            return { id: item.id, url: data.signedUrl };
          }
        } catch (error) {
          console.error('Error creating thumbnail URL:', error);
        }
        return null;
      });

      const results = await Promise.all(promises);
      results.forEach(result => {
        if (result) {
          thumbnails[result.id] = result.url;
        }
      });

      // Update thumbnails progressively
      setThumbnailUrls(prev => ({ ...prev, ...thumbnails }));
    }
  };

  const loadUnreadItems = async (userId: string) => {
    const { data: notizen } = await supabase
      .from('unread_items')
      .select('item_id')
      .eq('user_id', userId)
      .eq('item_type', 'notiz');
    
    const { data: calls } = await supabase
      .from('unread_items')
      .select('item_id')
      .eq('user_id', userId)
      .eq('item_type', 'call');
    
    setUnreadNotizIds(new Set(notizen?.map(n => n.item_id) || []));
    setUnreadCallIds(new Set(calls?.map(c => c.item_id) || []));
  };

  const markNotizAsRead = async (notizId: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    
    await supabase
      .from('unread_items')
      .delete()
      .eq('user_id', user.user.id)
      .eq('item_id', notizId)
      .eq('item_type', 'notiz');
    
    setUnreadNotizIds(prev => {
      const next = new Set(prev);
      next.delete(notizId);
      return next;
    });
  };

  const markCallAsRead = async (callId: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    
    await supabase
      .from('unread_items')
      .delete()
      .eq('user_id', user.user.id)
      .eq('item_id', callId)
      .eq('item_type', 'call');
    
    setUnreadCallIds(prev => {
      const next = new Set(prev);
      next.delete(callId);
      return next;
    });
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
    fetchInteressenten(currentUser);
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

      // Log activity
      await logActivity(selectedInteressent.id, "email_screenshot", "Email-Screenshot hinzugefügt");

      toast({
        title: "Erfolg",
        description: "Email-Screenshot wurde hinzugefügt",
      });

      setIsEmailDialogOpen(false);
      setSelectedFile(null);
      fetchInteressenten(currentUser);
      loadAktivitaeten(currentUser);
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

      // Log activity
      await logActivity(selectedInteressent.id, "email_screenshot", "Email-Screenshot von URL hinzugefügt");

      toast({
        title: "Erfolg",
        description: "Screenshot wurde von URL gespeichert",
      });

      setIsEmailDialogOpen(false);
      setScreenshotUrl("");
      fetchInteressenten(currentUser);
      loadAktivitaeten(currentUser);

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

  const logActivity = async (
    interessentId: string,
    typ: string,
    beschreibung: string,
    alterWert?: string,
    neuerWert?: string
  ) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    await supabase
      .from("interessenten_aktivitaeten")
      .insert({
        interessent_id: interessentId,
        user_id: user.user.id,
        aktivitaets_typ: typ,
        alter_wert: alterWert,
        neuer_wert: neuerWert,
        beschreibung: beschreibung,
      });
  };

  const addCall = async (typ: string) => {
    if (!selectedInteressent) return;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data: insertedCall, error } = await supabase
      .from("interessenten_calls")
      .insert({
        interessent_id: selectedInteressent.id,
        user_id: user.user.id,
        typ,
        notiz: typ === "Call" ? callNotiz : null,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Fehler",
        description: "Call konnte nicht hinzugefügt werden",
        variant: "destructive",
      });
      return;
    }

    // Log activity
    const notizPreview = callNotiz ? (callNotiz.length > 50 ? callNotiz.substring(0, 50) + "..." : callNotiz) : "";
    const beschreibung = typ === "Call" 
      ? `Call-Notiz hinzugefügt${notizPreview ? ": " + notizPreview : ""}`
      : `${typ} hinzugefügt`;
    await logActivity(selectedInteressent.id, "call_notiz", beschreibung);

    // Mark as unread for current user
    if (insertedCall) {
      await supabase
        .from('unread_items')
        .insert({
          user_id: user.user.id,
          item_id: insertedCall.id,
          item_type: 'call',
          interessent_id: selectedInteressent.id
        });
      
      setUnreadCallIds(prev => new Set(prev).add(insertedCall.id));
    }

    toast({
      title: "Erfolg",
      description: `${typ} wurde hinzugefügt`,
    });

    setIsCallDialogOpen(false);
    setCallNotiz("");
    fetchInteressenten(currentUser);
    loadAktivitaeten(currentUser);
  };

  const addNotiz = async () => {
    if (!selectedInteressent || !notizText.trim()) return;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data: insertedNotiz, error } = await supabase
      .from("interessenten_notizen")
      .insert({
        interessent_id: selectedInteressent.id,
        user_id: user.user.id,
        notiz: notizText,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Fehler",
        description: "Notiz konnte nicht hinzugefügt werden",
        variant: "destructive",
      });
      return;
    }

    // Log activity
    const notizPreview = notizText.length > 50 ? notizText.substring(0, 50) + "..." : notizText;
    await logActivity(selectedInteressent.id, "notiz", `Notiz hinzugefügt: ${notizPreview}`);

    // Mark as unread for current user
    if (insertedNotiz) {
      await supabase
        .from('unread_items')
        .insert({
          user_id: user.user.id,
          item_id: insertedNotiz.id,
          item_type: 'notiz',
          interessent_id: selectedInteressent.id
        });
      
      setUnreadNotizIds(prev => new Set(prev).add(insertedNotiz.id));
    }

    toast({
      title: "Erfolg",
      description: "Notiz wurde hinzugefügt",
    });

    setIsNotizDialogOpen(false);
    setNotizText("");
    fetchInteressenten(currentUser);
    loadAktivitaeten(currentUser);
  };

  const updateStatus = async (interessentId: string, newStatus: string) => {
    const now = new Date().toISOString();
    
    // Get old status for logging
    const oldInteressent = interessenten.find(i => i.id === interessentId);
    const oldStatus = oldInteressent?.status;
    
    // Optimistic update - update UI immediately
    setInteressenten(prev => 
      prev.map(interessent => 
        interessent.id === interessentId 
          ? { ...interessent, status: newStatus, updated_at: now }
          : interessent
      )
    );

    // Update database in background
    try {
      const { error } = await supabase
        .from("interessenten")
        .update({ status: newStatus, updated_at: now })
        .eq("id", interessentId);

      if (error) {
        // Revert optimistic update on error
        setInteressenten(prev => 
          prev.map(interessent => 
            interessent.id === interessentId 
              ? { ...interessent, status: interessenten.find(i => i.id === interessentId)?.status || interessent.status }
              : interessent
          )
        );
        
        toast({
          title: "Fehler",
          description: "Status konnte nicht aktualisiert werden",
          variant: "destructive",
        });
      } else {
        // Log activity
        await logActivity(
          interessentId,
          "status_aenderung",
          `Status von "${oldStatus}" zu "${newStatus}" geändert`,
          oldStatus,
          newStatus
        );
        loadAktivitaeten(currentUser);
      }
    } catch (error) {
      // Revert optimistic update on error
      setInteressenten(prev => 
        prev.map(interessent => 
          interessent.id === interessentId 
            ? { ...interessent, status: interessenten.find(i => i.id === interessentId)?.status || interessent.status }
            : interessent
        )
      );
      
      toast({
        title: "Fehler",
        description: "Status konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    }
  };

  const updateCallNotwendig = async (interessentId: string, callStatus: string, grund?: string) => {
    // Get old status for logging
    const oldInteressent = interessenten.find(i => i.id === interessentId);
    const oldCallStatus = oldInteressent?.call_notwendig;
    
    // Optimistic update - update UI immediately
    setInteressenten(prev => 
      prev.map(interessent => 
        interessent.id === interessentId 
          ? { ...interessent, call_notwendig: callStatus, call_notwendig_grund: grund }
          : interessent
      )
    );

    // Update database in background
    try {
      const { error } = await supabase
        .from("interessenten")
        .update({ 
          call_notwendig: callStatus,
          call_notwendig_grund: grund
        })
        .eq("id", interessentId);

      if (error) {
        // Revert optimistic update on error
        const originalInteressent = interessenten.find(i => i.id === interessentId);
        setInteressenten(prev => 
          prev.map(interessent => 
            interessent.id === interessentId 
              ? { 
                  ...interessent, 
                  call_notwendig: originalInteressent?.call_notwendig || interessent.call_notwendig,
                  call_notwendig_grund: originalInteressent?.call_notwendig_grund || interessent.call_notwendig_grund
                }
              : interessent
          )
        );
        
        toast({
          title: "Fehler",
          description: "Call-Status konnte nicht aktualisiert werden",
          variant: "destructive",
        });
        return;
      }

      // Log activity
      const beschreibung = grund 
        ? `Call-Status von "${oldCallStatus}" zu "${callStatus}" geändert (Grund: ${grund})`
        : `Call-Status von "${oldCallStatus}" zu "${callStatus}" geändert`;
      await logActivity(
        interessentId,
        "call_notwendig_aenderung",
        beschreibung,
        oldCallStatus,
        callStatus
      );

      setIsCallGrundDialogOpen(false);
      setCallGrund("");
      loadAktivitaeten(currentUser);
    } catch (error) {
      // Revert optimistic update on error
      const originalInteressent = interessenten.find(i => i.id === interessentId);
      setInteressenten(prev => 
        prev.map(interessent => 
          interessent.id === interessentId 
            ? { 
                ...interessent, 
                call_notwendig: originalInteressent?.call_notwendig || interessent.call_notwendig,
                call_notwendig_grund: originalInteressent?.call_notwendig_grund || interessent.call_notwendig_grund
              }
            : interessent
        )
      );
      
      toast({
        title: "Fehler",
        description: "Call-Status konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (interessent: Interessent) => {
    setSelectedInteressentForEdit(interessent);
    editForm.reset({
      unternehmensname: interessent.unternehmensname,
      ansprechpartner: interessent.ansprechpartner,
      email: interessent.email,
      telefonnummer: interessent.telefonnummer,
      mobilfunknummer: interessent.mobilfunknummer || "",
      nische: interessent.nische,
    });
    setIsEditDialogOpen(true);
  };

  const onSubmitEdit = async (data: FormData) => {
    if (!selectedInteressentForEdit || !currentUser) return;

    // Optimistic update - update UI immediately
    setInteressenten(prev => 
      prev.map(interessent => 
        interessent.id === selectedInteressentForEdit.id 
          ? { ...interessent, ...data }
          : interessent
      )
    );

    // Update database in background
    try {
      const { error } = await supabase
        .from("interessenten")
        .update({
          unternehmensname: data.unternehmensname,
          ansprechpartner: data.ansprechpartner,
          email: data.email,
          telefonnummer: data.telefonnummer,
          mobilfunknummer: data.mobilfunknummer || null,
          nische: data.nische,
        })
        .eq("id", selectedInteressentForEdit.id);

      if (error) {
        // Revert optimistic update on error
        setInteressenten(prev => 
          prev.map(interessent => 
            interessent.id === selectedInteressentForEdit.id 
              ? selectedInteressentForEdit
              : interessent
          )
        );
        
        toast({
          title: "Fehler",
          description: "Interessent konnte nicht aktualisiert werden",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Erfolg",
        description: "Interessent wurde erfolgreich aktualisiert",
      });

      setIsEditDialogOpen(false);
      setSelectedInteressentForEdit(null);
      editForm.reset();
    } catch (error) {
      // Revert optimistic update on error
      setInteressenten(prev => 
        prev.map(interessent => 
          interessent.id === selectedInteressentForEdit.id 
            ? selectedInteressentForEdit
            : interessent
        )
      );
      
      toast({
        title: "Fehler",
        description: "Interessent konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    }
  };

  const viewEmailScreenshot = async (screenshot: EmailVerlauf, inDetailsDialog = false) => {
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

    setCurrentViewingScreenshot(screenshot);
    
    if (inDetailsDialog) {
      setDetailsImageViewUrl(data.signedUrl);
      setDetailsImageViewDialogOpen(true);
    } else {
      setViewImageUrl(data.signedUrl);
      setIsImageViewerOpen(true);
    }
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
    fetchInteressenten(currentUser);
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const currentOrder = statusSettings.map(s => s.status);
    const items = [...currentOrder];
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    await reorderStatuses(items);
    await loadStatusSettings(); // Reload to reflect changes
    fetchInteressenten(currentUser); // Refresh to apply new sorting
  };

  const handleAddNewStatus = async () => {
    if (!newStatusName.trim()) return;
    
    const trimmedName = newStatusName.trim();
    
    // Check for duplicates (case-insensitive)
    if (statusSettings.some(s => s.status.toLowerCase() === trimmedName.toLowerCase())) {
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
    
    const success = await addNewStatus(trimmedName);
    if (success) {
      await loadStatusSettings(); // Reload to reflect changes
      setNewStatusName("");
      
      toast({
        title: "Erfolg",
        description: `Status "${trimmedName}" wurde hinzugefügt.`,
      });
    }
  };

  const handleDeleteStatus = async (statusToDelete: string) => {
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
    
    const success = await deleteStatusFromDB(statusToDelete);
    if (success) {
      await loadStatusSettings(); // Reload to reflect changes
      
      toast({
        title: "Erfolg",
        description: `Status "${statusToDelete}" wurde gelöscht.`,
      });
    }
  };

  const getStatusUsageCount = (status: string) => {
    return interessenten.filter(i => i.status === status).length;
  };

  const getSortedInteressenten = () => {
    const filtered = showHidden 
      ? interessenten.filter(i => i.status === "Kein Interesse")
      : interessenten.filter(i => i.status !== "Kein Interesse");

    const statusOrderMap = getStatusOrderMap();

    return filtered.sort((a, b) => {
      // Priorität: Call notwendig > Nicht erreicht > Rest
      const callPriority: Record<string, number> = {
        "Call notwendig": 0,
        "Nicht erreicht": 1,
        "Kein Call notwendig": 2,
        "Call erledigt": 2
      };

      const priorityA = callPriority[a.call_notwendig] ?? 3;
      const priorityB = callPriority[b.call_notwendig] ?? 3;
      if (priorityA !== priorityB) return priorityA - priorityB;

      // Then by status order
      const statusA = statusOrderMap[a.status] || 999;
      const statusB = statusOrderMap[b.status] || 999;
      if (statusA !== statusB) return statusA - statusB;

      // Finally by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const getFilteredInteressenten = () => {
    const sorted = getSortedInteressenten();
    
    if (!searchTerm.trim()) {
      return sorted;
    }

    const term = searchTerm.toLowerCase();
    return sorted.filter(interessent => 
      interessent.unternehmensname.toLowerCase().includes(term) ||
      interessent.ansprechpartner.toLowerCase().includes(term) ||
      interessent.email.toLowerCase().includes(term) ||
      interessent.telefonnummer.toLowerCase().includes(term) ||
      (interessent.mobilfunknummer?.toLowerCase().includes(term))
    );
  };

  const loadAktivitaeten = async (user: any) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("interessenten_aktivitaeten")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Fehler beim Laden der Aktivitäten:", error);
      return;
    }

    // Add user email to each activity (since RLS filters to current user, all activities are from current user)
    const aktivitaetenWithEmails = (data || []).map(aktivitaet => ({
      ...aktivitaet,
      user_email: user.email
    }));

    // Filter out "Email-Screenshot von URL hinzugefügt" messages
    const filteredAktivitaeten = aktivitaetenWithEmails.filter(
      aktivitaet => aktivitaet.beschreibung !== "Email-Screenshot von URL hinzugefügt"
    );
    setAktivitaeten(filteredAktivitaeten);
  };

  const getActivityIcon = (typ: string, beschreibung?: string) => {
    // Check for call status changes based on description
    if (typ === "call_notwendig_aenderung" && beschreibung) {
      if (beschreibung.includes("Call notwendig")) {
        return <Phone className="w-6 h-6 text-orange-500" />;
      } else if (beschreibung.includes("Nicht erreicht")) {
        return <PhoneMissed className="w-6 h-6 text-amber-500" />;
      } else if (beschreibung.includes("Call erledigt")) {
        return <Phone className="w-6 h-6 text-green-500" />;
      } else if (beschreibung.includes("Kein Call notwendig")) {
        return <PhoneOff className="w-6 h-6 text-gray-500" />;
      }
    }

    switch (typ) {
      case "status_aenderung":
        return <Activity className="w-6 h-6 text-blue-500" />;
      case "call_notwendig_aenderung":
        return <Phone className="w-6 h-6 text-orange-500" />;
      case "call_notiz":
        return <PhoneCall className="w-6 h-6 text-green-500" />;
      case "notiz":
        return <MessageSquare className="w-6 h-6 text-purple-500" />;
      case "email_screenshot":
        return <Mail className="w-6 h-6 text-cyan-500" />;
      default:
        return <Activity className="w-6 h-6 text-gray-500" />;
    }
  };

  const getInteressentName = (interessentId: string) => {
    const interessent = interessenten.find(i => i.id === interessentId);
    return interessent?.unternehmensname || "Unbekannt";
  };

  const getInteressentAnsprechpartner = (interessentId: string) => {
    const interessent = interessenten.find(i => i.id === interessentId);
    return interessent?.ansprechpartner || "Unbekannt";
  };

  const handleUnternehmensnameClick = (unternehmensname: string) => {
    setSearchTerm(unternehmensname);
    // Scroll to search field
    const searchInput = document.querySelector('input[placeholder*="Kontaktdaten"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      searchInput.focus();
    }
  };

  const handleAnsprechpartnerClick = (ansprechpartner: string) => {
    setSearchTerm(ansprechpartner);
    // Scroll to search field
    const searchInput = document.querySelector('input[placeholder*="Kontaktdaten"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      searchInput.focus();
    }
  };

  const getUsernameFromEmail = (email?: string): string => {
    if (!email) return "unknown";
    return email.split("@")[0];
  };

  const getUserColor = (email?: string): string => {
    const username = getUsernameFromEmail(email);
    return username === "admin" ? "text-red-400" : "text-cyan-400";
  };

  const handleRefresh = async () => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) return;
    
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchInteressenten(currentUser),
        loadAktivitaeten(currentUser),
        fetchNischen(currentUser),
        loadStatusSettings(),
      ]);
      
      toast({
        title: "Aktualisiert",
        description: "Alle Daten wurden erfolgreich aktualisiert",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Fehler",
        description: "Daten konnten nicht aktualisiert werden",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadStatusSettings = async () => {
    try {
      // First run migration to move any existing data to the new system
      await migrateAllUserStatusData();
      
      // Then load the unified status settings
      const settings = await fetchUserStatusSettings();
      setStatusSettings(settings);
    } catch (error) {
      console.error('Error loading status settings:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      // Get user once at the beginning
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setLoading(false);
        return;
      }
      
      setCurrentUser(user.user);
      
      // Parallelize data fetching
      await Promise.all([
        fetchNischen(user.user), 
        fetchInteressenten(user.user),
        loadStatusSettings(),
        loadAktivitaeten(user.user),
        loadUnreadItems(user.user.id)
      ]);
      
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <PageMeta 
        title="Verwaltung – Insolvenzverwaltung Dashboard"
        description="Professionelle Verwaltung von Interessenten und Kunden in der Insolvenzabwicklung. Effiziente Kontaktverwaltung und Kommunikationstools."
      />
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

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Interessent bearbeiten</DialogTitle>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
                  <FormField
                    control={editForm.control}
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
                    control={editForm.control}
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
                    control={editForm.control}
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
                    control={editForm.control}
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
                    control={editForm.control}
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
                    control={editForm.control}
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
                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button type="submit">Speichern</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lawyer Profiles Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {/* Dr. Torsten Alexander Küpper Card */}
        <Card className="bg-white border-gray-300 shadow-sm">
          <CardHeader className="border-b border-gray-200 pb-2">
            <CardTitle className="text-lg text-gray-900 font-black">Dr. Torsten Alexander Küpper</CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-2">
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-cyan-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-600 mb-1 font-semibold">E-Mail</p>
                <p className="text-sm text-gray-900 font-mono font-medium">t.kuepper@kbs-kanzlei.de</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-600 mb-1 font-semibold">Nische</p>
                <p className="text-sm text-gray-900 font-medium">Metall</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-600 mb-1 font-semibold">Insolventes Unternehmen</p>
                <p className="text-base text-gray-900 font-bold">Marina Technik GmbH</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mark Steh Card */}
        <Card className="bg-white border-gray-300 shadow-sm">
          <CardHeader className="border-b border-gray-200 pb-2">
            <CardTitle className="text-lg text-gray-900 font-black">Mark Steh</CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-2">
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-cyan-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-600 mb-1 font-semibold">E-Mail</p>
                <p className="text-sm text-gray-900 font-mono font-medium">m.steh@kbs-kanzlei.de</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-600 mb-1 font-semibold">Nischen</p>
                <p className="text-sm text-gray-900 font-medium">{markStehNischen || "Keine Nischen zugewiesen"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-600 mb-1 font-semibold">Insolventes Unternehmen</p>
                <p className="text-base text-gray-900 font-bold">TZ-West GmbH</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Log Card */}
      <Card className="mb-6 bg-gray-900 border-gray-700">
        <CardHeader className="pb-3 border-b border-gray-700">
          <div className="flex items-center justify-between w-full">
            <CardTitle className="text-lg flex items-center gap-2 text-gray-100">
              <Activity className="w-5 h-5" />
              Aktivitäts-Protokoll
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsActivityLogCollapsed(!isActivityLogCollapsed)}
              className="h-8 w-8 p-0"
            >
              {isActivityLogCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        {!isActivityLogCollapsed && (
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            {aktivitaeten.length === 0 ? (
              <div className="text-center text-gray-400 py-8 font-mono text-base">
                Noch keine Aktivitäten vorhanden
              </div>
            ) : (
              <div>
                {aktivitaeten.map((aktivitaet, index) => {
                  const ActivityIcon = getActivityIcon(aktivitaet.aktivitaets_typ, aktivitaet.beschreibung);
                  const interessentName = getInteressentName(aktivitaet.interessent_id);
                  const ansprechpartner = getInteressentAnsprechpartner(aktivitaet.interessent_id);
                  const timestamp = format(new Date(aktivitaet.created_at), "dd.MM.yyyy HH:mm", { locale: de });
                  const username = getUsernameFromEmail(aktivitaet.user_email);
                  const userColor = getUserColor(aktivitaet.user_email);
                  
                  const isCallNotiz = aktivitaet.beschreibung.includes("Call-Notiz hinzugefügt");
                  const isNormalNotiz = aktivitaet.beschreibung.includes("Notiz hinzugefügt") && !isCallNotiz;
                  
                  return (
                    <div 
                      key={aktivitaet.id} 
                      className={`grid grid-cols-[150px_100px_40px_200px_1fr_auto] gap-3 items-center px-4 py-4 font-mono text-base border-b hover:bg-gray-800/50 transition-colors ${
                        isCallNotiz 
                          ? 'bg-cyan-900/30 border-cyan-700' 
                          : isNormalNotiz
                            ? 'bg-purple-900/30 border-purple-700'
                            : `border-gray-800 ${index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-850'}`
                      }`}
                    >
                      <span className="text-gray-400 text-sm">{timestamp}</span>
                      <span className={`${userColor} text-sm font-semibold truncate`}>{username}</span>
                      <div className="flex justify-center">
                        {ActivityIcon}
                      </div>
                      <button
                        onClick={() => handleUnternehmensnameClick(interessentName)}
                        className="text-gray-200 font-medium truncate text-left hover:text-blue-400 hover:underline transition-colors cursor-pointer"
                        title="Klicken um zu suchen"
                      >
                        {interessentName}
                      </button>
                      <span className={isCallNotiz ? "text-cyan-400" : "text-gray-300"}>{aktivitaet.beschreibung}</span>
                      <button
                        onClick={() => handleAnsprechpartnerClick(ansprechpartner)}
                        className="text-gray-400 text-sm hover:text-blue-400 hover:underline transition-colors cursor-pointer whitespace-nowrap"
                        title="Klicken um zu suchen"
                      >
                        {ansprechpartner}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
        )}
      </Card>

      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Nach Kontaktdaten suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchTerm("")}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Daten aktualisieren"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
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
            {getFilteredInteressenten().map((interessent) => (
              <TableRow 
                key={interessent.id} 
                className={
                  interessent.call_notwendig === "Call notwendig" 
                    ? "bg-accent/50" 
                    : interessent.call_notwendig === "Nicht erreicht"
                    ? "bg-amber-100/50"
                    : ""
                }
              >
                <TableCell className="px-2 py-2">
                  <div className="space-y-1">
                    <div className="font-medium flex items-center gap-2">
                      {interessent.unternehmensname}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-accent"
                        onClick={() => openEditDialog(interessent)}
                        title="Interessent bearbeiten"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
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
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                        {callVerlauf[interessent.id]?.map((call, index) => {
                          const getCallTypeNumber = (currentCall: any, callList: any[], currentIndex: number) => {
                            return callList
                              .slice(0, currentIndex + 1)
                              .filter(c => c.typ === currentCall.typ)
                              .length;
                          };
                          
                          return (
                            <div key={call.id} className="relative inline-block">
                              <Button
                                variant="outline"
                                size="sm"
                                className={`h-8 px-2 pr-6 text-xs ${
                                  unreadCallIds.has(call.id) 
                                    ? 'bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-500' 
                                    : ''
                                }`}
                                onClick={() => {
                                  setViewCall(call);
                                  setIsCallViewerOpen(true);
                                  markCallAsRead(call.id);
                                }}
                              >
                                {call.typ.replace("Mailbox", "MB")} {getCallTypeNumber(call, callVerlauf[interessent.id], index)}
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
                          );
                        })}
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
                    {callVerlauf[interessent.id] && callVerlauf[interessent.id].length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Letzter Eintrag: {format(
                          new Date(Math.max(...callVerlauf[interessent.id].map(call => new Date(call.created_at).getTime()))), 
                          "dd.MM.yyyy, HH:mm", 
                          { locale: de }
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-2">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {notizenVerlauf[interessent.id]?.map((notiz, index) => (
                        <div key={notiz.id} className="relative inline-block">
                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-8 px-2 pr-6 text-xs ${
                              unreadNotizIds.has(notiz.id) 
                                ? 'bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-500' 
                                : ''
                            }`}
                            onClick={() => {
                              setViewNotiz(notiz);
                              setIsNotizViewerOpen(true);
                              markNotizAsRead(notiz.id);
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
                    {notizenVerlauf[interessent.id] && notizenVerlauf[interessent.id].length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Letzter Eintrag: {format(
                          new Date(Math.max(...notizenVerlauf[interessent.id].map(notiz => new Date(notiz.created_at).getTime()))), 
                          "dd.MM.yyyy, HH:mm", 
                          { locale: de }
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
                 <TableCell className="px-2 py-2">
                   <div className="space-y-1">
                     <Select
                       value={interessent.status}
                       onValueChange={(value) => updateStatus(interessent.id, value)}
                     >
                        <SelectTrigger 
                          className="h-8 text-xs"
                          style={{
                            backgroundColor: getStatusColor(interessent.status),
                            color: getContrastingTextColor(getStatusColor(interessent.status)),
                            borderColor: getStatusColor(interessent.status)
                          }}
                       >
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
                               // Colors are already loaded from database
                               setIsStatusReorderOpen(true);
                             }}
                          >
                            <Settings className="w-3 h-3 mr-1" />
                            Reihenfolge ändern
                          </Button>
                        </div>
                      </SelectContent>
                    </Select>
                    {interessent.updated_at !== interessent.created_at && (
                      <div className="text-xs text-muted-foreground">
                        Geändert: {format(new Date(interessent.updated_at), "dd.MM.yyyy, HH:mm", { locale: de })}
                      </div>
                    )}
                   </div>
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
                {isUrlUploadLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Wird gespeichert...
                  </div>
                ) : (
                  "Hochladen"
                )}
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
            <DialogTitle>Email-Screenshot</DialogTitle>
          </DialogHeader>
          {viewImageUrl && currentViewingScreenshot && (
            <div className="w-full space-y-3">
              <img src={viewImageUrl} alt="Email Screenshot" className="max-w-full h-auto" />
              <div className="text-sm text-muted-foreground text-center">
                Hinzugefügt am {format(new Date(currentViewingScreenshot.created_at), "dd.MM.yyyy, HH:mm", { locale: de })}
              </div>
              <div className="flex justify-end mt-4">
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
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Interessent Details - 360° Übersicht</DialogTitle>
          </DialogHeader>
          {selectedInteressent && (
            <div className="space-y-6">
              {/* Contact Information Section */}
              <div className="border rounded-lg p-4 bg-muted/20">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Kontaktinformationen
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Unternehmensname</Label>
                      <div className="text-base font-medium">{selectedInteressent.unternehmensname}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Ansprechpartner</Label>
                      <div className="text-base">{selectedInteressent.ansprechpartner}</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">E-Mail</Label>
                      <div className="flex items-center gap-2">
                        <a 
                          href={`mailto:${selectedInteressent.email}`}
                          className="text-base text-primary hover:underline"
                        >
                          {selectedInteressent.email}
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(selectedInteressent.email)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Telefonnummer</Label>
                        <div className="flex items-center gap-2">
                          <a 
                            href={`tel:${selectedInteressent.telefonnummer}`}
                            className="text-base text-primary hover:underline"
                          >
                            {selectedInteressent.telefonnummer}
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(selectedInteressent.telefonnummer)}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {selectedInteressent.mobilfunknummer && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Mobilfunknummer</Label>
                          <div className="flex items-center gap-2">
                            <a 
                              href={`tel:${selectedInteressent.mobilfunknummer}`}
                              className="text-base text-primary hover:underline"
                            >
                              {selectedInteressent.mobilfunknummer}
                            </a>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(selectedInteressent.mobilfunknummer!)}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status & Call Management Section */}
              <div className="border rounded-lg p-4 bg-muted/20">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Status & Verwaltung
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Nische</Label>
                      <div className="text-base">{selectedInteressent.nische}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <Select
                        value={editingStatus || selectedInteressent.status}
                        onValueChange={(value) => {
                          setEditingStatus(value);
                          updateStatus(selectedInteressent.id, value);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getStatusOptions().map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Call notwendig</Label>
                      <Select
                        value={editingCallNotwendig || selectedInteressent.call_notwendig}
                        onValueChange={async (value) => {
                          setEditingCallNotwendig(value);
                          
                          if (value === "Nicht erreicht") {
                            const { data: user } = await supabase.auth.getUser();
                            if (user.user) {
                              const { data: insertedCall } = await supabase
                                .from("interessenten_calls")
                                .insert({
                                  interessent_id: selectedInteressent.id,
                                  user_id: user.user.id,
                                  typ: "MB Meldung",
                                  notiz: "Automatisch hinzugefügt durch 'Nicht erreicht' Status"
                                })
                                .select()
                                .single();
                              
                              await logActivity(selectedInteressent.id, "call_notiz", "MB Meldung automatisch hinzugefügt (Nicht erreicht)");
                              
                              if (insertedCall) {
                                await supabase.from('unread_items').insert({
                                  user_id: user.user.id,
                                  item_id: insertedCall.id,
                                  item_type: 'call',
                                  interessent_id: selectedInteressent.id
                                });
                                
                                setUnreadCallIds(prev => new Set(prev).add(insertedCall.id));
                              }
                              
                              fetchInteressenten(user.user);
                              loadAktivitaeten(user.user);
                              
                              toast({ title: "MB Meldung hinzugefügt", description: "Automatisch durch 'Nicht erreicht' Status" });
                            }
                          }
                          
                          if (value === "Call notwendig") {
                            setEditingCallGrund(selectedInteressent.call_notwendig_grund || "");
                          } else {
                            updateCallNotwendig(selectedInteressent.id, value, "");
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
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
                    </div>
                    {(editingCallNotwendig === "Call notwendig" || selectedInteressent.call_notwendig === "Call notwendig") && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Grund für Call</Label>
                        <Textarea
                          value={editingCallGrund || selectedInteressent.call_notwendig_grund || ""}
                          onChange={(e) => setEditingCallGrund(e.target.value)}
                          onBlur={() => {
                            if (editingCallNotwendig === "Call notwendig") {
                              updateCallNotwendig(selectedInteressent.id, "Call notwendig", editingCallGrund);
                            }
                          }}
                          placeholder="Grund für Call eingeben..."
                          className="min-h-[60px]"
                        />
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Erstellt am</Label>
                      <div className="text-base">{format(new Date(selectedInteressent.created_at), "dd.MM.yyyy HH:mm", { locale: de })}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email History Section */}
              <div className="border rounded-lg p-4 bg-muted/20">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email-Verlauf ({emailVerlauf[selectedInteressent.id]?.length || 0})
                  </h3>
                  <Button
                    onClick={() => {
                      setIsEmailDialogOpen(true);
                    }}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Email hinzufügen
                  </Button>
                </div>
                {emailVerlauf[selectedInteressent.id]?.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {emailVerlauf[selectedInteressent.id].map((email) => {
                      const thumbnailUrl = thumbnailUrls[email.id];
                      return (
                        <div key={email.id} className="space-y-2">
                          <div 
                            className="relative group cursor-pointer border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                            onClick={() => viewEmailScreenshot(email, true)}
                          >
                            {thumbnailUrl ? (
                              <img 
                                src={thumbnailUrl} 
                                alt="Email Screenshot"
                                className="w-full h-32 object-cover"
                              />
                            ) : (
                              <div className="w-full h-32 bg-muted flex items-center justify-center">
                                <Mail className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="w-6 h-6 text-white" />
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground text-center">
                            {format(new Date(email.created_at), "dd.MM.yyyy", { locale: de })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Noch keine Email-Screenshots vorhanden</p>
                  </div>
                )}
              </div>

              {/* Call History Section */}
              <div className="border rounded-lg p-4 bg-muted/20">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Call-Verlauf ({callVerlauf[selectedInteressent.id]?.length || 0})
                  </h3>
                  <Button
                    onClick={() => {
                      setIsCallDialogOpen(true);
                    }}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Call hinzufügen
                  </Button>
                </div>
                {callVerlauf[selectedInteressent.id]?.length > 0 ? (
                  <div className="space-y-3">
                    {callVerlauf[selectedInteressent.id].map((call) => (
                      <div key={call.id} className="border rounded-lg p-3 bg-background">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              call.typ === "Call" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {call.typ}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(call.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                            </span>
                          </div>
                        </div>
                        {call.notiz && (
                          <div className="text-sm bg-muted p-2 rounded">
                            {call.notiz}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Phone className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Noch keine Calls vorhanden</p>
                  </div>
                )}
              </div>

              {/* Notes Section */}
              <div className="border rounded-lg p-4 bg-muted/20">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Notizen ({notizenVerlauf[selectedInteressent.id]?.length || 0})
                  </h3>
                  <Button
                    onClick={() => {
                      setIsNotizDialogOpen(true);
                    }}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Notiz hinzufügen
                  </Button>
                </div>
                {notizenVerlauf[selectedInteressent.id]?.length > 0 ? (
                  <div className="space-y-3">
                    {notizenVerlauf[selectedInteressent.id].map((notiz) => (
                      <div key={notiz.id} className="border rounded-lg p-3 bg-background">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(notiz.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                          </span>
                        </div>
                        <div className="text-sm bg-muted p-2 rounded">
                          {notiz.notiz}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Noch keine Notizen vorhanden</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Details Image Viewer Dialog */}
      <Dialog open={detailsImageViewDialogOpen} onOpenChange={setDetailsImageViewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Email-Screenshot</DialogTitle>
          </DialogHeader>
          {detailsImageViewUrl && currentViewingScreenshot && (
            <div className="w-full space-y-3">
              <div className="max-h-[70vh] overflow-auto">
                <img src={detailsImageViewUrl} alt="Email Screenshot" className="max-w-full h-auto" />
              </div>
              <div className="text-sm text-muted-foreground text-center">
                Hinzugefügt am {format(new Date(currentViewingScreenshot.created_at), "dd.MM.yyyy, HH:mm", { locale: de })}
              </div>
              <div className="flex justify-end mt-4">
                {currentViewingScreenshot && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      deleteEmailScreenshot(currentViewingScreenshot);
                      setDetailsImageViewDialogOpen(false);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Löschen
                  </Button>
                )}
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
                     {statusSettings.map((setting, index) => {
                       const status = setting.status;
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
                               <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={getStatusColor(status)}
                                     onChange={async (e) => {
                                       const newColor = e.target.value;
                                       await updateStatusSettings(status, { color: newColor });
                                       await loadStatusSettings();
                                     }}
                                   className="w-8 h-8 rounded border cursor-pointer"
                                   title="Farbe für diesen Status wählen"
                                 />
                                 <input
                                   type="text"
                                    value={getStatusColor(status)}
                                     onChange={async (e) => {
                                       const value = e.target.value;
                                       if (value.match(/^#[0-9A-F]{6}$/i)) {
                                           await updateStatusSettings(status, { color: value });
                                           await loadStatusSettings();
                                       }
                                     }}
                                   placeholder="#ffffff"
                                   className="w-20 h-8 px-2 text-xs border rounded"
                                   title="Farbcode eingeben (z.B. #eb4d4b)"
                                 />
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                      onClick={async () => {
                                         await updateStatusSettings(status, { color: '#6b7280' });
                                         await loadStatusSettings();
                                       }}
                                      title="Farbe entfernen"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                               </div>
                               {usageCount > 0 && (
                                 <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                   {usageCount}
                                 </span>
                               )}
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 className={`h-8 w-8 p-0 ${!canDelete ? 'opacity-50 cursor-not-allowed' : 'hover:bg-destructive hover:text-destructive-foreground'}`}
                                 onClick={() => canDelete && handleDeleteStatus(status)}
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
                      handleAddNewStatus();
                    }
                  }}
                  className="flex-1"
                />
                <Button 
                  onClick={handleAddNewStatus}
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
    </>
  );
}