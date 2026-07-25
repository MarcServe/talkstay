import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Settings2 } from "lucide-react";
import { WidgetDesignConfig, defaultDesign } from "./types";

interface Props {
  config: WidgetDesignConfig;
  onChange: (field: keyof WidgetDesignConfig, value: string) => void;
}

const WidgetShapeStyle: React.FC<Props> = ({ config, onChange }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Settings2 className="h-5 w-5" />
        Widget Shape & Style
      </CardTitle>
      <CardDescription>Control the shape, size, shadow, and border of your widget button.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="space-y-2">
        <Label>Shape</Label>
        <ToggleGroup type="single" value={config.widget_shape || defaultDesign.shape}
          onValueChange={(v) => v && onChange('widget_shape', v)} className="justify-start">
          <ToggleGroupItem value="round" className="px-4">● Round</ToggleGroupItem>
          <ToggleGroupItem value="rounded" className="px-4">◼ Rounded</ToggleGroupItem>
          <ToggleGroupItem value="square" className="px-4">■ Square</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-2">
        <Label>Button Size</Label>
        <ToggleGroup type="single" value={config.widget_button_size || defaultDesign.buttonSize}
          onValueChange={(v) => v && onChange('widget_button_size', v)} className="justify-start">
          <ToggleGroupItem value="small" className="px-4">Small</ToggleGroupItem>
          <ToggleGroupItem value="medium" className="px-4">Medium</ToggleGroupItem>
          <ToggleGroupItem value="large" className="px-4">Large</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-2">
        <Label>Shadow Style</Label>
        <ToggleGroup type="single" value={config.widget_shadow_style || defaultDesign.shadowStyle}
          onValueChange={(v) => v && onChange('widget_shadow_style', v)} className="justify-start">
          <ToggleGroupItem value="none" className="px-4">None</ToggleGroupItem>
          <ToggleGroupItem value="subtle" className="px-4">Subtle</ToggleGroupItem>
          <ToggleGroupItem value="medium" className="px-4">Medium</ToggleGroupItem>
          <ToggleGroupItem value="strong" className="px-4">Strong</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-2">
        <Label>Border Width</Label>
        <ToggleGroup type="single" value={config.widget_border_width || defaultDesign.borderWidth}
          onValueChange={(v) => v && onChange('widget_border_width', v)} className="justify-start">
          <ToggleGroupItem value="none" className="px-4">None</ToggleGroupItem>
          <ToggleGroupItem value="thin" className="px-4">Thin</ToggleGroupItem>
          <ToggleGroupItem value="medium" className="px-4">Medium</ToggleGroupItem>
          <ToggleGroupItem value="thick" className="px-4">Thick</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </CardContent>
  </Card>
);

export default WidgetShapeStyle;
