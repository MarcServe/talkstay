import { Mic, FormInput, Clock, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const VoiceFormComingSoon = () => {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      
      <CardHeader className="relative">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <FormInput className="w-6 h-6 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1">
              <Mic className="w-4 h-4 text-secondary animate-pulse" />
            </div>
          </div>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              Voice Form Builder
              <Badge variant="secondary" className="gap-1">
                <Clock className="w-3 h-3" />
                Coming Soon
              </Badge>
            </CardTitle>
            <CardDescription>
              Transform any form into an interactive voice experience
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative">
        <div className="text-center py-8 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Voice-Powered Forms Are Coming!</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Soon you'll be able to convert any form into a conversational voice interface that guides users through data entry naturally.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Natural conversation flow</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <span>Smart field validation</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span>Multi-language support</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};