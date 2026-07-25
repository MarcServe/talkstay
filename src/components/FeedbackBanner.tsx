import { useState } from "react";
import { X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "react-router-dom";

export const FeedbackBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to="/feedback">
              <Button 
                size="sm" 
                className="gap-2 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <MessageSquare className="w-5 h-5" />
                Send Feedback
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <p className="font-semibold">Help us improve TalkWeb!</p>
            <p className="text-sm text-muted-foreground">Share your thoughts and feedback</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsVisible(false)}
        className="rounded-full"
        aria-label="Close feedback button"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};