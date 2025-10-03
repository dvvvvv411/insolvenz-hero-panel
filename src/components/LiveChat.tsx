import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  message: string;
  created_at: string;
}

export function LiveChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Load initial messages
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("team_chat")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
        return;
      }

      setMessages(data || []);
      setTimeout(scrollToBottom, 100);
    };

    loadMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("team_chat_channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_chat",
        },
        (payload) => {
          setMessages((current) => [...current, payload.new as ChatMessage]);
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const { error } = await supabase
      .from("team_chat")
      .insert({ message: newMessage.trim() });

    if (error) {
      toast({
        title: "Fehler",
        description: "Nachricht konnte nicht gesendet werden",
        variant: "destructive",
      });
    } else {
      setNewMessage("");
    }
    setIsSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Team Live-Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-6 pt-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-[500px]">
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              Noch keine Nachrichten
            </p>
          ) : (
            messages.map((msg, index) => {
              const isNewest = index === messages.length - 1;
              return (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg transition-all ${
                    isNewest
                      ? "bg-primary/20 border-2 border-primary animate-fade-in"
                      : "bg-muted/50"
                  }`}
                >
                  <p className="text-sm break-words mb-1">{msg.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(msg.created_at), "dd.MM.yyyy HH:mm:ss")}
                  </p>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nachricht schreiben..."
            disabled={isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
