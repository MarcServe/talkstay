export interface KnowledgeBasePage {
  id: string;
  title: string;
  content: string;
  url?: string;
}

export interface URLMapping {
  pageId: string;
  pageTitle: string;
  websiteUrl: string;
  isVerified: boolean;
}

export interface AnchorLink {
  anchor: string;
  section: string;
  text: string;
  fullUrl?: string;
  priority?: number;
}

export interface SectionId {
  id: string;
  tag: string;
  text: string;
  anchor: string;
}

export interface NavigationTarget {
  url: string;
  openInNewTab: boolean;
  type: 'same-domain' | 'cross-subdomain' | 'external' | 'anchor';
  exists: boolean; // Whether the URL exists in scraped data
}

export class URLMapper {
  private assistantId: string;
  private mappings: URLMapping[] = [];
  private knowledgeBase: KnowledgeBasePage[] = [];
  private websiteBaseUrl: string;
  private anchorLinks: AnchorLink[] = [];
  private sectionIds: SectionId[] = [];
  private isSinglePageSite: boolean = false;
  private navigationMapping: Record<string, string> = {};

  constructor(assistantId: string, websiteBaseUrl: string = '') {
    this.assistantId = assistantId;
    this.websiteBaseUrl = websiteBaseUrl;
  }

  async initialize(
    knowledgeBase: KnowledgeBasePage[], 
    scrapedData?: {
      anchorLinks?: AnchorLink[];
      sectionIds?: SectionId[];
      isSinglePageSite?: boolean;
      allPages?: any[];
      siteStructure?: any;
      navigationMapping?: Record<string, string>;
    }
  ) {
    this.knowledgeBase = knowledgeBase;
    
    // Store anchor navigation data
    if (scrapedData?.anchorLinks) {
      this.anchorLinks = scrapedData.anchorLinks;
      console.log(`URLMapper: Loaded ${this.anchorLinks.length} anchor links`);
    }
    
    if (scrapedData?.sectionIds) {
      this.sectionIds = scrapedData.sectionIds;
      console.log(`URLMapper: Loaded ${this.sectionIds.length} section IDs`);
    }
    
    // Detect if this is a single-page website
    if (scrapedData?.isSinglePageSite !== undefined) {
      this.isSinglePageSite = scrapedData.isSinglePageSite;
      console.log(`URLMapper: Site type = ${this.isSinglePageSite ? 'Single-page' : 'Multi-page'}`);
    } else if (this.anchorLinks.length > 0) {
      // Fallback detection: if we have many anchor links, likely single-page
      this.isSinglePageSite = this.anchorLinks.length >= 5;
    }
    
    // Store navigation mapping from scraper
    if (scrapedData?.navigationMapping) {
      this.navigationMapping = scrapedData.navigationMapping;
      console.log(`URLMapper: Loaded ${Object.keys(this.navigationMapping).length} navigation mappings`);
    }
    
    this.createAutoMappings();
  }

  private createAutoMappings() {
    // Auto-create mappings for pages that have URLs in their content
    for (const page of this.knowledgeBase) {
      if (page.url) {
        this.mappings.push({
          pageId: page.id,
          pageTitle: page.title,
          websiteUrl: page.url,
          isVerified: false
        });
      } else {
        // Try to infer URL from page title and base website URL
        const inferredUrl = this.inferURLFromTitle(page.title);
        if (inferredUrl) {
          this.mappings.push({
            pageId: page.id,
            pageTitle: page.title,
            websiteUrl: inferredUrl,
            isVerified: false
          });
        }
      }
    }
  }

  private ensureProtocol(url: string): string {
    if (!url) return url;
    return url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `https://${url}`;
  }

  private getBaseOrigin(): string | null {
    if (!this.websiteBaseUrl) return null;
    try {
      const base = new URL(this.ensureProtocol(this.websiteBaseUrl));
      return base.origin;
    } catch {
      return null;
    }
  }

  private normalizeUrl(input: string | undefined | null): string | null {
    if (!input) return null;
    const trimmed = input.trim();
    if (!trimmed) return null;

    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return `https://${trimmed}`;

    const origin = this.getBaseOrigin();
    if (!origin) return null;

    if (trimmed.startsWith('/')) {
      return `${origin}${trimmed}`;
    }

    return `${origin}/${trimmed.replace(/^\/+/, '')}`;
  }

