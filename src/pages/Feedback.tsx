import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Sparkles, Star, Upload, X } from "lucide-react";

const Feedback = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    feedbackType: "",
    // Feature Request fields
    featureTitle: "",
    featureHelp: "",
    featureDetails: "",
    // Bug Report fields
    bugAction: "",
    bugResult: "",
    bugDevice: "",
    // User Experience fields
    uxAspect: "",
    uxRating: "",
    uxFeedback: "",
    uxSuggestions: "",
    // General Feedback
    generalMessage: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, feedbackType: value }));
  };

  const generateTitle = (): string => {
    switch (formData.feedbackType) {
      case "Feature Request":
        return formData.featureTitle || "Feature Request";
      case "Bug Report":
        return formData.bugAction || "Bug Report";
      case "User Experience":
        return `UX Feedback: ${formData.uxAspect || "General"}`;
      case "General Feedback":
        return formData.generalMessage.slice(0, 50) || "General Feedback";
      default:
        return "Feedback Submission";
    }
  };

  const generateDescription = (): string => {
    switch (formData.feedbackType) {
      case "Feature Request":
        return `Feature: ${formData.featureTitle}\n\nHow it helps: ${formData.featureHelp}\n\nAdditional details: ${formData.featureDetails || "N/A"}`;
      case "Bug Report":
        return `Action attempted: ${formData.bugAction}\n\nWhat happened: ${formData.bugResult}\n\nDevice/Browser: ${formData.bugDevice}`;
      case "User Experience":
        return `Aspect: ${formData.uxAspect}\n\nRating: ${formData.uxRating}/5 stars\n\nFeedback: ${formData.uxFeedback}\n\nSuggestions: ${formData.uxSuggestions || "N/A"}`;
      case "General Feedback":
        return formData.generalMessage;
      default:
        return "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isUnder50MB = file.size <= 50 * 1024 * 1024; // 50MB limit
      
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
    
    setAttachments(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Map user-friendly feedback types to database-valid request types
  const mapFeedbackTypeToRequestType = (feedbackType: string): string => {
    switch (feedbackType) {
      case "Feature Request":
        return "general";
      case "Bug Report":
        return "technical";
      case "User Experience":
        return "general";
      case "General Feedback":
        return "general";
      case "Other":
        return "general";
      default:
        return "general";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          requestType: mapFeedbackTypeToRequestType(formData.feedbackType),
          title: generateTitle(),
          description: generateDescription(),
          attachments: uploadedAttachments,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Submission failed');

      toast.success("Feedback submitted successfully!", {
        description: "Thank you for helping us improve TalkWeb!"
      });

      setFormData({
        name: "",
        email: "",
        feedbackType: "",
        featureTitle: "",
        featureHelp: "",
        featureDetails: "",
        bugAction: "",
        bugResult: "",
        bugDevice: "",
        uxAspect: "",
        uxRating: "",
        uxFeedback: "",
        uxSuggestions: "",
        generalMessage: ""
      });
      setAttachments([]);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback", {
        description: "Please try again or contact us directly."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestions = () => {
    if (!formData.feedbackType) return null;

    switch (formData.feedbackType) {
      case "Feature Request":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="featureTitle">What feature would you like to see? *</Label>
              <Input
                id="featureTitle"
                name="featureTitle"
                value={formData.featureTitle}
                onChange={handleInputChange}
                placeholder="e.g., Multi-language support for voice"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="featureHelp">How would this feature help you? *</Label>
              <Textarea
                id="featureHelp"
                name="featureHelp"
                value={formData.featureHelp}
                onChange={handleInputChange}
                placeholder="Describe how this would improve your experience or solve a problem..."
                className="min-h-[100px]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="featureDetails">Any additional details? (optional)</Label>
              <Textarea
                id="featureDetails"
                name="featureDetails"
                value={formData.featureDetails}
                onChange={handleInputChange}
                placeholder="Add any extra context, examples, or specifications..."
                className="min-h-[80px]"
              />
            </div>
          </>
        );

      case "Bug Report":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="bugAction">What were you trying to do? *</Label>
              <Input
                id="bugAction"
                name="bugAction"
                value={formData.bugAction}
                onChange={handleInputChange}
                placeholder="e.g., I was trying to book an appointment"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bugResult">What happened instead? *</Label>
              <Textarea
                id="bugResult"
                name="bugResult"
                value={formData.bugResult}
                onChange={handleInputChange}
                placeholder="Steps to reproduce, what you expected, what happened, and the page/URL. Example: '1) Opened /dashboard 2) Clicked Voice Forms 3) Saw a blank screen and a console error.'"
                className="min-h-[100px]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bugDevice">What browser/device are you using? *</Label>
              <Input
                id="bugDevice"
                name="bugDevice"
                value={formData.bugDevice}
                onChange={handleInputChange}
                placeholder="e.g., Chrome on Windows, Safari on iPhone"
                required
              />
            </div>
          </>
        );

      case "User Experience":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="uxAspect">What aspect of TalkWeb are you commenting on? *</Label>
              <Select value={formData.uxAspect} onValueChange={(value) => setFormData(prev => ({ ...prev, uxAspect: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an aspect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Voice Quality">Voice Quality</SelectItem>
                  <SelectItem value="Response Accuracy">Response Accuracy</SelectItem>
                  <SelectItem value="Navigation">Navigation</SelectItem>
                  <SelectItem value="Speed">Speed</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Booking Process">Booking Process</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>How would you rate this aspect? *</Label>
              <RadioGroup value={formData.uxRating} onValueChange={(value) => setFormData(prev => ({ ...prev, uxRating: value }))}>
                <div className="flex gap-4">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <div key={rating} className="flex items-center space-x-2">
                      <RadioGroupItem value={String(rating)} id={`rating-${rating}`} />
                      <Label htmlFor={`rating-${rating}`} className="flex items-center gap-1 cursor-pointer">
                        {rating} <Star className="w-4 h-4 fill-primary text-primary" />
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="uxFeedback">What did you like or dislike? *</Label>
              <Textarea
                id="uxFeedback"
                name="uxFeedback"
                value={formData.uxFeedback}
                onChange={handleInputChange}
                placeholder="Describe the screen or step, what you expected to happen, and what actually happened. Example: 'On the booking modal, the time slots loaded slowly and I couldn't tell if it was working.'"
                className="min-h-[100px]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uxSuggestions">Any suggestions for improvement? (optional)</Label>
              <Textarea
                id="uxSuggestions"
                name="uxSuggestions"
                value={formData.uxSuggestions}
                onChange={handleInputChange}
                placeholder="How could we make this better?"
                className="min-h-[80px]"
              />
            </div>
          </>
        );

      case "General Feedback":
      case "Other":
        return (
          <div className="space-y-2">
            <Label htmlFor="generalMessage">What would you like to share? *</Label>
            <Textarea
              id="generalMessage"
              name="generalMessage"
              value={formData.generalMessage}
              onChange={handleInputChange}
              placeholder="Tell us what's working well, what felt confusing, or any idea you'd love us to build. Example: 'On the dashboard, I expected the Voice Forms tab to show drafts, but it only shows published forms…'"
              className="min-h-[150px]"
              required
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      
      <Header />
      <main className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Send Us Your Feedback</h1>
            <p className="text-xl text-muted-foreground">
              Help us improve TalkWeb by sharing your thoughts, suggestions, and experiences
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Your feedback goes straight to the TalkWeb team — be as specific as you like. Mention the page, what you expected, and what actually happened.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="border-primary/20">
              <CardHeader>
                <Sparkles className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-lg">Feature Requests</CardTitle>
                <CardDescription>
                  Share ideas for new features you'd like to see
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <MessageSquare className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-lg">User Experience</CardTitle>
                <CardDescription>
                  Tell us about your experience using TalkWeb
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <MessageSquare className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-lg">Bug Reports</CardTitle>
                <CardDescription>
                  Let us know if something isn't working right
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Feedback Form</CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you as soon as possible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Your name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedbackType">Feedback Type *</Label>
                  <Select value={formData.feedbackType} onValueChange={handleSelectChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select feedback type to begin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Feature Request">Feature Request</SelectItem>
                      <SelectItem value="Bug Report">Bug Report</SelectItem>
                      <SelectItem value="User Experience">User Experience</SelectItem>
                      <SelectItem value="General Feedback">General Feedback</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {renderQuestions()}

                <div className="space-y-2">
                  <Label htmlFor="attachments">Attach Screenshots or Videos (optional)</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        id="attachments"
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('attachments')?.click()}
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Feedback"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              Your feedback helps us make TalkWeb better for everyone. Thank you for taking the time to share your thoughts!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Feedback;
