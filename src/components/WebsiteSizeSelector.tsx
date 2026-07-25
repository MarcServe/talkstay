import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';

export type WebsiteSize = 'small' | 'medium' | 'large';

interface WebsiteSizeSelectorProps {
  value: WebsiteSize;
  onChange: (size: WebsiteSize) => void;
  disabled?: boolean;
  overrideLimit?: number | null;
}

const SIZE_OPTIONS: { value: WebsiteSize; label: string; pages: number; description: string }[] = [
  { value: 'small', label: 'Small', pages: 20, description: 'Brochure sites, landing pages' },
  { value: 'medium', label: 'Medium', pages: 100, description: 'Business sites, portfolios' },
  { value: 'large', label: 'Large', pages: 500, description: 'Large sites, blogs, e-commerce' },
];

export const getCrawlLimitForSize = (size: WebsiteSize): number => {
  const option = SIZE_OPTIONS.find(o => o.value === size);
  return option?.pages ?? 50;
};

export const WebsiteSizeSelector: React.FC<WebsiteSizeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  overrideLimit,
}) => {
  if (overrideLimit) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">Website Crawl Limit</Label>
        <Badge variant="secondary" className="bg-amber-50 text-amber-800 border-amber-200">
          Admin override: {overrideLimit} pages
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Website Size</Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as WebsiteSize)}
        disabled={disabled}
        className="grid grid-cols-3 gap-3"
      >
        {SIZE_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 cursor-pointer transition-colors ${
              value === opt.value
                ? 'border-primary bg-primary/5'
                : 'border-muted hover:border-muted-foreground/30'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RadioGroupItem value={opt.value} className="sr-only" />
            <span className="font-semibold text-sm">{opt.label}</span>
            <span className="text-xs text-muted-foreground">Up to {opt.pages} pages</span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">{opt.description}</span>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
};
