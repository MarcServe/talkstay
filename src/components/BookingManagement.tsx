import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WhatsAppIntegration } from './WhatsAppIntegration';
import { TimeSlotManager } from './TimeSlotManager';
import { ContentRefreshManager } from './ContentRefreshManager';
import { NotificationSettings } from './NotificationSettings';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Calendar, MessageCircle, Clock, RefreshCw, CheckCircle2, AlertCircle, Mail } from 'lucide-react';
import { CalendarIntegrations } from './CalendarIntegrations';
import { CalendarOverview } from './CalendarOverview';
import { DefaultCalendarSelector } from './DefaultCalendarSelector';
import { MeetingLinksSettings } from './MeetingLinksSettings';
import { BusinessHoursSettings } from './BusinessHoursSettings';
import { BookingWindowsManager } from './BookingWindowsManager';
import { BookingAnalytics } from './BookingAnalytics';
import { BookingCleanup } from './BookingCleanup';
import { useSubscription } from '@/hooks/useSubscription';
interface BookingManagementProps {
  selectedAssistant: any;
  assistantId: string;
}
export const BookingManagement: React.FC<BookingManagementProps> = ({
  selectedAssistant,
  assistantId
}) => {
  const [activeSection, setActiveSection] = useState('whatsapp');
  const {
    subscription
  } = useSubscription();
  if (!selectedAssistant) {
    return <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Please select an assistant to manage booking integrations.</p>
        </CardContent>
      </Card>;
  }
  const integrationStatus = {
    whatsapp: selectedAssistant.whatsapp_enabled,
    timeslots: true // Always available
  };
  
  const StatusBadge = ({
    connected
  }: {
    connected: boolean;
  }) => (
    <Badge variant={connected ? "default" : "secondary"}>
      {connected ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
    </Badge>
  );
  
  return <div className="space-y-6">
      {/* Default Booking System - Premium Feature */}
      {subscription?.subscribed && <div className="mb-6">
          <DefaultCalendarSelector selectedAssistant={selectedAssistant} assistantId={assistantId} />
        </div>}

      {/* Video Meeting Links Configuration */}
      <Card>
        <CardContent className="pt-6">
          <MeetingLinksSettings assistantId={assistantId} />
        </CardContent>
      </Card>

      {/* Main Integration Sections */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 lg:grid-cols-6">
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="windows" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Windows</span>
          </TabsTrigger>
          <TabsTrigger value="timeslots" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Time Slots</span>
          </TabsTrigger>
          <TabsTrigger value="business-hours" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Business Hours</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="calendar-integrations" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-500" />
                WhatsApp Integration
              </CardTitle>
              <p className="text-muted-foreground">
                Enable direct WhatsApp communication for immediate support
              </p>
            </CardHeader>
            <CardContent>
              <WhatsAppIntegration selectedAssistant={selectedAssistant} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="windows" className="space-y-4">
          <BookingWindowsManager assistantId={assistantId} />
        </TabsContent>

        <TabsContent value="timeslots" className="space-y-4">
          <BookingCleanup assistantId={assistantId} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                Manual Availability Management
              </CardTitle>
              <p className="text-muted-foreground">
                Set custom time slots for appointment booking
              </p>
            </CardHeader>
            <CardContent>
              <TimeSlotManager assistantId={assistantId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business-hours" className="space-y-4">
          <BusinessHoursSettings assistantId={assistantId} />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationSettings selectedAssistant={selectedAssistant} assistantId={assistantId} />
        </TabsContent>


        <TabsContent value="calendar-integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Calendar Integrations
              </CardTitle>
              <p className="text-muted-foreground">
                Connect with various calendar platforms for automatic synchronization
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 border border-dashed rounded-lg text-center">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <h4 className="font-medium">Google Calendar</h4>
                  <p className="text-xs text-muted-foreground mb-2">Gmail integration</p>
                  <Badge variant="secondary" className="mt-2">Coming Soon</Badge>
                </div>
                <div className="p-4 border border-dashed rounded-lg text-center">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                  <h4 className="font-medium">Outlook Calendar</h4>
                  <p className="text-xs text-muted-foreground mb-2">Microsoft integration</p>
                  <Badge variant="secondary" className="mt-2">Coming Soon</Badge>
                </div>
                <div className="p-4 border border-dashed rounded-lg text-center">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                  <h4 className="font-medium">Apple Calendar</h4>
                  <p className="text-xs text-muted-foreground mb-2">iCloud integration</p>
                  <Badge variant="secondary" className="mt-2">Coming Soon</Badge>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">🚀 Enhanced Calendar Features Coming Soon</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Real-time availability synchronization</li>
                  <li>• Automatic conflict detection</li>
                  <li>• Cross-platform calendar support</li>
                  <li>• Smart scheduling suggestions</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>;
};