import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, Calendar, DollarSign, Clock, FileText, Plus, Trash2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface InquiryNote {
  id: string;
  note_text: string;
  created_at: string;
  updated_at: string;
}

interface ProjectInquiry {
  id: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  project_type: string | null;
  project_description: string;
  business_goals: string | null;
  current_solution: string | null;
  budget_range: string | null;
  timeline: string | null;
  status: string;
  matched_services: any[];
  pricing_provided: any;
  meeting_booked: boolean;
  meeting_link: string | null;
  created_at: string;
  updated_at: string;
}

interface InquiryDetailModalProps {
  inquiry: ProjectInquiry | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (inquiryId: string, newStatus: string) => void;
}

export const InquiryDetailModal = ({
  inquiry,
  isOpen,
  onClose,
  onStatusChange,
}: InquiryDetailModalProps) => {
  const [notes, setNotes] = useState<InquiryNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (inquiry?.id && isOpen) {
      loadNotes();
    }
  }, [inquiry?.id, isOpen]);

  const loadNotes = async () => {
    if (!inquiry?.id) return;

    try {
      const { data, error } = await supabase
        .from("inquiry_notes")
        .select("*")
        .eq("inquiry_id", inquiry.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      console.error("Error loading notes:", error);
    }
  };

  const addNote = async () => {
    if (!inquiry?.id || !newNote.trim() || !user?.id) return;

    try {
      setLoading(true);
      const { error } = await supabase.from("inquiry_notes").insert({
        inquiry_id: inquiry.id,
        user_id: user.id,
        note_text: newNote.trim(),
      });

      if (error) throw error;

      toast({
        title: "Note added",
        description: "Your note has been saved successfully.",
      });

      setNewNote("");
      loadNotes();
    } catch (error: any) {
      toast({
        title: "Error adding note",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from("inquiry_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      toast({
        title: "Note deleted",
        description: "Note has been removed successfully.",
      });

      loadNotes();
    } catch (error: any) {
      toast({
        title: "Error deleting note",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!inquiry) return null;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-500",
      contacted: "bg-yellow-500",
      quoted: "bg-purple-500",
      won: "bg-green-500",
      lost: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Inquiry Details - {inquiry.user_name}</span>
            <Badge className={getStatusColor(inquiry.status)}>
              {inquiry.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
          <div className="space-y-6">
            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contact Information
              </h3>
              <div className="grid gap-3 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${inquiry.user_email}`}
                    className="text-primary hover:underline"
                  >
                    {inquiry.user_email}
                  </a>
                  <Button size="sm" variant="ghost" asChild>
                    <a href={`mailto:${inquiry.user_email}`}>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
                {inquiry.user_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${inquiry.user_phone}`}
                      className="text-primary hover:underline"
                    >
                      {inquiry.user_phone}
                    </a>
                    <Button size="sm" variant="ghost" asChild>
                      <a href={`tel:${inquiry.user_phone}`}>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                )}
                {inquiry.budget_range && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-green-600">
                      {inquiry.budget_range}
                    </span>
                  </div>
                )}
                {inquiry.timeline && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{inquiry.timeline}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Project Details */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Project Details</h3>
              {inquiry.project_type && (
                <div className="mb-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Type:
                  </span>
                  <Badge variant="secondary" className="ml-2">
                    {inquiry.project_type}
                  </Badge>
                </div>
              )}
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div>
                  <span className="text-sm font-medium">Description:</span>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {inquiry.project_description}
                  </p>
                </div>
                {inquiry.business_goals && (
                  <div>
                    <span className="text-sm font-medium">Business Goals:</span>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {inquiry.business_goals}
                    </p>
                  </div>
                )}
                {inquiry.current_solution && (
                  <div>
                    <span className="text-sm font-medium">Current Solution:</span>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {inquiry.current_solution}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Matched Services */}
            {inquiry.matched_services && inquiry.matched_services.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Matched Services</h3>
                <div className="space-y-2">
                  {inquiry.matched_services.map((service: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{service.service_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {service.service_category}
                        </p>
                      </div>
                      <span className="font-bold text-green-600">
                        {service.price_currency} {service.base_price?.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meeting Status */}
            {inquiry.meeting_booked && inquiry.meeting_link && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-600">
                    Meeting Scheduled
                  </span>
                </div>
                <a
                  href={inquiry.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View meeting details
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            <Separator />

            {/* Internal Notes */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Internal Notes</h3>
              
              {/* Add Note */}
              <div className="space-y-2 mb-4">
                <Textarea
                  placeholder="Add a note about this inquiry..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={addNote}
                  disabled={!newNote.trim() || loading}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>

              {/* Notes List */}
              <div className="space-y-3">
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No notes yet. Add one to track your progress.
                  </p>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 bg-muted rounded-lg relative group"
                    >
                      <p className="text-sm mb-2 pr-8">{note.note_text}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.created_at), "PPp")}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Timeline</h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                  <div>
                    <p className="text-sm font-medium">Inquiry Created</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(inquiry.created_at), "PPp")}
                    </p>
                  </div>
                </div>
                {inquiry.updated_at !== inquiry.created_at && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-muted mt-1.5" />
                    <div>
                      <p className="text-sm font-medium">Last Updated</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(inquiry.updated_at), "PPp")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
