export type PlanTier = 'free' | 'social' | 'small_business' | 'large_business' | 'enterprise';
export type FeatureName = 
  | 'create_assistant'
  | 'multiple_assistants'
  | 'advanced_analytics'
  | 'calendar_integration'
  | 'custom_branding'
  | 'api_access'
  | 'priority_support'
  | 'unlimited_conversations'
  | 'firecrawl_usage'
  | 'knowledge_sync'
  | 'whatsapp_integration'
  | 'whatsapp_dedicated_number'
  | 'voice_features'
  | 'conversation_forwarding'
  | 'website_widget';

export interface FeatureLimits {
  assistants: number;
  conversations: number;
  daily_conversations: number;
  firecrawl_usage: number;
  knowledge_sources: number;
  calendar_integrations: number;
}

export interface PlanFeatures {
  features: FeatureName[];
  limits: FeatureLimits;
  displayName: string;
  description: string;
}

const FREE_FEATURES: FeatureName[] = [
  'create_assistant',
  'voice_features',
  'conversation_forwarding',
];

const LINK_FEATURES: FeatureName[] = [
  'create_assistant',
  'voice_features',
  'conversation_forwarding',
  'custom_branding',
  'calendar_integration',
  'firecrawl_usage',
  'knowledge_sync',
];

const CORE_FEATURES: FeatureName[] = [
  'create_assistant',
  'multiple_assistants',
  'voice_features',
  'conversation_forwarding',
  'custom_branding',
  'calendar_integration',
  'firecrawl_usage',
  'knowledge_sync',
  'whatsapp_integration',
  'website_widget',
  'advanced_analytics',
  'priority_support',
];

const PRO_FEATURES: FeatureName[] = [
  'create_assistant',
  'multiple_assistants',
  'voice_features',
  'conversation_forwarding',
  'custom_branding',
  'calendar_integration',
  'firecrawl_usage',
  'knowledge_sync',
  'whatsapp_integration',
  'whatsapp_dedicated_number',
  'website_widget',
  'advanced_analytics',
  'priority_support',
  'api_access',
];

const ENTERPRISE_FEATURES: FeatureName[] = [
  'create_assistant',
  'multiple_assistants',
  'advanced_analytics',
  'calendar_integration',
  'custom_branding',
  'api_access',
  'priority_support',
  'unlimited_conversations',
  'firecrawl_usage',
  'knowledge_sync',
  'whatsapp_integration',
  'whatsapp_dedicated_number',
  'voice_features',
  'conversation_forwarding',
  'website_widget',
];

export const PLAN_FEATURES: Record<PlanTier, PlanFeatures> = {
  free: {
    features: FREE_FEATURES,
    limits: { assistants: 1, conversations: 25, daily_conversations: 3, firecrawl_usage: 1, knowledge_sources: 1, calendar_integrations: 0 },
    displayName: 'Free Trial',
    description: '7-day free trial with 25 interactions',
  },
  social: {
    features: LINK_FEATURES,
    limits: { assistants: 1, conversations: 200, daily_conversations: -1, firecrawl_usage: 3, knowledge_sources: 3, calendar_integrations: 1 },
    displayName: 'Link',
    description: 'AI voice bio link for creators',
  },
  small_business: {
    features: CORE_FEATURES,
    limits: { assistants: 3, conversations: 2000, daily_conversations: -1, firecrawl_usage: 15, knowledge_sources: 15, calendar_integrations: 3 },
    displayName: 'Core',
    description: 'Website widget, WhatsApp, booking & more',
  },
  large_business: {
    features: PRO_FEATURES,
    limits: { assistants: -1, conversations: 15000, daily_conversations: -1, firecrawl_usage: 50, knowledge_sources: 50, calendar_integrations: 10 },
    displayName: 'Pro',
    description: 'Scale across multiple sites with API access',
  },
  enterprise: {
    features: ENTERPRISE_FEATURES,
    limits: { assistants: -1, conversations: -1, daily_conversations: -1, firecrawl_usage: -1, knowledge_sources: -1, calendar_integrations: -1 },
    displayName: 'Enterprise',
    description: 'Unlimited everything with dedicated support',
  },
};

export class FeatureGate {
  private planTier: PlanTier;

  constructor(
    subscriptionTier?: string,
    _isTrialUser?: boolean,
    _trialDaysRemaining?: number
  ) {
    const tierMap: Record<string, PlanTier> = {
      'social': 'social',
      'link': 'social',
      'small_business': 'small_business',
      'core': 'small_business',
      'large_business': 'large_business',
      'pro': 'large_business',
      'starter': 'small_business',
      'professional': 'large_business',
      'growth': 'large_business',
      'enterprise': 'enterprise',
      'basic': 'social',
      'premium': 'enterprise',
    };
    this.planTier = (subscriptionTier && tierMap[subscriptionTier.toLowerCase()]) || 'free';
  }

  hasFeature(feature: FeatureName): boolean {
    return PLAN_FEATURES[this.planTier].features.includes(feature);
  }

  getFeatureLimit(limitType: keyof FeatureLimits): number {
    return PLAN_FEATURES[this.planTier].limits[limitType];
  }

  canUseFeature(feature: FeatureName, currentUsage?: number): boolean {
    if (!this.hasFeature(feature)) return false;
    if (currentUsage === undefined) return true;

    const featureToLimitMap: Partial<Record<FeatureName, keyof FeatureLimits>> = {
      'create_assistant': 'assistants',
      'firecrawl_usage': 'firecrawl_usage',
      'calendar_integration': 'calendar_integrations',
      'knowledge_sync': 'knowledge_sources',
    };
    const limitType = featureToLimitMap[feature] || 'conversations';
    const limit = this.getFeatureLimit(limitType);
    if (limit === -1) return true;
    return currentUsage < limit;
  }

  getUpgradeMessage(feature: FeatureName): string {
    if (this.planTier === 'free') {
      return 'Upgrade to a paid plan to unlock this feature.';
    }
    if (this.planTier === 'social') {
      return 'Upgrade to Core for website widgets, WhatsApp & more.';
    }
    if (this.planTier === 'small_business') {
      return 'Upgrade to Pro for unlimited assistants, API access & more.';
    }
    return 'Contact us for enterprise features tailored to your needs.';
  }

  getPlanInfo(): PlanFeatures { return PLAN_FEATURES[this.planTier]; }
  getCurrentTier(): PlanTier { return this.planTier; }
}
