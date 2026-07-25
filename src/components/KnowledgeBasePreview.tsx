import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Home, FileText, Phone, Info, Settings, Menu } from 'lucide-react';

interface KnowledgeBasePage {
  id: string;
  title: string;
  content: string;
  url?: string;
}

interface KnowledgeBasePreviewProps {
  knowledgeBase: {
    allPages: KnowledgeBasePage[];
    description?: string;
  };
  businessName: string;
  onPageChange?: (page: KnowledgeBasePage) => void;
}

const sanitizeContent = (content: string) => {
  if (!content) return '';

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/ on[a-z]+="[^"]*"/gi, '')
      .replace(/ on[a-z]+='[^']*'/gi, '');
  }

  const container = document.createElement('div');
  container.innerHTML = content;

  const blockedSelectors = [
    'script',
    'style',
    'link',
    'meta',
    'iframe',
    'object',
    'embed'
  ];

  blockedSelectors.forEach((selector) => {
    container.querySelectorAll(selector).forEach((element) => {
      element.remove();
    });
  });

  container.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attr) => {
      const attrName = attr.name.toLowerCase();
      const attrValue = attr.value;

      if (attrName.startsWith('on')) {
        element.removeAttribute(attr.name);
        return;
      }

      if (attrName === 'style') {
        element.removeAttribute(attr.name);
        return;
      }

      if (
        (attrName === 'href' || attrName === 'src') &&
        /^(javascript:|data:text\/html)/i.test(attrValue.trim())
      ) {
        element.removeAttribute(attr.name);
      }
    });
  });

  const body = container.querySelector('body');
  return body ? body.innerHTML : container.innerHTML;
};

