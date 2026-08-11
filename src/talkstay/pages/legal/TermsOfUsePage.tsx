import LegalLayout from "@/talkstay/pages/legal/LegalLayout";
import { SUPPORT_EMAIL, MAILTO_SUPPORT } from "@/config/contact";

export default function TermsOfUsePage() {
  return (
    <LegalLayout title="Terms of Use">
      <section>
        <h2>1. Agreement</h2>
        <p>
          These Terms of Use (“Terms”) govern access to TalkStay websites, demos, guest assistants, and the
          property dashboard operated by TalkWeb (“TalkStay”, “we”). By creating an account, using a demo, or
          accessing the service, you agree to these Terms. If you use TalkStay on behalf of a hotel or company,
          you represent that you have authority to bind that organisation.
        </p>
      </section>

      <section>
        <h2>2. The service</h2>
        <p>
          TalkStay provides in-room guest assistance (QR, chat/voice), staff operations queues, knowledge tools,
          branding, and related hospitality features. Features may change as we improve the product. Demos are
          illustrative sandboxes and may not reflect every live capability or SLA.
        </p>
      </section>

      <section>
        <h2>3. Accounts and access</h2>
        <ul>
          <li>Keep login credentials confidential and notify us of unauthorised use</li>
          <li>Owners/managers are responsible for staff invites, roles, and department assignments</li>
          <li>You must provide accurate property information and lawful knowledge content</li>
          <li>We may suspend accounts that threaten security, other customers, or legal compliance</li>
        </ul>
      </section>

      <section>
        <h2>4. Acceptable use</h2>
        <p>
          You must comply with our <a href="/acceptable-use">Acceptable Use Policy</a>. You may not scrape,
          copy, reverse engineer, overload, or misuse TalkStay, demos, or guest surfaces except as allowed by
          mandatory law.
        </p>
      </section>

      <section>
        <h2>5. Customer content and guest data</h2>
        <p>
          You retain rights to your property content (branding, knowledge, room data). You grant us a licence to
          host and process that content solely to provide TalkStay. You are responsible for having a lawful basis
          to process guest data and for your privacy notices to guests. Processing details are in our{" "}
          <a href="/privacy">Privacy Policy</a> and <a href="/data-processing">Data Processing</a> overview.
        </p>
      </section>

      <section>
        <h2>6. Fees</h2>
        <p>
          Paid plans are billed according to the order form or checkout terms presented at purchase. Fees are
          non-refundable except where required by law or expressly stated. Taxes may apply. We may change pricing
          with notice for renewal periods.
        </p>
      </section>

      <section>
        <h2>7. Intellectual property</h2>
        <p>
          TalkStay software, designs, trademarks, and documentation remain TalkWeb property. These Terms do not
          transfer ownership. Feedback you provide may be used to improve the product without obligation to you.
        </p>
      </section>

      <section>
        <h2>8. Third-party services</h2>
        <p>
          The service may rely on cloud, email, push, and AI providers. Their outages or policy changes can
          affect TalkStay. Links to third-party sites are not endorsements.
        </p>
      </section>

      <section>
        <h2>9. Disclaimers</h2>
        <p>
          TalkStay is provided “as is” and “as available”. We do not warrant uninterrupted or error-free
          operation, or that the assistant will always give complete answers. TalkStay is not a substitute for
          emergency services, medical, legal, or safety-critical systems. Properties remain responsible for guest
          safety and staff procedures.
        </p>
      </section>

      <section>
        <h2>10. Liability</h2>
        <p>
          To the fullest extent permitted by law, TalkWeb is not liable for indirect, incidental, special,
          consequential, or lost-profit damages. Our aggregate liability arising from TalkStay is limited to the
          fees paid to us for TalkStay in the twelve (12) months before the claim. Nothing excludes liability
          that cannot be limited under applicable law (including death or personal injury caused by negligence,
          or fraud).
        </p>
      </section>

      <section>
        <h2>11. Indemnity</h2>
        <p>
          You will defend and indemnify TalkWeb against claims arising from your content, your guest processing,
          your misuse of the service, or your violation of these Terms or law.
        </p>
      </section>

      <section>
        <h2>12. Term and termination</h2>
        <p>
          You may stop using TalkStay at any time. We may suspend or terminate for breach, non-payment, or risk
          to the platform. Upon termination, your licence ends; provisions that should survive (IP, liability,
          indemnity) continue.
        </p>
      </section>

      <section>
        <h2>13. Governing law</h2>
        <p>
          These Terms are governed by the laws of England and Wales, without regard to conflict-of-law rules.
          Courts of England and Wales have exclusive jurisdiction, except that we may seek injunctive relief
          anywhere, and consumers may have mandatory local rights that prevail.
        </p>
      </section>

      <section>
        <h2>14. Contact</h2>
        <p>
          Questions: <a href={MAILTO_SUPPORT}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
