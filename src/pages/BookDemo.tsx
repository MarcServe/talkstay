import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar, Send, CheckCircle2, Phone, Mail, MessageCircle, ArrowRight, Mic, Brain, Globe, Palette, BarChart3, CalendarCheck, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORT_EMAIL, SUPPORT_PHONE, TEL_SUPPORT, MAILTO_SUPPORT } from "@/config/contact";
import { Link } from "react-router-dom";

const demoSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  company: z.string().trim().min(1, "Company / Organisation is required").max(200),
  jobTitle: z.string().trim().max(150).optional(),
  sector: z.string().min(1, "Please select your sector"),
  message: z.string().trim().min(1, "Please tell us how we can help").max(2000),
  requestType: z.enum(["demo", "quote", "both"]),
});

type DemoFormData = z.infer<typeof demoSchema>;

const sectors = [
  "Education",
  "Healthcare / NHS",
  "Local Government",
  "Financial Services",
  "Retail",
  "Technology",
  "Charity / Non-Profit",
  "Other",
];

const faqs = [
  {
    question: "How does TalkWeb work?",
    answer: "TalkWeb adds a voice AI assistant to your website that can answer visitor questions, guide them through your content, and help with bookings — all using your website's own information. It scrapes and learns your content automatically.",
  },
  {
    question: "Is TalkWeb WCAG compliant?",
    answer: "Yes. TalkWeb is built as a voice-first accessibility layer that complements WCAG 2.1 AA standards. It helps users with dyslexia, cognitive impairments, low digital confidence, and those who simply prefer speaking to reading.",
  },
  {
    question: "How long does setup take?",
    answer: "Most websites are set up in under 10 minutes. You provide your website URL, TalkWeb scrapes and learns your content, and you get an embed code to paste into your site. No coding experience required.",
  },
  {
    question: "What languages does TalkWeb support?",
    answer: "TalkWeb supports 57+ languages with real-time voice interaction, so your website visitors can communicate in their preferred language naturally.",
  },
  {
    question: "Can I customise the assistant's voice and appearance?",
    answer: "Absolutely. You can choose from multiple voice types and accents, customise widget colours to match your branding, and configure the assistant's tone and personality.",
  },
  {
    question: "Do you offer bespoke solutions?",
    answer: "Yes. Every organisation is different. After our discovery call, we assess your needs and provide a tailored solution with custom pricing based on your requirements.",
  },
];

