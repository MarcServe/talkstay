import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Mic, ArrowRight, 
  Shield, Volume2, Smartphone, FileText, 
  Users, Calendar, ClipboardList, LogIn
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const VoiceFormDemo = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCreateForm = () => {
    if (user) {
      navigate('/dashboard?view=voice-forms');
    } else {
      navigate('/auth?redirect=/dashboard?view=voice-forms');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="container mx-auto max-w-5xl relative z-10 text-center">
          <Badge className="mb-6 px-4 py-1.5 text-sm" variant="secondary">
            <Volume2 className="w-3.5 h-3.5 mr-1.5" />
            Voice-Powered Forms
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            Fill Out Forms by{' '}
            <span className="text-primary">Simply Talking</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Let your visitors complete forms using their voice — no typing needed. 
            Works great even in busy environments with built-in noise filtering.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleCreateForm} className="gap-2">
              {user ? (
                <>
                  Go to My Voice Forms
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign Up to Create Forms
                </>
              )}
            </Button>
            <Button size="lg" variant="outline" onClick={() => setIsModalOpen(true)} className="gap-2">
              <Mic className="w-4 h-4" />
              Try a Live Demo
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4 pb-20 space-y-16">
        {/* Benefits Section */}
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            Why Voice Forms?
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-border/50">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mic className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Faster Than Typing</h3>
                <p className="text-sm text-muted-foreground">
                  Visitors speak their answers naturally — forms are completed in seconds, not minutes.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Works in Noisy Spaces</h3>
                <p className="text-sm text-muted-foreground">
                  Smart noise filtering ensures accurate capture even in cafés, offices, or public areas.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Type If You Prefer</h3>
                <p className="text-sm text-muted-foreground">
                  Every voice form has a text fallback — users can always switch to typing at any time.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How It Works */}
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            How It Works
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <ol className="space-y-5">
                  {[
                    { title: 'Speak or Type', desc: 'The form asks a question — answer by voice or text' },
                    { title: 'Smart Validation', desc: 'Your answer is checked and confirmed instantly' },
                    { title: 'See Your Progress', desc: 'A progress bar shows how many fields are left' },
                    { title: 'Submit', desc: 'Review your answers and submit when ready' },
                  ].map((step, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium">{step.title}</p>
                        <p className="text-sm text-muted-foreground">{step.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Demo Preview Card */}
            <Card className="border-primary/20 bg-primary/[0.02]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Try It Now — Live Voice Form Demo
                </CardTitle>
                <CardDescription>
                  Experience voice form filling with a real appointment booking form
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Click below to open a live voice-powered appointment booking form. Speak your answers naturally — the AI will guide you through each field.
                </p>
                <Button onClick={() => setIsModalOpen(true)} className="w-full" size="lg">
                  <Mic className="mr-2 h-4 w-4" />
                  Try the Live Demo
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Use Cases */}
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            Perfect For
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {[
              { icon: FileText, label: 'Contact Forms', desc: 'Capture leads effortlessly' },
              { icon: Calendar, label: 'Booking Requests', desc: 'Schedule appointments by voice' },
              { icon: ClipboardList, label: 'Surveys & Feedback', desc: 'Collect opinions naturally' },
              { icon: Users, label: 'Event Registration', desc: 'Sign up attendees fast' },
            ].map(({ icon: Icon, label, desc }) => (
              <Card key={label} className="border-border/50">
                <CardContent className="pt-5 pb-4 text-center">
                  <Icon className="w-8 h-8 text-primary mx-auto mb-3" />
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center py-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Create Your Own Voice Form?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            {user 
              ? 'Head to your dashboard to build and manage voice forms for your assistants.'
              : 'Sign up for free and start collecting information through natural conversation.'}
          </p>
          <Button size="lg" onClick={handleCreateForm} className="gap-2">
            {user ? 'Go to Dashboard' : 'Get Started Free'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </section>
      </div>

      {/* Live Demo iframe Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 overflow-hidden">
          <iframe
            src="https://talkweb.io/form/appointment-booking-63gj"
            className="w-full h-full border-0 rounded-lg"
            title="Voice Form Live Demo"
            allow="microphone"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VoiceFormDemo;
