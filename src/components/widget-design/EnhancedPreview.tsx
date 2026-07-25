import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Eye } from "lucide-react";
import { WidgetDesignConfig, defaultColors, defaultDesign } from "./types";

interface Props {
  config: WidgetDesignConfig;
}

const getShapeRadius = (shape: string) => {
  switch (shape) {
    case 'square': return '4px';
    case 'rounded': return '12px';
    default: return '50%';
  }
};

const getButtonSize = (size: string) => {
  switch (size) {
    case 'small': return 48;
    case 'large': return 72;
    default: return 60;
  }
};

const getShadow = (style: string) => {
  switch (style) {
    case 'none': return 'none';
    case 'subtle': return '0 2px 8px rgba(0,0,0,0.1)';
    case 'strong': return '0 8px 32px rgba(0,0,0,0.25)';
    default: return '0 4px 16px rgba(0,0,0,0.15)';
  }
};

const getBorderWidth = (width: string) => {
  switch (width) {
    case 'thin': return '1px';
    case 'medium': return '2px';
    case 'thick': return '3px';
    default: return '0px';
  }
};

const getAnimation = (style: string): React.CSSProperties => {
  switch (style) {
    case 'pulse': return { animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' };
    case 'bounce': return { animation: 'bounce 1s infinite' };
    case 'glow': return { boxShadow: '0 0 20px rgba(99,102,241,0.6), 0 0 40px rgba(99,102,241,0.3)' };
    default: return {};
  }
};

const EnhancedPreview: React.FC<Props> = ({ config }) => {
  const primary = config.widget_primary_color || defaultColors.primary;
  const accent = config.widget_accent_color || defaultColors.accent;
  const text = config.widget_text_color || defaultColors.text;
  const bg = config.widget_background_color || defaultColors.background;
  const border = config.widget_border_color || defaultColors.border;
  const userBubble = config.widget_user_bubble_color || defaultColors.userBubble;
  const aiBubble = config.widget_ai_bubble_color || defaultColors.aiBubble;
  const shape = config.widget_shape || defaultDesign.shape;
  const size = getButtonSize(config.widget_button_size || defaultDesign.buttonSize);
  const shadow = getShadow(config.widget_shadow_style || defaultDesign.shadowStyle);
  const borderW = getBorderWidth(config.widget_border_width || defaultDesign.borderWidth);
  const anim = getAnimation(config.widget_animation_style || defaultDesign.animationStyle);
  const gradient = config.widget_gradient_enabled;

  const headerBg = gradient
    ? `linear-gradient(135deg, ${primary}, ${accent})`
    : primary;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Live Preview
        </CardTitle>
        <CardDescription>See how your widget will appear to visitors in real time.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          {/* Section 1: Widget Button with Banner */}
          <div className="border border-border rounded-xl bg-muted/20 p-6">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-foreground">Widget Button & Banner</h4>
              <p className="text-xs text-muted-foreground">This is the floating button visitors click, with the banner text pill.</p>
            </div>
            <div className="flex flex-col items-center gap-3 py-4">
              {/* Banner pill */}
              <div className="inline-flex flex-col items-center px-4 py-2 rounded-full"
                style={{
                  background: gradient
                    ? `linear-gradient(135deg, ${primary}, ${accent})`
                    : primary,
                  boxShadow: shadow,
                }}>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: text }}
                  dangerouslySetInnerHTML={{ __html: config.widget_banner_line1 || 'Skip the Scrolling' }}
                />
                <span
                  className="text-xs font-bold"
                  style={{ color: text }}
                  dangerouslySetInnerHTML={{ __html: config.widget_banner_line2 || 'Use "Voice"' }}
                />
              </div>
              {/* Button */}
              <div
                style={{
                  width: size, height: size,
                  borderRadius: getShapeRadius(shape),
                  backgroundColor: primary,
                  boxShadow: shadow,
                  border: `${borderW} solid ${border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  ...anim,
                }}
              >
                {config.logo_url ? (
                  <img src={config.logo_url} alt="Logo"
                    className="object-contain rounded-full"
                    style={{ width: size * 0.6, height: size * 0.6 }} />
                ) : (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke={text} strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Chat Modal */}
          <div className="border border-border rounded-xl bg-muted/20 p-6">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-foreground">Chat Modal</h4>
              <p className="text-xs text-muted-foreground">This is the chat window that opens when the button is clicked.</p>
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-xs rounded-xl overflow-hidden"
                style={{
                  backgroundColor: bg,
                  border: `${borderW === '0px' ? '1px' : borderW} solid ${border}`,
                  boxShadow: shadow,
                }}>
                {/* Header */}
                <div className="p-3 flex items-center gap-3"
                  style={{ background: headerBg }}>
                  {config.logo_url && (
                    <img src={config.logo_url} alt="Logo"
                      className="w-8 h-8 object-contain rounded-full bg-white/10" />
                  )}
                  <div>
                    <p className="font-semibold text-sm" style={{ color: text }}>
                      {config.business_name || 'Your Business'}
                    </p>
                    <p className="text-xs opacity-80" style={{ color: text }}>Voice Assistant</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="p-3 space-y-2" style={{ backgroundColor: bg }}>
                  <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-lg text-xs max-w-[80%]"
                      style={{ backgroundColor: aiBubble, color: '#1f2937' }}>
                      Hello! How can I help you today?
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="px-3 py-2 rounded-lg text-xs max-w-[80%]"
                      style={{ backgroundColor: userBubble, color: text }}>
                      I'd like to book an appointment
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-lg text-xs max-w-[80%]"
                      style={{ backgroundColor: aiBubble, color: '#1f2937' }}>
                      Sure! Let me help you with that.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedPreview;
