import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarCheck, Clock, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CalendarSetupPromptProps {
  assistantId?: string;
  onSetupClick?: () => void;
}

export const CalendarSetupPrompt = ({ assistantId, onSetupClick }: CalendarSetupPromptProps) => {
  const navigate = useNavigate();

  const handleSetupClick = () => {
    if (onSetupClick) {
      onSetupClick();
    } else if (assistantId) {
      navigate(`/dashboard?tab=booking&assistant=${assistantId}`);
    } else {
      navigate('/dashboard?tab=booking');
    }
  };

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-lg text-blue-900 dark:text-blue-100">
            Calendar Integration Available
          </CardTitle>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            Premium Feature
          </Badge>
        </div>
        <CardDescription className="text-blue-700 dark:text-blue-300">
          Connect your calendar to enable automatic appointment booking and availability management
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <CalendarCheck className="w-4 h-4 text-green-600" />
            <span>Calendly Integration</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-green-600" />
            <span>Google Calendar Sync</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-green-600" />
            <span>Conflict Prevention</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSetupClick} className="gap-2">
            <Zap className="w-4 h-4" />
            Set Up Calendar Integration
          </Button>
          <span className="text-xs text-muted-foreground">
            Connect in 2 minutes
          </span>
        </div>
      </CardContent>
    </Card>
  );
};