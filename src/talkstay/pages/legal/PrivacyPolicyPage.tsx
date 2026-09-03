import LegalLayout from "@/talkstay/pages/legal/LegalLayout";
import { SUPPORT_EMAIL, MAILTO_SUPPORT } from "@/config/contact";

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <section>
        <h2>1. Who we are</h2>
        <p>
          TalkStay (“we”, “us”) is a hospitality operations product provided by TalkWeb. This Privacy Policy
          explains how we collect, use, store, and share personal data when you visit talkstay.talkweb.io,
          create a property account, invite staff, run demos, or use the guest room assistant.
        </p>
        <p>
          For privacy requests email{" "}
          <a href={MAILTO_SUPPORT}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>2. Scope</h2>
        <p>This policy covers:</p>
        <ul>
          <li>Property owners, managers, and staff using the TalkStay dashboard</li>
          <li>Guests who scan a room QR or use the in-room assistant</li>
          <li>Visitors to our marketing site and interactive demos</li>
          <li>Prospects viewing a live campaign share link</li>
        </ul>
        <p>
          When a hotel uses TalkStay for guest messaging, the hotel is typically the <strong>data controller</strong>{" "}
          for guest stay data, and TalkWeb acts as a <strong>data processor</strong>. See our{" "}
          <a href="/data-processing">Data Processing</a> page.
        </p>
      </section>

      <section>
        <h2>3. Data we collect</h2>
        <ul>
          <li><strong>Account data:</strong> name, email, role, department, property name and profile</li>
          <li><strong>Operational data:</strong> room/unit details, request tickets, status events, staff replies, ratings, escalation notes</li>
          <li><strong>Guest interaction data:</strong> messages, voice session tokens, device claim tokens, check-in codes, optional guest email for code delivery or stay-update opt-in (also used for optional return-guest offers if the property sends them)</li>
          <li><strong>Knowledge content:</strong> website URLs, uploaded documents, FAQs and media you add for the assistant</li>
          <li><strong>Technical data:</strong> IP address, device/browser type, approximate location from IP, cookies/local storage, push subscription endpoints</li>
          <li><strong>Billing data:</strong> processed by our payment provider (e.g. Stripe); we do not store full card numbers</li>
        </ul>
      </section>

      <section>
        <h2>4. How we use data</h2>
        <ul>
          <li>Provide, secure, and improve TalkStay (routing, alerts, insights, voice/chat)</li>
          <li>Authenticate users and enforce roles / department locks</li>
          <li>Send operational emails and optional push/sound alerts</li>
          <li>Send property-authored return-guest / offer emails when the property chooses to (always with unsubscribe; not an automatic newsletter)</li>
          <li>Prevent abuse, duplicates, and fraud</li>
          <li>Comply with law and respond to lawful requests</li>
          <li>With consent or legitimate interest, improve product analytics (aggregated where practical)</li>
        </ul>
      </section>

      <section>
        <h2>5. Legal bases (EEA/UK)</h2>
        <ul>
          <li><strong>Contract:</strong> delivering the service you subscribe to</li>
          <li><strong>Legitimate interests:</strong> securing the platform, product improvement, B2B marketing to prospects who request demos</li>
          <li><strong>Consent:</strong> non-essential cookies, certain marketing, browser notifications where required</li>
          <li><strong>Legal obligation:</strong> tax, accounting, and regulatory duties</li>
        </ul>
      </section>

      <section>
        <h2>6. Voice and AI processing</h2>
        <p>
          Guest and staff voice/text may be processed by subprocessors (for example speech-to-text, language
          models, and text-to-speech providers) solely to deliver the assistant and ops features. We configure
          providers to limit retention where the product allows. Do not instruct guests to share payment card
          PAN, government ID numbers, or health data through the assistant.
        </p>
      </section>

      <section>
        <h2>7. Sharing</h2>
        <p>We do not sell personal data. We share data with:</p>
        <ul>
          <li>Infrastructure and AI subprocessors under contract (hosting, auth, email, voice, analytics)</li>
          <li>The property that operates the relevant hotel account (staff see guest requests for their property)</li>
          <li>Authorities when legally required</li>
          <li>Professional advisors under confidentiality</li>
        </ul>
      </section>

      <section>
        <h2>8. International transfers</h2>
        <p>
          We may process data in the UK, EEA, and other countries where our providers operate. Where required,
          we use appropriate safeguards (such as Standard Contractual Clauses) for transfers outside the UK/EEA.
        </p>
      </section>

      <section>
        <h2>9. Retention</h2>
        <p>
          We retain account and operational records for as long as the property subscription is active and for a
          reasonable period afterward for backups, disputes, and legal requirements. Demo sandbox data may be
          stored only in your browser (local storage) and is not a production hotel account. You may request
          deletion via {SUPPORT_EMAIL}.
        </p>
      </section>

      <section>
        <h2>10. Your rights</h2>
        <p>
          Depending on your location (including UK GDPR, EU GDPR, and CCPA/CPRA), you may have rights to access,
          correct, delete, restrict, port, or object to certain processing, and to withdraw consent. California
          residents may request disclosure of categories of personal information collected and opt out of “sale”
          or “sharing” as defined by law — we do not sell personal information. Contact{" "}
          <a href={MAILTO_SUPPORT}>{SUPPORT_EMAIL}</a>. You may also lodge a complaint with your local supervisory
          authority (ICO in the UK).
        </p>
      </section>

      <section>
        <h2>11. Children</h2>
        <p>
          TalkStay is built for hospitality businesses and adult guests. We do not knowingly collect data from
          children under 16 for marketing accounts. Properties should not use TalkStay to target children.
        </p>
      </section>

      <section>
        <h2>12. Cookies</h2>
        <p>
          See our <a href="/cookies">Cookie Policy</a> for details on essential and optional cookies/local storage.
        </p>
      </section>

      <section>
        <h2>13. Changes</h2>
        <p>
          We may update this policy. Material changes will be posted on this page with a new “Last updated” date.
          Continued use after changes constitutes acceptance where permitted by law.
        </p>
      </section>
    </LegalLayout>
  );
}
