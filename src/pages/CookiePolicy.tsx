import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SUPPORT_EMAIL } from "@/config/contact";

export const CookiePolicy = () => {
  useEffect(() => {
    const title = "Cookie Policy | TalkWeb";
    document.title = title;
    const desc = "Learn how TalkWeb uses cookies and Google Tag Manager. Manage your preferences and understand our use of essential and analytics cookies.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);

    const canonicalHref = `${window.location.origin}/cookie-policy`;
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonicalHref);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 py-12">
      <div className="container max-w-4xl mx-auto px-4">
        <Card className="p-8">
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold">Cookie Policy</h1>
              <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            </div>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. What Are Cookies?</h2>
              <p className="text-muted-foreground">
                Cookies are small text files that are placed on your device to help the site provide a better user experience.
                They are widely used to make websites work, or work more efficiently, as well as to provide information to site owners.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. How We Use Cookies</h2>
              <div className="space-y-3 text-muted-foreground">
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Essential cookies</strong>: Required for core functionality like security and session management.</li>
                  <li><strong>Performance/analytics</strong>: We use Google Tag Manager (GTM) to manage tags on our site. GTM may deploy measurement tags that help us understand usage and improve the service.</li>
                  <li><strong>Functionality</strong>: Remembering your preferences to provide a better experience.</li>
                  <li><strong>Advertising</strong>: We do not currently use advertising cookies.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. Google Tag Manager (GTM)</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  We use Google Tag Manager to manage and deploy marketing and analytics tags. GTM itself does not collect personal data; it facilitates the loading of other tags. Any data collection occurs through the tags GTM deploys, such as analytics tools you opt into.
                </p>
                <p>
                  For more information, please review Google's policies and your browser's cookie settings.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">4. Managing Cookies</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  You can control and/or delete cookies as you wish by adjusting your browser settings. You can delete all cookies that are already on your device and you can set most browsers to prevent them from being placed.
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Instructions for Chrome, Firefox, Safari, and Edge are available in their respective help resources.</li>
                  <li>Note that disabling cookies may affect the functionality of this and many other websites that you visit.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Contact</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  If you have any questions about our use of cookies, contact us at {SUPPORT_EMAIL}.
                </p>
                <p>
                  For how we process personal data, see our <a href="/privacy-policy" className="underline hover:text-primary">Privacy Policy</a>.
                </p>
              </div>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CookiePolicy;
