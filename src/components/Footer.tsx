import { Link } from "react-router-dom";
import { Github, Twitter, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { GmailIcon, PhoneCallIcon, MapPinIcon, LinkedInIcon } from "@/components/ui/brand-icons";
import { Separator } from "@/components/ui/separator";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_ADDRESS, MAILTO_SUPPORT, TEL_SUPPORT, LINKEDIN_URL } from "@/config/contact";
export const Footer = () => {
  const currentYear = new Date().getFullYear();
  return <footer className="bg-background border-t" role="contentinfo">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Link to="/" aria-label="TalkWeb Home">
                <img src="/lovable-uploads/d8670dc7-02cf-487b-8267-ebcdb13bffb5.png" alt="TalkWeb Logo" className="w-24 h-24 hover:opacity-80 transition-opacity" />
              </Link>
            </div>
            <p className="text-muted-foreground text-sm"><p className="text-muted-foreground text-sm">Give Any Link a Voice.</p></p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
                <span className="sr-only">Twitter</span>
              </a>
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#0A66C2] transition-colors">
                <LinkedInIcon className="w-5 h-5" />
                <span className="sr-only">LinkedIn</span>
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h3 className="font-semibold">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/features" className="text-muted-foreground hover:text-primary transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/use-cases" className="text-muted-foreground hover:text-primary transition-colors">
                  Use Cases
                </Link>
              </li>
              <li>
                <Link to="/languages" className="text-muted-foreground hover:text-primary transition-colors">
                  Languages
                </Link>
              </li>
              <li>
                <Link to="/book-demo" className="text-muted-foreground hover:text-primary transition-colors">
                  Book a Demo
                </Link>
              </li>
              <li>
                <Link to="/business" className="text-muted-foreground hover:text-primary transition-colors">
                  For Business
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="font-semibold">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/help-center" className="text-muted-foreground hover:text-primary transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/installation-guide" className="text-muted-foreground hover:text-primary transition-colors">
                  Installation Guide
                </Link>
              </li>
              <li>
                <Link to="/feedback" className="text-muted-foreground hover:text-primary transition-colors">
                  Send Feedback
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="font-semibold">Contact</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <GmailIcon className="w-4 h-4" />
                <a href={MAILTO_SUPPORT} className="hover:text-primary transition-colors" aria-label="Email support">{SUPPORT_EMAIL}</a>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <PhoneCallIcon className="w-4 h-4" />
                <a href={TEL_SUPPORT} className="hover:text-primary transition-colors" aria-label="Call support">{SUPPORT_PHONE}</a>
              </div>
              <div className="flex items-start space-x-2 text-muted-foreground">
                <MapPinIcon className="w-4 h-4 mt-0.5" />
                <span>{SUPPORT_ADDRESS}</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link to="/accessibility" className="hover:text-primary transition-colors">
              Accessibility
            </Link>
            <Link to="/cookie-policy" className="hover:text-primary transition-colors">
              Cookie Policy
            </Link>
          </div>
          
          <div className="text-sm text-muted-foreground">
            © {currentYear} TalkWeb. All rights reserved.
          </div>
        </div>
      </div>
    </footer>;
};