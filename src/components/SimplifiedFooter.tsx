import { Link } from "react-router-dom";

interface SimplifiedFooterProps {
  logoUrl?: string | null;
  businessName?: string;
  hideDefaultBranding?: boolean;
}

export const SimplifiedFooter = ({ logoUrl, businessName, hideDefaultBranding }: SimplifiedFooterProps) => {
  const defaultLogo = "/lovable-uploads/d8670dc7-02cf-487b-8267-ebcdb13bffb5.png";
  
  // If user has uploaded a logo (white-labeled), show their branding only
  const isWhiteLabeled = !!logoUrl;
  const displayLogo = logoUrl || defaultLogo;
  const altText = logoUrl ? `${businessName || 'Business'} Logo` : "TalkWeb Logo";
  
  // If white-labeled and hideDefaultBranding is true, don't show any footer
  if (isWhiteLabeled && hideDefaultBranding) {
    return null;
  }
  
  return (
    <footer className="bg-background border-t">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col justify-center items-center gap-2">
          {isWhiteLabeled ? (
            // White-labeled: Show client's logo without link to TalkWeb
            <div className="flex flex-col items-center gap-1">
              <img 
                src={displayLogo} 
                alt={altText} 
                className="w-16 h-16 hover:opacity-80 transition-opacity object-contain" 
              />
              {businessName && (
                <span className="text-sm text-muted-foreground">{businessName}</span>
              )}
            </div>
          ) : (
            // Default: Show TalkWeb branding with link
            <Link to="/" aria-label="TalkWeb Home">
              <img 
                src={displayLogo} 
                alt={altText} 
                className="w-16 h-16 hover:opacity-80 transition-opacity object-contain" 
              />
            </Link>
          )}
          
          {/* Powered by text - only show if not white-labeled */}
          {!isWhiteLabeled && (
            <p className="text-xs text-muted-foreground">
              Powered by <Link to="/" className="hover:text-primary transition-colors">TalkWeb</Link>
            </p>
          )}
        </div>
      </div>
    </footer>
  );
};
