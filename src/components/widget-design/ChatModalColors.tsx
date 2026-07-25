import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MessageSquare } from "lucide-react";
import { WidgetDesignConfig, defaultColors } from "./types";

interface Props {
  config: WidgetDesignConfig;
  onChange: (field: keyof WidgetDesignConfig, value: string | boolean) => void;
}

const ColorField = ({ id, label, hint, value, onChange }: {
  id: string; label: string; hint: string; value: string;
  onChange: (v: string) => void;
}) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <div className="flex items-center gap-2">
      <input type="color" id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded-lg border cursor-pointer" />
      <Input value={value} onChange={(e) => onChange(e.target.value)}
        className="flex-1 font-mono text-sm" />
    </div>
    <p className="text-xs text-muted-foreground">{hint}</p>
  </div>
);

const ChatModalColors: React.FC<Props> = ({ config, onChange }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        Chat Modal Design
      </CardTitle>
      <CardDescription>Customize the chat window colors and appearance.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ColorField id="bg-color" label="Background Color"
          hint="Chat window background"
          value={config.widget_background_color || defaultColors.background}
          onChange={(v) => onChange('widget_background_color', v)} />
        <ColorField id="border-color" label="Border Color"
          hint="Chat window border"
          value={config.widget_border_color || defaultColors.border}
          onChange={(v) => onChange('widget_border_color', v)} />
        <ColorField id="user-bubble" label="User Bubble Color"
          hint="User message bubbles"
          value={config.widget_user_bubble_color || defaultColors.userBubble}
          onChange={(v) => onChange('widget_user_bubble_color', v)} />
        <ColorField id="ai-bubble" label="AI Bubble Color"
          hint="AI message bubbles"
          value={config.widget_ai_bubble_color || defaultColors.aiBubble}
          onChange={(v) => onChange('widget_ai_bubble_color', v)} />
      </div>
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div>
          <Label className="font-medium">Chat header gradient</Label>
          <p className="text-xs text-muted-foreground">Apply a gradient effect to the chat header</p>
        </div>
        <Switch checked={config.widget_gradient_enabled}
          onCheckedChange={(v) => onChange('widget_gradient_enabled', v)} />
      </div>
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div>
          <Label className="font-medium">Launcher button gradient</Label>
          <p className="text-xs text-muted-foreground">Turn off for a solid-colour floating chat button (uses your primary colour)</p>
        </div>
        <Switch checked={config.widget_button_gradient_enabled !== false}
          onCheckedChange={(v) => onChange('widget_button_gradient_enabled', v)} />
      </div>
    </CardContent>
  </Card>
);

export default ChatModalColors;