const KnowledgeBasePreview: React.FC<KnowledgeBasePreviewProps> = ({
  knowledgeBase,
  businessName,
  onPageChange
}) => {
  const pages = knowledgeBase?.allPages ?? [];
  const [currentPage, setCurrentPage] = useState<KnowledgeBasePage | null>(null);
  const [showNavigation, setShowNavigation] = useState(false);

  const normalizeSegment = (value?: string | null) => {
    if (!value) return '';
    return value
      .toString()
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('?')[0]
      .split('#')[0]
      .replace(/\/+$/, '');
  };

  const findPageByTarget = (target: string) => {
    const trimmed = target?.trim();
    if (!trimmed) return null;

    const terms = new Set<string>();
    const normalized = normalizeSegment(trimmed);
    if (normalized) {
      terms.add(normalized);
      normalized.split('/').filter(Boolean).forEach(part => terms.add(part));
    }

    if (/^https?:/i.test(trimmed)) {
      try {
        const url = new URL(trimmed);
        const path = normalizeSegment(url.pathname || '/');
        if (path) {
          terms.add(path);
          path.split('/').filter(Boolean).forEach(part => terms.add(part));
        }
      } catch {}
    } else if (trimmed.startsWith('/')) {
      const path = normalizeSegment(trimmed);
      if (path) {
        terms.add(path);
        path.split('/').filter(Boolean).forEach(part => terms.add(part));
      }
    }

    const lower = trimmed.toLowerCase();
    terms.add(lower);

    for (const page of pages) {
      const title = (page.title || '').toLowerCase();
      const pageUrl = normalizeSegment(page.url || '');
      if (!page) continue;

      if (terms.has(pageUrl)) return page;
      if (terms.has(pageUrl.replace(/^\/+/, ''))) return page;
      if (terms.has(title)) return page;
      for (const term of terms) {
        if (!term) continue;
        if (title.includes(term) || pageUrl.includes(term)) {
          return page;
        }
      }
    }

    return null;
  };

  // Set initial page (home page)
  useEffect(() => {
    if (pages.length > 0) {
      // Try to find a home page first
      const homePage = pages.find(page =>
        page.title.toLowerCase().includes('home') ||
        page.title.toLowerCase().includes('index') ||
        page.url === '/' ||
        page.url === ''
      ) || pages[0];

      setCurrentPage(homePage);
      onPageChange?.(homePage);
    }
  }, [pages, onPageChange]);

  const navigateToPage = (page: KnowledgeBasePage) => {
    setCurrentPage(page);
    onPageChange?.(page);
    setShowNavigation(false);
  };

  const getPageIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('home') || lowerTitle.includes('index')) return <Home className="w-4 h-4" />;
    if (lowerTitle.includes('contact') || lowerTitle.includes('phone') || lowerTitle.includes('email')) return <Phone className="w-4 h-4" />;
    if (lowerTitle.includes('about') || lowerTitle.includes('who we are')) return <Info className="w-4 h-4" />;
    if (lowerTitle.includes('services') || lowerTitle.includes('what we do')) return <Settings className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  // Function to find and navigate to page by voice command
  const navigateByVoiceCommand = (searchTerm: string) => {
    if (!searchTerm) return null;

    const directMatch = findPageByTarget(searchTerm);
    if (directMatch) {
      navigateToPage(directMatch);
      return directMatch;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();

    // Smart matching for common page requests
    const pageMatches = pages.filter(page => {
      const title = page.title.toLowerCase();
      const content = (page.content || '').toLowerCase();

      const normalizedUrl = normalizeSegment(page.url);
      if (normalizedUrl && lowerSearchTerm.includes(normalizedUrl)) return true;
      if (normalizedUrl && normalizedUrl.includes(lowerSearchTerm)) return true;

      // Direct title match
      if (title.includes(lowerSearchTerm)) return true;
      
      // Common variations
      if (lowerSearchTerm.includes('contact') && (title.includes('contact') || title.includes('get in touch'))) return true;
      if (lowerSearchTerm.includes('about') && (title.includes('about') || title.includes('who we are'))) return true;
      if (lowerSearchTerm.includes('services') && (title.includes('services') || title.includes('what we do'))) return true;
      if (lowerSearchTerm.includes('home') && (title.includes('home') || title.includes('index'))) return true;
      if (lowerSearchTerm.includes('pricing') && (title.includes('pricing') || title.includes('plans') || title.includes('rates'))) return true;
      
      // Content-based matching
      if (content.includes(lowerSearchTerm)) return true;
      
      return false;
    });

    if (pageMatches.length > 0) {
      navigateToPage(pageMatches[0]);
      return pageMatches[0];
    }
    
    return null;
  };

  // Expose navigation function to parent components
  useEffect(() => {
    // Add a global function for voice navigation
    (window as any).navigateKnowledgeBasePage = navigateByVoiceCommand;
    (window as any).navigateKnowledgeBaseByUrl = findPageByTarget;
    (window as any).navigateKnowledgeBaseShowPage = (page: KnowledgeBasePage | null) => {
      if (page) {
        navigateToPage(page);
      }
      return page;
    };

    return () => {
      delete (window as any).navigateKnowledgeBasePage;
      delete (window as any).navigateKnowledgeBaseByUrl;
      delete (window as any).navigateKnowledgeBaseShowPage;
    };
  }, [pages]);

  if (!currentPage) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-4">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No knowledge base content available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* Navigation Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">
            {businessName}
          </Badge>
          <span className="text-sm text-muted-foreground">•</span>
          <h1 className="text-lg font-semibold">{currentPage.title}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {pages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNavigation(!showNavigation)}
              className="gap-2"
            >
              <Menu className="w-4 h-4" />
              Pages ({pages.length})
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Panel */}
      {showNavigation && pages.length > 0 && (
        <div className="border-b bg-muted/30 p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {pages.map((page) => (
              <Button
                key={page.id}
                variant={currentPage.id === page.id ? "default" : "ghost"}
                size="sm"
                onClick={() => navigateToPage(page)}
                className="justify-start gap-2 h-auto p-3"
              >
                {getPageIcon(page.title)}
                <span className="truncate text-xs">{page.title}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Page Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl mx-auto">
          <div className="prose prose-sm max-w-none">
            <h1 className="text-2xl font-bold mb-4">{currentPage.title}</h1>
            <div
              className="whitespace-pre-wrap text-sm leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: sanitizeContent(currentPage.content || '')
                  .replace(/\n/g, '<br>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
              }}
            />
          </div>
        </div>
      </ScrollArea>

      {/* Voice Navigation Instructions */}
      <div className="border-t bg-muted/20 p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>
            Try saying: "Go to contact page", "Show me about page", "Take me to services"
          </span>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBasePreview;