import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { 
  HelpCircle, 
  BookOpen, 
  Video, 
  MessageCircle, 
  Mail, 
  Phone, 
  ExternalLink,
  PlayCircle,
  ArrowLeft,
  Search,
  Settings,
  Mic,
  Globe,
  Zap,
  FileText,
  Code,
  Calendar,
  BarChart,
  CreditCard,
  Shield,
  ChevronRight
} from "lucide-react";

export const HelpCenter = () => {
  const faqs = [
    {
      question: "How do I install TalkWeb on my website?",
      answer: "Simply copy the embed code from your dashboard and paste it into your website's HTML. We have step-by-step guides for all major platforms including WordPress, Shopify, Wix, and Squarespace."
    },
    {
      question: "Can I customize the voice assistant's appearance?",
      answer: "Yes! You can customize the assistant's tone, voice type, and behavior through your dashboard. The assistant automatically adapts to your website's content and style."
    },
    {
      question: "How many conversations are included in each plan?",
      answer: "Free 7-day trial includes 25 interactions. Link plan (£19/mo) includes 200 interactions. Core plan (£59/mo) includes 2,000 interactions. Pro plan (£129/mo) includes 15,000 interactions. Enterprise plan (£299/mo) includes unlimited interactions with dedicated support."
    },
    {
      question: "Does TalkWeb work on mobile devices?",
      answer: "Absolutely! TalkWeb is fully responsive and works seamlessly on all devices including smartphones and tablets."
    },
    {
      question: "How does the knowledge base work?",
      answer: "TalkWeb automatically scans your website content to understand your business and services. You can also upload custom documents and set specific responses through the knowledge base builder."
    },
    {
      question: "Can I integrate TalkWeb with my calendar?",
      answer: "Yes! TalkWeb includes Calendly integration for appointment booking. Visitors can schedule meetings directly through voice commands."
    }
  ];

  const tutorials = [
    {
      title: "Getting Started with TalkWeb",
      description: "Complete setup guide from account creation to first assistant",
      duration: "5 min",
      type: "Video Guide"
    },
    {
      title: "Customizing Your Voice Assistant",
      description: "Learn how to configure tone, voice, and responses",
      duration: "3 min", 
      type: "Tutorial"
    },
    {
      title: "Installation on WordPress",
      description: "Step-by-step WordPress plugin installation",
      duration: "4 min",
      type: "Video Guide"
    },
    {
      title: "Setting Up Appointment Booking",
      description: "Configure Calendly integration for automated booking",
      duration: "6 min",
      type: "Tutorial"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      
      <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        {/* Header with Back Navigation */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <HelpCircle className="w-4 h-4" />
              Help Center
            </div>
            <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Find answers, tutorials, and support for your TalkWeb voice assistant
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <BookOpen className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Installation Guide</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Complete setup instructions for all platforms
              </p>
              <Link to="/installation-guide">
                <Button variant="outline" size="sm">
                  View Guide <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <MessageCircle className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Contact Support</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get help from our friendly support team
              </p>
              <Link to="/contact">
                <Button variant="outline" size="sm">
                  Contact Us <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Settings className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Create Assistant</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Set up a new voice assistant for your website
              </p>
              <Link to="/create-assistant">
                <Button variant="outline" size="sm">
                  Get Started <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="faq" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="documentation">Documentation</TabsTrigger>
            <TabsTrigger value="tutorials">Tutorials</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Frequently Asked Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documentation Tab */}
          <TabsContent value="documentation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Complete TalkWeb Documentation
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  Everything you need to know about TalkWeb - from setup to advanced features
                </p>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {/* Introduction & Overview */}
                  <AccordionItem value="intro">
                    <AccordionTrigger className="text-left font-semibold">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Introduction & Overview
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 text-muted-foreground">
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">What is TalkWeb?</h4>
                        <p className="mb-4">
                          TalkWeb is an AI-powered voice assistant platform that enables websites to provide 24/7 voice and chat support. It combines advanced voice recognition, natural language processing, and intelligent automation to create accessible, multilingual customer experiences.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Key Features</h4>
                        <ul className="space-y-2 list-disc list-inside">
                          <li>🎙️ Voice & Chat Interface - Users can speak or type naturally</li>
                          <li>🌍 Multi-Language Support - 57+ languages supported</li>
                          <li>📅 Smart Booking - AI collects information and schedules appointments</li>
                          <li>🔗 Calendar Integration - Connects with Calendly, Google Calendar, and manual time slots</li>
                          <li>📊 Analytics Dashboard - Track conversations, bookings, and user engagement</li>
                          <li>🔒 WCAG Compliant - Accessible design for all users</li>
                          <li>📱 WhatsApp Integration - Redirect users to WhatsApp for direct communication</li>
                          <li>🌐 Website Scraping - Automatically learns from your website content</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Pricing Plans</h4>
                        <div className="space-y-3">
                          <div className="p-3 bg-secondary/20 rounded-lg">
                            <p className="font-medium">Free Trial (7 days, no credit card)</p>
                            <p className="text-sm">1 Voice Assistant • 25 interactions • 1 knowledge source</p>
                          </div>
                          <div className="p-3 bg-secondary/20 rounded-lg">
                            <p className="font-medium">Link Plan (£19/month)</p>
                            <p className="text-sm">1 Voice Assistant • 200 interactions/month • 3 knowledge sources</p>
                          </div>
                          <div className="p-3 bg-secondary/20 rounded-lg">
                            <p className="font-medium">Core Plan (£59/month)</p>
                            <p className="text-sm">3 Voice Assistants • 2,000 interactions/month • 15 knowledge sources</p>
                          </div>
                          <div className="p-3 bg-secondary/20 rounded-lg">
                            <p className="font-medium">Pro Plan (£129/month)</p>
                            <p className="text-sm">Unlimited Assistants • 15,000 interactions/month • 50 knowledge sources</p>
                          </div>
                          <div className="p-3 bg-secondary/20 rounded-lg">
                            <p className="font-medium">Enterprise Plan (£299/month)</p>
                            <p className="text-sm">Unlimited everything • Dedicated account manager • Custom onboarding</p>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Getting Started */}
                  <AccordionItem value="getting-started">
                    <AccordionTrigger className="text-left font-semibold">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Getting Started
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 text-muted-foreground">
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Step 1: Sign Up</h4>
                        <ol className="space-y-2 list-decimal list-inside">
                          <li>Visit <span className="font-mono bg-secondary px-1 rounded">https://talkweb.io</span></li>
                          <li>Click "Create Your Assistant" or "Start Free Trial"</li>
                          <li>Choose sign-up method: Email & Password or Google Account</li>
                          <li>Verify your email (check spam folder if needed)</li>
                        </ol>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Step 2: Complete Your Profile</h4>
                        <p className="mb-2">After sign-up, you'll be guided through the onboarding wizard:</p>
                        <ul className="space-y-2 list-disc list-inside">
                          <li><strong>Business Information:</strong> Company Name, Website URL, Industry, Business Hours</li>
                          <li><strong>Contact Information:</strong> Business Phone, Support Email, WhatsApp Number (optional)</li>
                          <li><strong>Branding:</strong> Logo Upload, Brand Colors, Assistant Name, Welcome Message</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Step 3: Create Your First Assistant</h4>
                        <p className="mb-2">Choose one of two methods:</p>
                        <div className="space-y-2">
                          <div className="p-3 bg-secondary/20 rounded-lg">
                            <p className="font-medium mb-1">Option A: Auto-Scrape Your Website</p>
                            <p className="text-sm">Enter your website URL and TalkWeb automatically learns from your content (2-5 minutes)</p>
                          </div>
                          <div className="p-3 bg-secondary/20 rounded-lg">
                            <p className="font-medium mb-1">Option B: Upload Knowledge Base</p>
                            <p className="text-sm">Upload documents (PDF, DOCX, TXT), add FAQs manually, or paste website content</p>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Widget Installation */}
                  <AccordionItem value="widget-installation">
                    <AccordionTrigger className="text-left font-semibold">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4" />
                        Widget Installation Guide
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 text-muted-foreground">
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Getting Your Embed Code</h4>
                        <ol className="space-y-2 list-decimal list-inside mb-3">
                          <li>Go to Dashboard → Assistants</li>
                          <li>Select your assistant</li>
                          <li>Click "Get Embed Code"</li>
                          <li>Copy the widget script</li>
                        </ol>
                        <div className="p-3 bg-secondary/20 rounded-lg font-mono text-xs overflow-x-auto">
                          {`<script 
  data-assistant="YOUR_ASSISTANT_ID" 
  data-base-url="https://talkweb.io"
  src="https://talkweb.io/widget.js">
</script>`}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-3">Platform-Specific Installation</h4>
                        
                        <div className="space-y-3">
                          <div className="p-3 bg-secondary/20 rounded-lg">
                            <p className="font-medium mb-1">WordPress</p>
                            <ol className="text-sm space-y-1 list-decimal list-inside ml-2">
                              <li>Install "Insert Headers and Footers" plugin</li>
                              <li>Go to Settings → Insert Headers and Footers</li>
                              <li>Paste script in "Scripts in Footer"</li>
                              <li>Click Save</li>
                            </ol>
                          </div>

                          <div className="p-3 bg-secondary/20 rounded-lg">
                            <p className="font-medium mb-1">Shopify</p>
                            <ol className="text-sm space-y-1 list-decimal list-inside ml-2">
                              <li>Go to Online Store → Themes → Actions → Edit Code</li>
                              <li>Open theme.liquid file</li>
                              <li>Paste script before {`</body>`}</li>
                              <li>Click Save</li>
                            </ol>
                          </div>

                          <div className="p-3 bg-secondary/20 rounded-lg">
                            <p className="font-medium mb-1">Wix</p>
                            <ol className="text-sm space-y-1 list-decimal list-inside ml-2">
                              <li>Go to Settings → Custom Code</li>
                              <li>Click + Add Custom Code</li>
                              <li>Paste script, set to "All pages" in "Body - end"</li>
                              <li>Click Apply</li>
                            </ol>
                          </div>

                          <div className="p-3 bg-secondary/20 rounded-lg">
                            <p className="font-medium mb-1">Squarespace</p>
                            <ol className="text-sm space-y-1 list-decimal list-inside ml-2">
                              <li>Go to Settings → Advanced → Code Injection</li>
                              <li>Paste script in "Footer" section</li>
                              <li>Click Save</li>
                            </ol>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Widget Customization</h4>
                        <p className="mb-2">Add these attributes to customize the widget:</p>
                        <ul className="space-y-1 text-sm list-disc list-inside">
                          <li><span className="font-mono bg-secondary px-1 rounded">data-position="bottom-right"</span> - Button position</li>
                          <li><span className="font-mono bg-secondary px-1 rounded">data-color="#6366F1"</span> - Button color (hex code)</li>
                          <li><span className="font-mono bg-secondary px-1 rounded">data-hide-chat="true"</span> - Hide chat, voice only</li>
                          <li><span className="font-mono bg-secondary px-1 rounded">data-welcome="Hi! How can I help?"</span> - Custom welcome message</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Booking & Calendar */}
                  <AccordionItem value="booking-calendar">
                    <AccordionTrigger className="text-left font-semibold">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Booking & Calendar Integration
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 text-muted-foreground">
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Setting Up Booking</h4>
                        <ol className="space-y-2 list-decimal list-inside">
                          <li>Go to Settings → Business Hours</li>
                          <li>Set your availability: Days, Time slots, Time zone, Buffer time</li>
                          <li>Choose calendar integration option</li>
                        </ol>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-3">Calendar Integration Options</h4>
                        <div className="space-y-3">
                          <div className="p-3 bg-secondary/20 rounded-lg">
                            <p className="font-medium mb-1">Option 1: Calendly Integration</p>
                            <p className="text-sm">Enter your Calendly event link for seamless appointment scheduling</p>
                          </div>
                          <div className="p-3 bg-secondary/20 rounded-lg">
                            <p className="font-medium mb-1">Option 2: Google Calendar</p>
                            <p className="text-sm">Authorize TalkWeb to access your Google Calendar for real-time availability</p>
                          </div>
                          <div className="p-3 bg-secondary/20 rounded-lg">
                            <p className="font-medium mb-1">Option 3: Manual Time Slots</p>
                            <p className="text-sm">Add available time slots manually with recurring availability options</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">AI Booking Flow</h4>
                        <p className="mb-2">When a user requests an appointment, the AI automatically:</p>
                        <ol className="space-y-1 list-decimal list-inside text-sm">
                          <li>Asks for the user's name</li>
                          <li>Requests email address</li>
                          <li>Collects phone number</li>
                          <li>Asks for preferred date/time</li>
                          <li>Shows available time slots</li>
                          <li>Confirms booking and sends email confirmation</li>
                        </ol>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Managing Bookings</h4>
                        <p className="mb-2">Access your bookings in Dashboard → Bookings tab:</p>
                        <ul className="space-y-1 text-sm list-disc list-inside">
                          <li>View upcoming appointments</li>
                          <li>Reschedule or cancel bookings</li>
                          <li>Export booking data as CSV</li>
                          <li>Receive email notifications for new bookings</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Analytics & Reporting */}
                  <AccordionItem value="analytics">
                    <AccordionTrigger className="text-left font-semibold">
                      <div className="flex items-center gap-2">
                        <BarChart className="w-4 h-4" />
                        Analytics & Reporting
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 text-muted-foreground">
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Overview Metrics</h4>
                        <ul className="space-y-2 list-disc list-inside">
                          <li>Total conversations (7, 30, 90 days)</li>
                          <li>Active users</li>
                          <li>Average conversation length</li>
                          <li>Response accuracy</li>
                          <li>User satisfaction (if feedback enabled)</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Conversation Analytics</h4>
                        <ul className="space-y-2 list-disc list-inside">
                          <li><strong>Voice vs. Chat usage:</strong> See which input method users prefer</li>
                          <li><strong>Language distribution:</strong> Track which languages are most used</li>
                          <li><strong>Peak usage times:</strong> Identify when users need support most</li>
                          <li><strong>Popular queries:</strong> Understand what users are asking about</li>
                          <li><strong>Unresolved queries:</strong> Find gaps in your knowledge base</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Booking Analytics</h4>
                        <ul className="space-y-2 list-disc list-inside">
                          <li>Total bookings and conversion rate</li>
                          <li>Most popular time slots</li>
                          <li>No-show rate tracking</li>
                          <li>Booking sources (voice, chat, WhatsApp)</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Exporting Data</h4>
                        <ol className="space-y-1 list-decimal list-inside text-sm">
                          <li>Go to Analytics → Export</li>
                          <li>Select date range and data type</li>
                          <li>Click "Export as CSV"</li>
                          <li>Download file for analysis</li>
                        </ol>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Subscription & Billing */}
                  <AccordionItem value="subscription">
                    <AccordionTrigger className="text-left font-semibold">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Subscription & Billing
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 text-muted-foreground">
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Managing Your Subscription</h4>
                        <p className="mb-2">Your dashboard shows:</p>
                        <ul className="space-y-1 list-disc list-inside text-sm">
                          <li>Current plan status</li>
                          <li>Trial days remaining (if applicable)</li>
                          <li>Usage limits (conversations, website scans)</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Upgrade Plan</h4>
                        <ol className="space-y-1 list-decimal list-inside text-sm">
                          <li>Click "Upgrade Plan" in dashboard</li>
                          <li>Select plan (Starter, Professional, Enterprise)</li>
                          <li>Choose billing cycle (monthly/annual - save 20%)</li>
                          <li>Enter payment details (Stripe secure checkout)</li>
                          <li>Confirm upgrade</li>
                        </ol>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Payment Methods</h4>
                        <p className="text-sm">Accepted: Credit/Debit Card (Visa, Mastercard, Amex) via Stripe</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Invoices & Billing</h4>
                        <ul className="space-y-1 list-disc list-inside text-sm">
                          <li>Go to Settings → Billing to view invoices</li>
                          <li>Download PDF invoices for accounting</li>
                          <li>Access Stripe Customer Portal for payment updates</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Promo Codes</h4>
                        <p className="text-sm">At checkout, click "Have a promo code?" to apply discounts (percentage off, fixed amount, or extended trial)</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* API Documentation */}
                  <AccordionItem value="api">
                    <AccordionTrigger className="text-left font-semibold">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4" />
                        API Documentation (Developers)
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 text-muted-foreground">
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">API Overview</h4>
                        <p className="mb-2">TalkWeb provides a RESTful API for custom integrations.</p>
                        <p className="text-sm">
                          <strong>Base URL:</strong> <span className="font-mono bg-secondary px-1 rounded">https://talkweb.io/api/v1</span>
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Authentication</h4>
                        <ol className="space-y-1 list-decimal list-inside text-sm mb-2">
                          <li>Go to Dashboard → Settings → API Keys</li>
                          <li>Click "Generate API Key"</li>
                          <li>Choose: Live Key (production) or Test Key (development)</li>
                          <li>Copy key (shown only once!)</li>
                        </ol>
                        <div className="p-3 bg-secondary/20 rounded-lg font-mono text-xs">
                          Authorization: Bearer YOUR_API_KEY
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Rate Limits</h4>
                        <ul className="space-y-1 list-disc list-inside text-sm">
                          <li>Live Keys: 100 requests/minute</li>
                          <li>Test Keys: 10 requests/minute</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Key Endpoints</h4>
                        <div className="space-y-2 text-sm">
                          <div className="p-2 bg-secondary/20 rounded">
                            <code className="text-xs">POST /api/v1/chat</code> - Send chat message
                          </div>
                          <div className="p-2 bg-secondary/20 rounded">
                            <code className="text-xs">GET /api/v1/assistants</code> - List assistants
                          </div>
                          <div className="p-2 bg-secondary/20 rounded">
                            <code className="text-xs">GET /api/v1/conversations</code> - Get conversation history
                          </div>
                          <div className="p-2 bg-secondary/20 rounded">
                            <code className="text-xs">POST /api/v1/book-appointment</code> - Book appointment
                          </div>
                        </div>
                      </div>

                      <div>
                        <Link to="/developers">
                          <Button variant="outline" size="sm" className="w-full">
                            View Full API Documentation <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Privacy & Security */}
                  <AccordionItem value="privacy">
                    <AccordionTrigger className="text-left font-semibold">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Privacy & Security
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 text-muted-foreground">
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Data We Collect</h4>
                        <ul className="space-y-1 list-disc list-inside text-sm">
                          <li>User conversations (text transcripts)</li>
                          <li>Voice recordings (processed and deleted after transcription)</li>
                          <li>User email (if provided during booking)</li>
                          <li>IP address (for analytics)</li>
                          <li>Device information (browser, OS)</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Data Retention</h4>
                        <ul className="space-y-1 list-disc list-inside text-sm">
                          <li>Conversation logs: 90 days</li>
                          <li>Voice recordings: Immediately deleted after transcription</li>
                          <li>Booking data: 2 years</li>
                          <li>Account data: Until account deletion</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">User Rights (GDPR/CCPA)</h4>
                        <ul className="space-y-1 list-disc list-inside text-sm">
                          <li><strong>Right to Access:</strong> Request your data</li>
                          <li><strong>Right to Deletion:</strong> Request data deletion</li>
                          <li><strong>Right to Portability:</strong> Export data in CSV format</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Security Measures</h4>
                        <ul className="space-y-1 list-disc list-inside text-sm">
                          <li>All data encrypted in transit (TLS 1.3)</li>
                          <li>All data encrypted at rest (AES-256)</li>
                          <li>Multi-factor authentication available</li>
                          <li>99.9% uptime SLA</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Compliance</h4>
                        <ul className="space-y-1 list-disc list-inside text-sm">
                          <li>✓ GDPR compliant</li>
                          <li>✓ CCPA compliant</li>
                          <li>✓ WCAG 2.1 AA accessible</li>
                          <li>✓ SOC 2 Type II (in progress)</li>
                        </ul>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Link to="/privacy-policy">
                          <Button variant="outline" size="sm">
                            Privacy Policy
                          </Button>
                        </Link>
                        <Link to="/terms-of-service">
                          <Button variant="outline" size="sm">
                            Terms of Service
                          </Button>
                        </Link>
                        <Link to="/accessibility-statement">
                          <Button variant="outline" size="sm">
                            Accessibility Statement
                          </Button>
                        </Link>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Troubleshooting */}
                  <AccordionItem value="troubleshooting">
                    <AccordionTrigger className="text-left font-semibold">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Troubleshooting Common Issues
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 text-muted-foreground">
                      <div className="space-y-3">
                        <div className="p-3 bg-secondary/20 rounded-lg">
                          <p className="font-medium text-foreground mb-1">Voice not working</p>
                          <ul className="text-sm space-y-1 list-disc list-inside ml-2">
                            <li>Check microphone permissions in browser</li>
                            <li>Ensure website uses HTTPS (required)</li>
                            <li>Try different browser (Chrome, Firefox recommended)</li>
                            <li>Check ad blockers aren't blocking microphone</li>
                          </ul>
                        </div>

                        <div className="p-3 bg-secondary/20 rounded-lg">
                          <p className="font-medium text-foreground mb-1">AI gives incorrect answers</p>
                          <ul className="text-sm space-y-1 list-disc list-inside ml-2">
                            <li>Review knowledge base for accuracy</li>
                            <li>Add missing information to knowledge base</li>
                            <li>Use Knowledge Search Diagnostics to test queries</li>
                            <li>Increase priority for important information</li>
                          </ul>
                        </div>

                        <div className="p-3 bg-secondary/20 rounded-lg">
                          <p className="font-medium text-foreground mb-1">Widget not appearing</p>
                          <ul className="text-sm space-y-1 list-disc list-inside ml-2">
                            <li>Verify script is placed before {`</body>`} tag</li>
                            <li>Check browser console for errors (F12)</li>
                            <li>Clear browser cache</li>
                            <li>Ensure assistant is active</li>
                          </ul>
                        </div>

                        <div className="p-3 bg-secondary/20 rounded-lg">
                          <p className="font-medium text-foreground mb-1">Booking not working</p>
                          <ul className="text-sm space-y-1 list-disc list-inside ml-2">
                            <li>Check calendar integration is connected</li>
                            <li>Verify business hours are set</li>
                            <li>Ensure availability exists in calendar</li>
                            <li>Test in Knowledge Search Diagnostics</li>
                          </ul>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Link to="/contact">
                          <Button className="w-full">
                            Still Need Help? Contact Support
                          </Button>
                        </Link>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Supported Languages & Browsers */}
                  <AccordionItem value="technical-specs">
                    <AccordionTrigger className="text-left font-semibold">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Supported Languages & Browsers
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 text-muted-foreground">
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Supported Languages</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="p-2 bg-secondary/20 rounded">English</div>
                          <div className="p-2 bg-secondary/20 rounded">Spanish (Español)</div>
                          <div className="p-2 bg-secondary/20 rounded">French (Français)</div>
                          <div className="p-2 bg-secondary/20 rounded">German (Deutsch)</div>
                          <div className="p-2 bg-secondary/20 rounded">Italian (Italiano)</div>
                          <div className="p-2 bg-secondary/20 rounded">Portuguese (Português)</div>
                          <div className="p-2 bg-secondary/20 rounded">Dutch (Nederlands)</div>
                          <div className="p-2 bg-secondary/20 rounded">Polish (Polski)</div>
                          <div className="p-2 bg-secondary/20 rounded">Russian (Русский)</div>
                          <div className="p-2 bg-secondary/20 rounded">Japanese (日本語)</div>
                          <div className="p-2 bg-secondary/20 rounded">Korean (한국어)</div>
                          <div className="p-2 bg-secondary/20 rounded">Chinese (简体中文)</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Browser Support</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between p-2 bg-secondary/20 rounded">
                            <span>Chrome 90+</span>
                            <span className="text-green-500">✓ Full Support</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-secondary/20 rounded">
                            <span>Firefox 88+</span>
                            <span className="text-green-500">✓ Full Support</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-secondary/20 rounded">
                            <span>Safari 14+</span>
                            <span className="text-yellow-500">⚠️ Limited Voice</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-secondary/20 rounded">
                            <span>Edge 90+</span>
                            <span className="text-green-500">✓ Full Support</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-secondary/20 rounded">
                            <span>Opera 76+</span>
                            <span className="text-green-500">✓ Full Support</span>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tutorials Tab */}
          <TabsContent value="tutorials" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tutorials.map((tutorial, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        {tutorial.type === "Video Guide" ? (
                          <Video className="w-6 h-6 text-primary" />
                        ) : (
                          <BookOpen className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {tutorial.type}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {tutorial.duration}
                          </Badge>
                        </div>
                        <h3 className="font-semibold mb-2">{tutorial.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {tutorial.description}
                        </p>
                        <Button variant="outline" size="sm">
                          <PlayCircle className="w-3 h-3 mr-1" />
                          Start Tutorial
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email Support
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Get help via email. We typically respond within 24 hours.
                  </p>
                  <div className="space-y-2">
                    <p className="font-medium">support@talkweb.io</p>
                    <p className="text-sm text-muted-foreground">
                      Available for all plans
                    </p>
                  </div>
                  <Link to="/contact">
                    <Button className="w-full">
                      Send Email
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Phone Support
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Direct phone support for urgent issues and technical assistance.
                  </p>
                  <div className="space-y-2">
                    <p className="font-medium">Available for Premium plans</p>
                    <p className="text-sm text-muted-foreground">
                      Monday - Friday, 9 AM - 6 PM BST
                    </p>
                  </div>
                  <Link to="/pricing">
                    <Button variant="outline" className="w-full">
                      Upgrade for Phone Support
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">Need Immediate Help?</h3>
                    <p className="text-muted-foreground mb-4">
                      For urgent technical issues or installation problems, our team can help you get set up quickly.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link to="/contact">
                        <Button>
                          Contact Support Team
                        </Button>
                      </Link>
                      <Link to="/installation-guide">
                        <Button variant="outline">
                          View Installation Guide
                        </Button>
                      </Link>
                      <Link to="/feedback">
                        <Button variant="outline">
                          Send Feedback
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};