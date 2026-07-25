import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Phone, Clock, MessageSquare, User, Code, HelpCircle, CreditCard, Upload, X } from "lucide-react";
import { SUPPORT_EMAIL, SUPPORT_PHONE, MAILTO_SUPPORT, TEL_SUPPORT } from "@/config/contact";
export const ContactUs = () => {
  const {
    user
  } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.user_metadata?.full_name || "",
    email: user?.email || "",
    userType: "",
    requestType: "",
    // Technical Issue fields
    technicalIssue: "",
    whatTried: "",
    errorMessages: "",
    // Billing fields
    billingIssue: "",
    billingDetails: "",
    // Account fields
    accountChange: "",
    currentBehavior: "",
    // General fields
    generalQuestion: "",
    website: "",
    platform: ""
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  
  const generateTitle = (): string => {
    switch (formData.requestType) {
      case "installation":
      case "technical":
        return formData.technicalIssue || "Technical Support Request";
      case "billing":
        return formData.billingIssue || "Billing Question";
      case "general":
        return formData.generalQuestion.slice(0, 50) || "General Question";
      default:
        return "Support Request";
    }
  };

  const generateDescription = (): string => {
    const baseInfo = `Website: ${formData.website || "N/A"}\nPlatform: ${formData.platform || "N/A"}`;
    
    switch (formData.requestType) {
      case "installation":
      case "technical":
        return `${baseInfo}\n\nIssue: ${formData.technicalIssue}\n\nWhat I tried: ${formData.whatTried}\n\nError messages: ${formData.errorMessages || "N/A"}`;
      case "billing":
        return `${baseInfo}\n\nBilling Issue: ${formData.billingIssue}\n\nDetails: ${formData.billingDetails}`;
      case "general":
        return `${baseInfo}\n\nQuestion: ${formData.generalQuestion}`;
      default:
        return baseInfo;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isUnder50MB = file.size <= 50 * 1024 * 1024;
      
      if (!isImage && !isVideo) {
        toast.error(`${file.name} is not a valid image or video file`);
        return false;
      }
      if (!isUnder50MB) {
        toast.error(`${file.name} exceeds 50MB limit`);
        return false;
      }
      return true;
    });
    
    setAttachments(prev => [...prev, ...validFiles].slice(0, 5));
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      toast.error("Please provide your email address");
      return;
    }
    setIsSubmitting(true);
    try {
      // Upload attachments if any
      const uploadedAttachments: Array<{ name: string; url: string }> = [];
      
      if (attachments.length > 0) {
        for (const file of attachments) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${formData.email}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('support-attachments')
            .upload(filePath, file);
          
          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Failed to upload ${file.name}`);
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('support-attachments')
            .getPublicUrl(filePath);
          
          uploadedAttachments.push({
            name: file.name,
            url: publicUrl,
          });
        }
      }

      // Submit via edge function
      const { data, error } = await supabase.functions.invoke('submit-support-request', {
        body: {
          userName: formData.name,
          userEmail: formData.email,
          userType: formData.userType || "non-technical",
          requestType: formData.requestType,
          title: generateTitle(),
          description: generateDescription(),
          websiteUrl: formData.website || undefined,
          platform: formData.platform || undefined,
          attachments: uploadedAttachments,
          userId: user?.id,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Submission failed');

      toast.success("Support request submitted successfully! We'll get back to you soon.");
      setFormData({
        name: user?.user_metadata?.full_name || "",
        email: user?.email || "",
        userType: "",
        requestType: "",
        technicalIssue: "",
        whatTried: "",
        errorMessages: "",
        billingIssue: "",
        billingDetails: "",
        accountChange: "",
        currentBehavior: "",
        generalQuestion: "",
        website: "",
        platform: ""
      });
      setAttachments([]);
    } catch (error) {
      console.error("Error submitting support request:", error);
      toast.error("Failed to submit support request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const formRef = useRef<HTMLFormElement>(null);
  const handleQuickHelp = (type: 'technical' | 'billing' | 'account' | 'general') => {
    setFormData(prev => ({
      ...prev,
      requestType: type === 'technical' ? 'installation' : type,
      website: prev.website || '',
      platform: prev.platform || ''
    }));
    
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
    toast.success('Quick help template applied. Please fill in the details.');
  };

  const renderQuestions = () => {
    if (!formData.requestType) return null;

    switch (formData.requestType) {
      case "installation":
      case "technical":
        return (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">What issue are you experiencing? *</label>
              <Input 
                value={formData.technicalIssue} 
                onChange={e => handleInputChange("technicalIssue", e.target.value)} 
                placeholder="e.g., Widget not loading on my website"
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">What have you tried so far? *</label>
              <Textarea 
                value={formData.whatTried} 
                onChange={e => handleInputChange("whatTried", e.target.value)} 
                placeholder="Describe the steps you've already attempted..."
                className="min-h-[80px]"
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Any error messages? (optional)</label>
              <Textarea 
                value={formData.errorMessages} 
                onChange={e => handleInputChange("errorMessages", e.target.value)} 
                placeholder="Copy and paste any error messages or console logs here..."
                className="min-h-[60px]"
              />
            </div>
          </>
        );

      case "billing":
        return (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">What's your billing question? *</label>
              <Select value={formData.billingIssue} onValueChange={value => handleInputChange("billingIssue", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select billing issue type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unexpected charge">Unexpected charge</SelectItem>
                  <SelectItem value="Invoice request">Invoice request</SelectItem>
                  <SelectItem value="Upgrade/downgrade">Upgrade or downgrade plan</SelectItem>
                  <SelectItem value="Cancellation">Cancel subscription</SelectItem>
                  <SelectItem value="Payment method">Update payment method</SelectItem>
                  <SelectItem value="Other">Other billing question</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional details *</label>
              <Textarea 
                value={formData.billingDetails} 
                onChange={e => handleInputChange("billingDetails", e.target.value)} 
                placeholder="Please provide any relevant details (dates, invoice numbers, etc.)..."
                className="min-h-[100px]"
                required 
              />
            </div>
          </>
        );

      case "general":
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">What would you like to know? *</label>
            <Textarea 
              value={formData.generalQuestion} 
              onChange={e => handleInputChange("generalQuestion", e.target.value)} 
              placeholder="Ask us anything about TalkWeb..."
              className="min-h-[120px]"
              required 
            />
          </div>
        );

      default:
        return null;
    }
  };
  return <div className="min-h-screen bg-background py-12">
      
      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl font-bold">Contact Us</h1>
          <p className="text-xl text-muted-foreground">
            We're here to help! Get in touch with our support team.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Information */}
          <Card className="p-8">
            <h2 className="text-2xl font-semibold mb-6">Get in Touch</h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Mail className="w-6 h-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold">Email Support</h3>
                  <a href={MAILTO_SUPPORT} className="text-muted-foreground hover:text-primary transition-colors">{SUPPORT_EMAIL}</a>
                  <p className="text-sm text-muted-foreground">We typically respond within 12 hours</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Phone className="w-6 h-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold">Phone Support</h3>
                  <p className="text-muted-foreground"><a href={TEL_SUPPORT} className="hover:text-primary transition-colors">{SUPPORT_PHONE}</a></p>
                  <p className="text-sm text-muted-foreground">Call us during business hours</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Clock className="w-6 h-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold">Business Hours</h3>
                  <p className="text-muted-foreground">Monday - Friday: 9:00 AM - 6:00 PM EST</p>
                  <p className="text-sm text-muted-foreground">Emergency support available 24/7</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Quick Help</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="justify-start h-auto p-4 flex-col items-start" onClick={() => handleQuickHelp('technical')}>
                    <Code className="w-5 h-5 mb-2" />
                    <span className="font-medium">Technical Issues</span>
                    <span className="text-xs text-muted-foreground">Integration help</span>
                  </Button>
                  
                  <Button variant="outline" className="justify-start h-auto p-4 flex-col items-start" onClick={() => handleQuickHelp('billing')}>
                    <CreditCard className="w-5 h-5 mb-2" />
                    <span className="font-medium">Billing</span>
                    <span className="text-xs text-muted-foreground">Account & payments</span>
                  </Button>
                  
                  <Button variant="outline" className="justify-start h-auto p-4 flex-col items-start" onClick={() => handleQuickHelp('account')}>
                    <User className="w-5 h-5 mb-2" />
                    <span className="font-medium">Account</span>
                    <span className="text-xs text-muted-foreground">Settings & profile</span>
                  </Button>
                  
                  <Button variant="outline" className="justify-start h-auto p-4 flex-col items-start" onClick={() => handleQuickHelp('general')}>
                    <HelpCircle className="w-5 h-5 mb-2" />
                    <span className="font-medium">General</span>
                    <span className="text-xs text-muted-foreground">Questions & feedback</span>
                  </Button>
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <h4 className="font-medium">Send Feedback</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Have suggestions or feedback about TalkWeb? Share your thoughts with our team.
                  </p>
                  <Link to="/feedback">
                    <Button variant="outline" className="w-full">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Go to Feedback Page
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>

          {/* Contact Form */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Send us a Message</h2>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name *</label>
                  <Input value={formData.name} onChange={e => handleInputChange("name", e.target.value)} placeholder="Your full name" required />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email *</label>
                  <Input type="email" value={formData.email} onChange={e => handleInputChange("email", e.target.value)} placeholder="your@email.com" required />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">I am... *</label>
                  <Select value={formData.userType} onValueChange={value => handleInputChange("userType", value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your technical level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical (Developer/IT)</SelectItem>
                      <SelectItem value="non-technical">Non-Technical (Business Owner)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">What do you need help with? *</label>
                <Select value={formData.requestType} onValueChange={value => handleInputChange("requestType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select to show relevant questions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="installation">Installation Help</SelectItem>
                    <SelectItem value="technical">Technical Support</SelectItem>
                    <SelectItem value="billing">Billing Question</SelectItem>
                    <SelectItem value="general">General Question</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Website URL (optional)</label>
              <Input value={formData.website} onChange={e => handleInputChange("website", e.target.value)} placeholder="https://yourwebsite.com" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Platform (if known)</label>
              <Input value={formData.platform} onChange={e => handleInputChange("platform", e.target.value)} placeholder="WordPress, Shopify, React, etc." />
            </div>

            {renderQuestions()}

            <div className="space-y-2">
              <label className="text-sm font-medium">Attach Screenshots or Videos (optional)</label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    id="contact-attachments"
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('contact-attachments')?.click()}
                    disabled={attachments.length >= 5}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Files
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Max 5 files, 50MB each
                  </span>
                </div>
                
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Upload className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>;
};