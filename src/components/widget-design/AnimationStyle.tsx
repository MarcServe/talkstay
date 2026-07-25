import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Sparkles } from "lucide-react";
import { WidgetDesignConfig, defaultDesign } from "./types";

interface Props {
  config: WidgetDesignConfig;
  onChange: (field: keyof WidgetDesignConfig, value: string) => void;
}

const AnimationStyle: React.FC<Props> = ({ config, onChange }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Sparkles className="h-5 w-5" />
        Entry Animation
      </CardTitle>
      <CardDescription>Choose how the widget button animates to attract attention.</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <Label>Animation</Label>
        <ToggleGroup type="single" value={config.widget_animation_style || defaultDesign.animationStyle}
          onValueChange={(v) => v && onChange('widget_animation_style', v)} className="justify-start">
          <ToggleGroupItem value="none" className="px-4">None</ToggleGroupItem>
          <ToggleGroupItem value="pulse" className="px-4">Pulse</ToggleGroupItem>
          <ToggleGroupItem value="glow" className="px-4">Glow</ToggleGroupItem>
          <ToggleGroupItem value="bounce" className="px-4">Bounce</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </CardContent>
  </Card>
);

export default AnimationStyle;