  private inferURLFromTitle(title: string): string | null {
    if (!this.websiteBaseUrl) return null;
    
    // Clean and normalize the base URL
    let baseUrl = this.websiteBaseUrl.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }
    baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    
    // Convert title to URL-friendly format
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    const commonMappings: { [key: string]: string } = {
      'home': '',
      'homepage': '',
      'main': '',

      'about': 'about',
      'about us': 'about',
      'who we are': 'about',
      'our story': 'about',
      'company info': 'about',

      'team': 'team',
      'our team': 'team',
      'staff': 'team',
      'people': 'team',

      'services': 'services',
      'what we do': 'services',
      'our services': 'services',
      'offerings': 'services',

      'products': 'products',
      'solutions': 'products',

      'contact': 'contact',
      'contact us': 'contact',
      'get in touch': 'contact',
      'reach out': 'contact',
      'reach us': 'contact',
      'call us': 'contact',
      'email us': 'contact',
      'contact information': 'contact',
      'contact info': 'contact',
      'get contact information': 'contact',
      'get contact info': 'contact',

      'pricing': 'pricing',
      'plans': 'pricing',
      'rates': 'pricing',
      'packages': 'pricing',

      'blog': 'blog',
      'news': 'blog',
      'articles': 'blog',

      'faq': 'faq',
      'questions': 'faq',
      'help': 'faq',

      'support': 'support',
      'get support': 'support',
      'customer support': 'support',
      'assistance': 'support',

      'portfolio': 'portfolio',
      'work': 'portfolio',
      'projects': 'portfolio',

      'testimonials': 'testimonials',
      'reviews': 'testimonials',
      'feedback': 'testimonials',

      'careers': 'careers',
      'jobs': 'careers',
      'career': 'careers',

      'book': 'appointment',
      'book now': 'appointment',
      'schedule': 'appointment',
      'schedule demo': 'appointment',
      'appointment': 'appointment',
      'book appointment': 'appointment',
      'schedule appointment': 'appointment',
      'consultation': 'appointment',
      'book consultation': 'appointment',

      'login': 'login',
      'log in': 'login',
      'sign in': 'login',
      'signin': 'login',
      'sign-in': 'login',
      'account': 'login',
      'my account': 'login',
      'user login': 'login',
      'customer login': 'login',
      'member login': 'login',

      'signup': 'signup',
      'sign up': 'signup',
      'sign-up': 'signup',
      'register': 'register',
      'registration': 'register',
      'create account': 'signup',

      'dashboard': 'dashboard',
      'my dashboard': 'dashboard',
      'user dashboard': 'dashboard',

      'profile': 'profile',
      'my profile': 'profile',
      'user profile': 'profile',

      'settings': 'settings',
      'account settings': 'settings',
      'preferences': 'settings',

      'checkout': 'checkout',
      'pay': 'checkout',
      'payment': 'checkout',

      'cart': 'cart',
      'shopping cart': 'cart',
      'basket': 'cart'
    };

    const path = commonMappings[title.toLowerCase()] || slug;
    
