import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SUPPORT_EMAIL, SUPPORT_ADDRESS } from "@/config/contact";

export const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 py-12">
      <div className="container max-w-4xl mx-auto px-4">
        <Card className="p-8">
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold">Privacy Policy</h1>
              <p className="text-muted-foreground">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  We collect information you provide directly to us, such as when you create an account, 
                  set up voice assistants, or contact us for support.
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Account information (email address, name)</li>
                  <li>Voice assistant configurations and settings</li>
                  <li>Website URLs and integration data</li>
                  <li>Payment information (processed securely through Stripe)</li>
                  <li>Support communications</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. How We Use Your Information</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>We use the information we collect to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process payments and manage subscriptions</li>
                  <li>Send you technical notices and support messages</li>
                  <li>Respond to your comments and questions</li>
                  <li>Analyze usage patterns to improve user experience</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. Information Sharing</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  We do not sell, trade, or otherwise transfer your personal information to third parties, 
                  except as described in this policy:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>With service providers who assist in our operations (e.g., Stripe for payments)</li>
                  <li>When required by law or to protect our rights</li>
                  <li>With your consent</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">4. Data Security</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  We implement appropriate security measures to protect your personal information against 
                  unauthorized access, alteration, disclosure, or destruction.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Voice Data Processing</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Voice interactions are processed using secure third-party services (OpenAI, ElevenLabs). 
                  Voice data is not permanently stored and is used only to provide the voice assistant functionality.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">6. Google Calendar API Data Use</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  TalkWeb uses Google APIs only to provide calendar scheduling features. We request the minimum access necessary to
                  check availability (free/busy) and create calendar events on your behalf after you authorize access via OAuth 2.0.
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Purpose: check available time slots and schedule appointments you request</li>
                  <li>Data handled: free/busy information, calendar ID, and event details you provide</li>
                  <li>Storage: we do not store calendar contents; we may store event IDs and tokens securely to complete bookings</li>
                  <li>Control: you can revoke access at any time in your Google Account permissions or within TalkWeb settings</li>
                  <li>Policy: our use of Google data adheres to the Google API Services User Data Policy, including Limited Use requirements</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. Google OAuth & Social Sign-In Data Use</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  When you sign in with Google, LinkedIn, or Apple, we request minimal information to authenticate your identity.
                  For Google, we request the scopes: <code>openid</code>, <code>email</code>, and <code>profile</code>.
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Purpose: strictly for authentication and account creation.</li>
                  <li>Data handled: your email, basic profile, and a provider user ID.</li>
                  <li>Storage: we store your user ID and email to maintain your account. We do not store your password for social sign-ins.</li>
                  <li>Sharing: we do not sell or share social sign-in data with third parties.</li>
                  <li>Control: you can revoke access at any time from your Google Account permissions page.</li>
                </ul>
                <p>
                  Our use of Google data adheres to the Google API Services User Data Policy, including the Limited Use requirements.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">8. Cookies and Tracking</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  We use cookies and similar tracking technologies to improve your experience on our website. You can control cookie settings through your browser.
                  We also use Google Tag Manager (GTM) to deploy analytics and measurement tags. GTM may set cookies solely to ensure reliable tag delivery.
                </p>
                <p>
                  For details, see our <a href="/cookie-policy" className="underline hover:text-primary">Cookie Policy</a>.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">9. Your Rights</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Delete your data</li>
                  <li>Export your data</li>
                  <li>Withdraw consent for data processing</li>
                </ul>
                <p>
                  Account deletion: You can request deletion of your account and associated personal data by contacting us at {SUPPORT_EMAIL}. We will confirm and process your request promptly, subject to legal obligations.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">10. Contact Us</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  If you have questions about this Privacy Policy, please contact us at:
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p>Email: {SUPPORT_EMAIL}</p>
                  <p>Address: {SUPPORT_ADDRESS}</p>
                </div>
              </div>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
};