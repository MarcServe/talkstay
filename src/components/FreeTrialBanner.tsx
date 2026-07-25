import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MessageSquare, Mic, Calendar, MessageCircle, Globe } from "lucide-react";

interface FreeTrialBannerProps {
  businessName?: string;
}

export const FreeTrialBanner = ({ businessName }: FreeTrialBannerProps) => {
  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent backdrop-blur-sm mb-6">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"></div>
      
      <div className="relative p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              <Badge variant="secondary" className="text-xs font-semibold">
                FREE 7-DAY TRIAL
              </Badge>
            </div>
            
            <h3 className="text-xl font-bold text-foreground mb-2">
              Give Your Business a Voice Like {businessName || "This Business"}
            </h3>
            
            <p className="text-muted-foreground text-sm mb-4 max-w-2xl">
              Start your free trial today and get full access to advanced AI features including complete website scraping, voice navigation, appointment booking, WhatsApp integration, and real-time assistance for your visitors.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground"><span className="text-muted-foreground">Full Content Scraping</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground">Voice Navigation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground">Appointment Booking</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground">WhatsApp Integration</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground">Real-time Chat</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground">No Credit Card</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/create-assistant">
              <Button className="whitespace-nowrap font-semibold px-6 py-2 h-10">
                Start Your Free 7-Day Trial
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Animated gradient underline */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-pulse"></div>
    </Card>
  );
};