  // Construct final URL - avoid double domains and malformed URLs
    if (path === '') {
      return baseUrl; // For home page
    } else {
      // Ensure no double slashes and proper path construction
      const cleanPath = path.replace(/^\/+/, ''); // Remove leading slashes
      return `${baseUrl}/${cleanPath}`;
    }
  }

  /**
   * Check if a URL is a cross-subdomain link
   */
  private isCrossSubdomain(targetUrl: string): boolean {
    try {
      const target = new URL(targetUrl);
      const base = new URL(this.websiteBaseUrl);
      
      // Same domain, different subdomain
      if (target.hostname !== base.hostname) {
        const targetParts = target.hostname.split('.');
        const baseParts = base.hostname.split('.');
        
        // Check if they share the same root domain (last 2 parts)
        const targetRoot = targetParts.slice(-2).join('.');
        const baseRoot = baseParts.slice(-2).join('.');
        
        if (targetRoot === baseRoot) {
          console.log(`🔗 Cross-subdomain detected: ${target.hostname} vs ${base.hostname}`);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if a URL exists in scraped data
   */
  private isValidScrapedUrl(url: string): boolean {
    const normalizedUrl = this.normalizeUrl(url) || url;

    // Check if URL exists in navigationMapping
    for (const [_, mappedUrl] of Object.entries(this.navigationMapping)) {
      const normalizedMapped = this.normalizeUrl(mappedUrl) || mappedUrl;
      if (normalizedMapped === normalizedUrl) {
        console.log(`✅ URL found in navigation mapping: ${url}`);
        return true;
      }
    }
    
    // Check if URL exists in anchorLinks
    if (this.anchorLinks.some(link => (this.normalizeUrl(link.fullUrl) || link.fullUrl) === normalizedUrl)) {
      console.log(`✅ URL found in anchor links: ${url}`);
      return true;
    }
    
    // Check if URL matches any scraped page
    if (this.knowledgeBase.some(page => (this.normalizeUrl(page.url) || page.url) === normalizedUrl)) {
      console.log(`✅ URL found in knowledge base: ${url}`);
      return true;
    }
    
    console.warn(`⚠️ URL not found in scraped data: ${url}`);
    return false;
  }

  /**
   * Get website URL with navigation metadata
   * Returns NavigationTarget with URL and navigation flags
   */
  getNavigationInfo(pageTitle: string): NavigationTarget | null {
    const url = this.getWebsiteURL(pageTitle);
    
    if (!url) {
      console.warn(`⚠️ URL Mapper: No URL could be resolved for "${pageTitle}"`);
      return null;
    }

    const isCrossSubdomain = this.isCrossSubdomain(url);
    const exists = this.isValidScrapedUrl(url);
    const isAnchor = url.includes('#');

    if (!exists) {
      console.warn(`⚠️ URL Mapper: "${url}" is not part of the saved navigation set`);
      return null;
    }
    
    return {
      url,
      openInNewTab: isCrossSubdomain, // Open cross-subdomain links in new tab
      type: isAnchor ? 'anchor' : (isCrossSubdomain ? 'cross-subdomain' : 'same-domain'),
      exists
    };
  }

  /**
   * Get website URL (main method for URL resolution)
   */
  getWebsiteURL(pageTitle: string): string | null {
    const searchTerm = pageTitle.toLowerCase().trim();

    // PRIORITY 1: Check scraped navigation mapping (ACTUAL URLs from website)
    if (Object.keys(this.navigationMapping).length > 0) {
      // Try exact match first
      if (this.navigationMapping[searchTerm]) {
        const norm = this.normalizeUrl(this.navigationMapping[searchTerm]);
        console.log(`URL Mapper: Scraped nav match for "${pageTitle}" -> ${norm || this.navigationMapping[searchTerm]}`);
        return norm || this.navigationMapping[searchTerm];
      }
      
      // Try fuzzy match on navigation keywords
      for (const [keyword, url] of Object.entries(this.navigationMapping)) {
        if (keyword.includes(searchTerm) || searchTerm.includes(keyword)) {
          const norm = this.normalizeUrl(url);
          console.log(`URL Mapper: Scraped nav fuzzy match for "${pageTitle}" (via "${keyword}") -> ${norm || url}`);
          return norm || url;
        }
      }
    }
    
    // PRIORITY 2: Check for anchor links (single-page navigation)
    if (this.anchorLinks.length > 0) {
      const anchorMatch = this.anchorLinks.find(anchor => {
        const anchorText = anchor.text.toLowerCase();
        const anchorSection = anchor.section.toLowerCase();
        return anchorText.includes(searchTerm) || 
               searchTerm.includes(anchorText) ||
               anchorSection.includes(searchTerm) ||
               searchTerm.includes(anchorSection) ||
               this.areSimilarTerms(searchTerm, anchorText);
      });
      
      if (anchorMatch) {
        // Return full URL with anchor for single-page navigation
        const baseUrl = this.websiteBaseUrl ? this.ensureProtocol(this.websiteBaseUrl) : null;
        const fullUrl = anchorMatch.fullUrl || (baseUrl ? `${baseUrl}${anchorMatch.anchor}` : null);

        if (!fullUrl) {
          return null;
        }

        console.log(`URL Mapper: Anchor match for "${pageTitle}" -> ${fullUrl}`);
        return fullUrl;
      }
    }
    
    // PRIORITY 3: Try exact title match from scraped data
    const exactMatch = this.mappings.find(
      m => m.pageTitle.toLowerCase() === searchTerm
    );
    
    if (exactMatch) {
      const norm = this.normalizeUrl(exactMatch.websiteUrl);
      console.log(`URL Mapper: Exact match for "${pageTitle}" -> ${norm || exactMatch.websiteUrl}`);
      return norm || exactMatch.websiteUrl;
    }

    // PRIORITY 4: Try fuzzy matching for common voice commands
    const fuzzyMatches = this.mappings.filter(m => {
      const titleLower = m.pageTitle.toLowerCase();
      return titleLower.includes(searchTerm) || 
             searchTerm.includes(titleLower) ||
             this.areSimilarTerms(searchTerm, titleLower);
    });

    if (fuzzyMatches.length > 0) {
      // Sort by relevance (shorter titles are often more specific)
      fuzzyMatches.sort((a, b) => a.pageTitle.length - b.pageTitle.length);
      const norm = this.normalizeUrl(fuzzyMatches[0].websiteUrl);
      console.log(`URL Mapper: Fuzzy match for "${pageTitle}" -> ${norm || fuzzyMatches[0].websiteUrl}`);
      return norm || fuzzyMatches[0].websiteUrl;
    }

    // PRIORITY 5: Try to find in knowledge base content and extract URL
    const page = this.knowledgeBase.find(
      p => p.title.toLowerCase().includes(searchTerm) ||
           searchTerm.includes(p.title.toLowerCase()) ||
           this.areSimilarTerms(searchTerm, p.title.toLowerCase())
    );

    if (page?.url) {
      const norm = this.normalizeUrl(page.url);
      console.log(`URL Mapper: KB match for "${pageTitle}" -> ${norm || page.url}`);
      return norm || page.url;
    }

    console.warn(`⚠️ URL Mapper: No navigation target found for "${pageTitle}"`);
    return null;
  }

  getAvailableNavigationLabels(limit = 6): string[] {
    const labels = new Set<string>();

    Object.keys(this.navigationMapping).forEach(key => {
      if (key) labels.add(this.formatDisplayLabel(key));
    });

    this.mappings.forEach(mapping => {
      if (mapping.pageTitle) labels.add(this.formatDisplayLabel(mapping.pageTitle));
    });

    this.anchorLinks.forEach(anchor => {
      if (anchor.text) labels.add(this.formatDisplayLabel(anchor.text));
    });

    return Array.from(labels).slice(0, limit);
  }

  private formatDisplayLabel(value: string): string {
    if (!value) return value;

    const cleaned = value
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) return value;

    return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private areSimilarTerms(term1: string, term2: string): boolean {
    // Check for common variations and synonyms
    const synonyms: { [key: string]: string[] } = {
      'contact': ['contact us', 'get in touch', 'reach out', 'reach us', 'call us', 'email us', 'contact information', 'contact info', 'get contact information', 'get contact info'],
      'about': ['about us', 'who we are', 'our story', 'company info'],
      'services': ['what we do', 'our services', 'offerings'],
      'support': ['help', 'assistance', 'customer support', 'get support'],
      'team': ['our team', 'staff', 'people'],
      'pricing': ['plans', 'rates', 'packages'],
      'portfolio': ['work', 'projects'],
      'testimonials': ['reviews', 'feedback'],
      'careers': ['jobs', 'career'],
      'appointment': ['book', 'book now', 'schedule', 'schedule demo', 'book appointment', 'schedule appointment', 'consultation', 'book consultation']
    };

    for (const [key, values] of Object.entries(synonyms)) {
      if ((term1 === key && values.includes(term2)) || 
          (term2 === key && values.includes(term1)) ||
          (values.includes(term1) && values.includes(term2))) {
        return true;
      }
    }

    return false;
  }

  isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Smart navigation logic - prioritizes anchor links for single-page sites, then actual website URLs
  async getNavigationTarget(searchTerm: string): Promise<{
    type: 'website' | 'widget' | 'anchor';
    url?: string;
    anchor?: string;
    scrollToSection?: boolean;
    page?: KnowledgeBasePage;
  }> {
    // PRIORITY 1: Check for anchor link matches (single-page navigation)
    if (this.anchorLinks.length > 0) {
      const anchorMatch = this.anchorLinks.find(anchor => {
        const anchorText = anchor.text.toLowerCase();
        const anchorSection = anchor.section.toLowerCase();
        const search = searchTerm.toLowerCase();
        return anchorText.includes(search) || 
               search.includes(anchorText) ||
               anchorSection.includes(search) ||
               search.includes(anchorSection) ||
               this.areSimilarTerms(search, anchorText);
      });
      
      if (anchorMatch) {
        const baseUrl = this.websiteBaseUrl.startsWith('http') 
          ? this.websiteBaseUrl 
          : `https://${this.websiteBaseUrl}`;
        
        console.log(`Navigation Target: Anchor link for "${searchTerm}" -> ${anchorMatch.anchor}`);
        return {
          type: 'anchor',
          anchor: anchorMatch.anchor,
          url: anchorMatch.fullUrl || baseUrl,
          scrollToSection: true
        };
      }
    }
    
    // PRIORITY 2: Try website URL navigation
    const websiteUrl = this.getWebsiteURL(searchTerm);
    
    // Validate URL isn't obviously wrong (404 prevention)
    if (websiteUrl) {
      if (!this.isValidURL(websiteUrl)) {
        console.warn(`⚠️ Invalid navigation URL for "${searchTerm}": ${websiteUrl}, redirecting to homepage`);
        // Return homepage instead of invalid URL
        const homepage = this.websiteBaseUrl.startsWith('http') 
          ? this.websiteBaseUrl 
          : `https://${this.websiteBaseUrl}`;
        return { type: 'website', url: homepage };
      }
      
      // Check for undefined or malformed URL patterns
      if (websiteUrl.includes('undefined') || !websiteUrl.startsWith('http')) {
        console.warn(`⚠️ Malformed navigation URL for "${searchTerm}": ${websiteUrl}, redirecting to homepage`);
        const homepage = this.websiteBaseUrl.startsWith('http') 
          ? this.websiteBaseUrl 
          : `https://${this.websiteBaseUrl}`;
        return { type: 'website', url: homepage };
      }
      
      console.log(`✅ Valid navigation URL for "${searchTerm}" -> ${websiteUrl}`);
      return { type: 'website', url: websiteUrl };
    }

    // PRIORITY 3: Fallback to widget navigation if page found in knowledge base
    const page = this.knowledgeBase.find(
      p => p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (page) {
      console.log(`ℹ️ No URL found for "${searchTerm}", showing in widget`);
      return { type: 'widget', page };
    }

    // LAST RESORT: No match found anywhere - redirect to homepage
    console.warn(`⚠️ No navigation target found for "${searchTerm}", redirecting to homepage`);
    const homepage = this.websiteBaseUrl.startsWith('http') 
      ? this.websiteBaseUrl 
      : `https://${this.websiteBaseUrl}`;
    return { type: 'website', url: homepage };
  }
  
  // Navigate to anchor section (scroll on single-page sites)
  navigateToAnchor(anchor: string, baseUrl?: string): boolean {
    try {
      if (this.isParentNavigationAvailable()) {
        const url = baseUrl || this.websiteBaseUrl;
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        
        // Post scroll message to parent window
        window.parent.postMessage({
          type: 'VOICE_SCROLL',
          anchor: anchor,
          url: fullUrl,
          source: 'voice-assistant'
        }, '*');
        
        console.log(`Posted scroll message for anchor: ${anchor}`);
        return true;
      }
    } catch (error) {
      console.warn('Failed to navigate to anchor:', error);
    }
    return false;
  }

  // Check if parent window navigation is available
  isParentNavigationAvailable(): boolean {
    try {
      return window.parent !== window && window.parent.location.href !== undefined;
    } catch {
      return false;
    }
  }

  // Attempt to navigate parent window
  navigateParentWindow(url: string): boolean {
    try {
      if (this.isParentNavigationAvailable()) {
        window.parent.postMessage({
          type: 'VOICE_NAVIGATE',
          url: url,
          source: 'voice-assistant'
        }, '*');
        return true;
      }
    } catch (error) {
      console.warn('Failed to navigate parent window:', error);
    }
    return false;
  }
}