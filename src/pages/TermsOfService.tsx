import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SUPPORT_EMAIL, SUPPORT_ADDRESS } from "@/config/contact";
export const TermsOfService = () => {
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 py-12">
      <div className="container max-w-4xl mx-auto px-4">
        <Card className="p-8">
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold">Terms of Service</h1>
              <p className="text-muted-foreground">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  By accessing and using TalkWeb services, you accept and agree to be bound by the terms 
                  and provision of this agreement.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. Service Description</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  TalkWeb provides AI-powered voice assistant services for websites, including:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Voice-enabled chat interfaces</li>
                  <li>Website integration tools</li>
                  <li>Analytics and reporting</li>
                  <li>Appointment booking functionality</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. User Accounts</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  You are responsible for maintaining the confidentiality of your account and password. 
                  You agree to accept responsibility for all activities under your account.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">4. Subscription and Billing</h2>
              <div className="space-y-3 text-muted-foreground">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Subscriptions are billed monthly or annually as selected</li>
                  <li>Payments are processed securely through Stripe</li>
                  <li>Cancellations take effect at the end of the current billing period</li>
                  <li>Refunds are provided according to our refund policy</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Acceptable Use</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>You agree not to use the service to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Violate any laws or regulations</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Transmit harmful or malicious content</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Use the service for spam or unsolicited communications</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">6. Intellectual Property</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  TalkWeb and its content are protected by copyright, trademark, and other intellectual 
                  property laws. You retain ownership of your content but grant us license to use it 
                  to provide our services.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. Service Availability</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  We strive to maintain high service availability but do not guarantee uninterrupted service. 
                  Scheduled maintenance will be communicated in advance when possible.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">8. Limitation of Liability</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  TalkWeb shall not be liable for any indirect, incidental, special, consequential, 
                  or punitive damages resulting from your use of the service.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">9. Termination</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Either party may terminate this agreement at any time. Upon termination, 
                  your access to the service will cease.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">10. Authentication and Third-Party Providers</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  You may authenticate using third-party providers such as Google, LinkedIn, or Apple. When you choose a social sign-in option,
                  we receive minimal information (e.g., email and basic profile) to create or sign you into your account. For Google, we use
                  the scopes <code>openid</code>, <code>email</code>, and <code>profile</code> for authentication only. Your use of these providers is also
                  subject to their respective terms and policies.
                </p>
                <p>
                  Our use of Google data adheres to the Google API Services User Data Policy, including the Limited Use requirements. See our
                  <a href="/privacy-policy" className="underline hover:text-primary">Privacy Policy</a> for details.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">11. Contact Information</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  For questions about these terms, contact us at:
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
    </div>;
};