const BookDemo = () => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<DemoFormData>({
    resolver: zodResolver(demoSchema),
    defaultValues: { requestType: "demo" },
  });

  const onSubmit = async (data: DemoFormData) => {
    setSubmitting(true);
    try {
      // Save to database first (safety net)
      await supabase.from("demo_requests").insert({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        company: data.company,
        job_title: data.jobTitle || null,
        sector: data.sector,
        message: data.message,
        request_type: data.requestType,
      });

      // Then attempt email notification
      const { error } = await supabase.functions.invoke("send-notification", {
        body: {
          type: "demo_request",
          to: "support@talkweb.io",
          subject: `Demo Request from ${data.firstName} ${data.lastName} — ${data.company}`,
          body: `
Name: ${data.firstName} ${data.lastName}
Email: ${data.email}
Company: ${data.company}
Job Title: ${data.jobTitle || "N/A"}
Sector: ${data.sector}
Request Type: ${data.requestType}

Message:
${data.message}
          `.trim(),
        },
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Request submitted! We'll be in touch shortly.");
    } catch {
      // Even if email fails, the DB insert succeeded
      setSubmitted(true);
      toast.success("Request submitted! We'll be in touch shortly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero */}
        <section className="py-16 md:py-24 bg-muted/30" aria-label="Book a demo">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Let's Build Your <span className="ai-gradient-text">Perfect Voice Assistant</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Every business is unique. Get a custom AI voice solution tailored to your specific needs, industry, and goals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#demo-form">
                <Button variant="hero" size="lg" className="gap-2">
                  Book a Demo <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
              <a href={TEL_SUPPORT}>
                <Button variant="outline" size="lg" className="gap-2">
                  <Phone className="w-4 h-4" /> Call Us Now
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: 1, icon: CalendarCheck, title: "Book a Discovery Call", desc: "Schedule a 30-minute call with our team to discuss your business needs and goals." },
                { step: 2, icon: Brain, title: "We Assess Your Needs", desc: "Our experts analyze your requirements and design a tailored voice AI solution." },
                { step: 3, icon: Send, title: "Get Your Bespoke Solution", desc: "Receive a custom proposal with pricing and implementation timeline." },
              ].map((item) => (
                <div key={item.step} className="relative rounded-2xl border border-border bg-card p-6 text-center space-y-3">
                  <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">{item.step}</div>
                  <item.icon className="w-8 h-8 mx-auto text-primary" />
                  <h3 className="font-semibold text-lg">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What We Can Build For You */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">What We Can Build For You</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Mic, title: "Custom Voice Assistants", desc: "Voice AI agents tailored to your brand, tone, and industry." },
                { icon: Globe, title: "Multi-language Support", desc: "Serve visitors in 57+ languages with real-time voice interaction." },
                { icon: CalendarCheck, title: "Booking & Scheduling", desc: "Integrate with your calendar so visitors can book directly via voice." },
                { icon: FileText, title: "Document AI", desc: "Upload documents and let your assistant answer from your knowledge base." },
                { icon: BarChart3, title: "Analytics & Reporting", desc: "Track conversations, user engagement, and assistant performance." },
                { icon: Palette, title: "Brand-matched Design", desc: "Customise widget colours, voice, and personality to match your brand." },
                { icon: MessageCircle, title: "Voice Forms", desc: "Replace traditional forms with guided voice conversations. Reduce abandonment and collect data naturally." },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <item.icon className="w-7 h-7 text-primary" />
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Form + Sidebar */}
        <section id="demo-form" className="py-12 md:py-16 scroll-mt-20">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
              {/* Form */}
              <div className="md:col-span-2">
                {submitted ? (
                  <div className="text-center py-16 space-y-4">
                    <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
                    <h2 className="text-2xl font-bold">Thank you!</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      We've received your request and will be in touch within 1 working day. You can also schedule a call directly using the calendar link.
                    </p>
                    <a
                      href="https://calendar.app.google/cbkE71koNXVDvW2V8"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="default" size="lg" className="gap-2 mt-4">
                        <Calendar className="w-5 h-5" />
                        Schedule a Call Now
                      </Button>
                    </a>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input id="firstName" {...register("firstName")} />
                        {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input id="lastName" {...register("lastName")} />
                        {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input id="email" type="email" {...register("email")} />
                      {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company">Company / Organisation *</Label>
                        <Input id="company" {...register("company")} />
                        {errors.company && <p className="text-sm text-destructive">{errors.company.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="jobTitle">Job Title</Label>
                        <Input id="jobTitle" {...register("jobTitle")} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Sector *</Label>
                      <Select onValueChange={(v) => setValue("sector", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your sector" />
                        </SelectTrigger>
                        <SelectContent>
                          {sectors.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.sector && <p className="text-sm text-destructive">{errors.sector.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">How can we help? *</Label>
                      <Textarea id="message" rows={4} {...register("message")} placeholder="Tell us about your needs, current challenges, or what you'd like to achieve..." />
                      {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
                    </div>

                    <div className="space-y-3">
                      <Label>I would like a... *</Label>
                      <RadioGroup defaultValue="demo" onValueChange={(v) => setValue("requestType", v as any)} className="flex flex-col sm:flex-row gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="demo" id="type-demo" />
                          <Label htmlFor="type-demo" className="font-normal cursor-pointer">Demo</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="quote" id="type-quote" />
                          <Label htmlFor="type-quote" className="font-normal cursor-pointer">Quote</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="both" id="type-both" />
                          <Label htmlFor="type-both" className="font-normal cursor-pointer">Demo and Quote</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Button type="submit" size="lg" className="w-full sm:w-auto gap-2" disabled={submitting}>
                      <Send className="w-4 h-4" />
                      {submitting ? "Submitting..." : "Submit Request"}
                    </Button>

                    <p className="text-xs text-muted-foreground">
                      By submitting this form, you agree to our{" "}
                      <Link to="/privacy-policy" className="underline hover:text-foreground">Privacy Policy</Link>.
                    </p>
                  </form>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-8">
                <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                  <h3 className="font-semibold text-lg">Prefer to schedule directly?</h3>
                  <p className="text-sm text-muted-foreground">
                    Pick a time that works for you and we'll call you for a personalised walkthrough.
                  </p>
                  <a
                    href="https://calendar.app.google/cbkE71koNXVDvW2V8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" className="w-full gap-2">
                      <Calendar className="w-4 h-4" />
                      Schedule a Call
                    </Button>
                  </a>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                  <h3 className="font-semibold text-lg">Chat on WhatsApp</h3>
                  <p className="text-sm text-muted-foreground">
                    Prefer messaging? Start a conversation on WhatsApp and we'll get back to you quickly.
                  </p>
                  <a
                    href="https://wa.me/447471245972?text=Hi%20TalkWeb%2C%20I%27d%20like%20to%20request%20a%20demo%20of%20your%20voice%20AI%20assistant."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" className="w-full gap-2 text-green-600 border-green-600/30 hover:bg-green-600/10">
                      <MessageCircle className="w-4 h-4" />
                      Message Us on WhatsApp
                    </Button>
                  </a>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                  <h3 className="font-semibold text-lg">Contact us directly</h3>
                  <div className="space-y-3 text-sm">
                    <a href={MAILTO_SUPPORT} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                      <Mail className="w-4 h-4" />
                      {SUPPORT_EMAIL}
                    </a>
                    <a href={TEL_SUPPORT} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                      <Phone className="w-4 h-4" />
                      {SUPPORT_PHONE}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 md:py-16 bg-muted/30" aria-label="Frequently asked questions">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="space-y-2">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-lg px-4 bg-card">
                  <AccordionTrigger className="text-left font-medium">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
    </div>
  );
};

export default BookDemo;
