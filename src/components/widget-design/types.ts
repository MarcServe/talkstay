export interface WidgetDesignConfig {
  logo_url: string | null;
  widget_primary_color: string | null;
  widget_accent_color: string | null;
  widget_text_color: string | null;
  widget_background_color: string | null;
  widget_border_color: string | null;
  widget_user_bubble_color: string | null;
  widget_ai_bubble_color: string | null;
  widget_gradient_enabled: boolean;
  widget_button_gradient_enabled: boolean;
  widget_shape: string;
  widget_button_size: string;
  widget_shadow_style: string;
  widget_border_width: string;
  widget_animation_style: string;
  widget_banner_line1: string | null;
  widget_banner_line2: string | null;
  business_name: string;
}

export const defaultColors = {
  primary: '#6366f1',
  accent: '#8b5cf6',
  text: '#ffffff',
  background: '#ffffff',
  border: '#e5e7eb',
  userBubble: '#6366f1',
  aiBubble: '#f3f4f6',
};

export const defaultDesign = {
  shape: 'round',
  buttonSize: 'medium',
  shadowStyle: 'medium',
  borderWidth: 'none',
  animationStyle: 'none',
};
