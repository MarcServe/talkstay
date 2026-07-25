import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, DollarSign, Clock, Eye, GripVertical } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { InquiryDetailModal } from "./InquiryDetailModal";

interface Inquiry {
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

interface InquiryKanbanBoardProps {
  inquiries: Inquiry[];
  onStatusChange: () => void;
}

const COLUMNS = [
  { id: "new", label: "New", color: "bg-yellow-500" },
  { id: "contacted", label: "Contacted", color: "bg-purple-500" },
  { id: "quoted", label: "Quoted", color: "bg-orange-500" },
  { id: "won", label: "Won", color: "bg-green-500" },
];

export const InquiryKanbanBoard = ({ inquiries, onStatusChange }: InquiryKanbanBoardProps) => {
  const [draggedInquiry, setDraggedInquiry] = useState<Inquiry | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { toast } = useToast();

  const handleDragStart = (inquiry: Inquiry) => {
    setDraggedInquiry(inquiry);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    
    if (!draggedInquiry || draggedInquiry.status === targetStatus) {
      setDraggedInquiry(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("project_inquiries")
        .update({ status: targetStatus })
        .eq("id", draggedInquiry.id);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Moved to ${COLUMNS.find(c => c.id === targetStatus)?.label}`,
      });

      onStatusChange();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDraggedInquiry(null);
    }
  };

  const getInquiriesByStatus = (status: string) => {
    return inquiries.filter((inquiry) => inquiry.status === status);
  };

  const updateStatus = async (inquiryId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("project_inquiries")
        .update({ status: newStatus })
        .eq("id", inquiryId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: "Inquiry status has been updated successfully.",
      });

      onStatusChange();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((column) => {
          const columnInquiries = getInquiriesByStatus(column.id);
          
          return (
            <div
              key={column.id}
              className="flex flex-col space-y-3"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${column.color}`} />
                  <h3 className="font-semibold">{column.label}</h3>
                </div>
                <Badge variant="secondary">{columnInquiries.length}</Badge>
              </div>

              {/* Column Content */}
              <div className="flex-1 space-y-3 min-h-[200px]">
                {columnInquiries.map((inquiry) => (
                  <Card
                    key={inquiry.id}
                    draggable
                    onDragStart={() => handleDragStart(inquiry)}
                    className="cursor-move hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">
                            {inquiry.user_name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(inquiry.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {inquiry.project_description}
                      </p>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{inquiry.user_email}</span>
                        </div>
                        {inquiry.user_phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{inquiry.user_phone}</span>
                          </div>
                        )}
                        {inquiry.budget_range && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            <span>{inquiry.budget_range}</span>
                          </div>
                        )}
                        {inquiry.timeline && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{inquiry.timeline}</span>
                          </div>
                        )}
                      </div>

                      {inquiry.matched_services && inquiry.matched_services.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {inquiry.matched_services.slice(0, 2).map((service: any, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {service.service_name}
                            </Badge>
                          ))}
                          {inquiry.matched_services.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{inquiry.matched_services.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setSelectedInquiry(inquiry);
                          setIsDetailModalOpen(true);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-2" />
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                {columnInquiries.length === 0 && (
                  <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                    Drop inquiries here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <InquiryDetailModal
        inquiry={selectedInquiry}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedInquiry(null);
        }}
        onStatusChange={updateStatus}
      />
    </>
  );
};
