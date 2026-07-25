import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, Calendar, DollarSign, Clock, Search, ExternalLink, Eye, Download, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { InquiryDetailModal } from "./InquiryDetailModal";
import { exportInquiriesToCSV, exportInquirySummary } from "@/utils/inquiryExport";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

interface ProjectInquiriesManagerProps {
  assistantId: string;
}

export const ProjectInquiriesManager = ({ assistantId }: ProjectInquiriesManagerProps) => {
  const [inquiries, setInquiries] = useState<ProjectInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInquiry, setSelectedInquiry] = useState<ProjectInquiry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (assistantId) {
      loadInquiries();
    }
  }, [assistantId]);

  const loadInquiries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("project_inquiries")
        .select("*")
        .eq("assistant_id", assistantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInquiries(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading inquiries",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

      loadInquiries();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    try {
      exportInquiriesToCSV(filteredInquiries, `inquiries_${statusFilter}`);
      toast({
        title: "Export successful",
        description: `Exported ${filteredInquiries.length} inquiries to CSV`,
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportSummary = () => {
    try {
      exportInquirySummary(filteredInquiries, `inquiry_summary_${statusFilter}`);
      toast({
        title: "Summary exported",
        description: "Summary report has been downloaded",
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredInquiries = inquiries.filter((inquiry) => {
    const matchesSearch =
      inquiry.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.project_description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || inquiry.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      new: "default",
      contacted: "secondary",
      quoted: "outline",
      won: "default",
      lost: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const stats = {
    total: inquiries.length,
    new: inquiries.filter((i) => i.status === "new").length,
    contacted: inquiries.filter((i) => i.status === "contacted").length,
    quoted: inquiries.filter((i) => i.status === "quoted").length,
  };

  if (!assistantId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Inquiries</CardTitle>
          <CardDescription>Please select an assistant to view inquiries captured by your Voice Assistant widget</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Business Inquiries</h2>
        <p className="text-muted-foreground">
          Manage pricing requests and project inquiries captured by your Voice Assistant widget from potential clients
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Inquiries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">New</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.new}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Contacted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contacted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quoted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.quoted}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search inquiries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="quoted">Quoted</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCSV} disabled={filteredInquiries.length === 0}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportSummary} disabled={filteredInquiries.length === 0}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Summary
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading inquiries...
          </CardContent>
        </Card>
      ) : filteredInquiries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No inquiries found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInquiries.map((inquiry) => (
            <Card key={inquiry.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {inquiry.user_name}
                      {getStatusBadge(inquiry.status)}
                      {inquiry.meeting_booked && (
                        <Badge variant="outline">
                          <Calendar className="h-3 w-3 mr-1" />
                          Meeting Booked
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {format(new Date(inquiry.created_at), "PPP")}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedInquiry(inquiry);
                        setIsDetailModalOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Select
                      value={inquiry.status}
                      onValueChange={(value) => updateStatus(inquiry.id, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="quoted">Quoted</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${inquiry.user_email}`} className="hover:underline">
                        {inquiry.user_email}
                      </a>
                    </div>
                    {inquiry.user_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${inquiry.user_phone}`} className="hover:underline">
                          {inquiry.user_phone}
                        </a>
                      </div>
                    )}
                    {inquiry.budget_range && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>Budget: {inquiry.budget_range}</span>
                      </div>
                    )}
                    {inquiry.timeline && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Timeline: {inquiry.timeline}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {inquiry.project_type && (
                      <div className="text-sm">
                        <span className="font-medium">Type: </span>
                        {inquiry.project_type}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Project Description</h4>
                  <p className="text-sm text-muted-foreground">{inquiry.project_description}</p>
                </div>

                {inquiry.business_goals && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Business Goals</h4>
                    <p className="text-sm text-muted-foreground">{inquiry.business_goals}</p>
                  </div>
                )}

                {inquiry.matched_services && inquiry.matched_services.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Matched Services</h4>
                    <div className="flex flex-wrap gap-2">
                      {inquiry.matched_services.map((service: any, idx: number) => (
                        <Badge key={idx} variant="secondary">
                          {service.service_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InquiryDetailModal
        inquiry={selectedInquiry}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedInquiry(null);
        }}
        onStatusChange={updateStatus}
      />
    </div>
  );
};
