import LegalLayout from "@/talkstay/pages/legal/LegalLayout";

export default function CookiePolicyPage() {
  return (
    <LegalLayout title="Cookie Policy">
      <section>
        <h2>1. What we use</h2>
        <p>
          TalkStay uses cookies, local storage, and similar technologies to run the product securely and
          remember preferences. This policy explains categories and choices.
        </p>
      </section>

      <section>
        <h2>2. Essential (always on)</h2>
        <ul>
          <li>Authentication and session security for property accounts</li>
          <li>CSRF/security tokens and load balancing</li>
          <li>Guest device claim / room token storage so the correct room assistant opens</li>
          <li>Demo sandbox state stored in your browser (not a live hotel database)</li>
          <li>Cookie/consent preference itself, when shown</li>
        </ul>
        <p>These are required for the service to function and cannot be disabled in-product.</p>
      </section>

      <section>
        <h2>3. Functional</h2>
        <ul>
          <li>UI preferences (for example rooms list vs card view)</li>
          <li>Alert sound / notification opt-in state on a staff device</li>
          <li>Theme or locale preferences where offered</li>
        </ul>
      </section>

      <section>
        <h2>4. Analytics and measurement</h2>
        <p>
          We may use privacy-conscious analytics to understand marketing page performance. Where required by
          law, non-essential analytics cookies run only after consent. We do not use advertising cookies to
          track guests across unrelated sites for third-party ads.
        </p>
      </section>

      <section>
        <h2>5. Your choices</h2>
        <ul>
          <li>Browser settings can block or delete cookies; some features may stop working</li>
          <li>Staff can revoke browser notification permission in OS/browser settings</li>
          <li>Clearing site data removes demo sandbox progress on that device</li>
        </ul>
      </section>

      <section>
        <h2>6. More information</h2>
        <p>
          Personal data processed via these technologies is described in our{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
