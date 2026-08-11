import LegalLayout from "@/talkstay/pages/legal/LegalLayout";
import { SUPPORT_EMAIL, MAILTO_SUPPORT } from "@/config/contact";

/** High-level DPA overview for hotels — not a substitute for a signed DPA. */
export default function DataProcessingPage() {
  return (
    <LegalLayout title="Data Processing Overview">
      <section>
        <h2>1. Roles</h2>
        <p>
          For guest operational data processed through a property’s TalkStay account, the <strong>property
          (hotel / operator)</strong> is generally the controller, and <strong>TalkWeb</strong> (providing
          TalkStay) is the processor. For TalkStay account administration and platform security, TalkWeb may
          act as an independent controller.
        </p>
        <p>
          Enterprise customers may request a signed Data Processing Agreement (DPA). Contact{" "}
          <a href={MAILTO_SUPPORT}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>2. Subject matter</h2>
        <p>
          Processing guest and staff communications, room service/request tickets, knowledge used by the
          assistant, and related operational metadata to deliver TalkStay features.
        </p>
      </section>

      <section>
        <h2>3. Duration</h2>
        <p>
          For the term of the subscription and a limited post-termination period for backup and legal holds,
          unless earlier deletion is agreed in writing.
        </p>
      </section>

      <section>
        <h2>4. Nature and purpose</h2>
        <ul>
          <li>Host and route guest requests to staff</li>
          <li>Provide chat/voice assistance using configured knowledge</li>
          <li>Send notifications and generate operational insights</li>
          <li>Secure the service and prevent abuse</li>
        </ul>
      </section>

      <section>
        <h2>5. Types of personal data</h2>
        <p>
          Identifiers (email, name), room/unit association, message content, device tokens, usage logs, and
          similar operational data. Special category data should not be submitted into TalkStay.
        </p>
      </section>

      <section>
        <h2>6. Data subjects</h2>
        <p>Guests, property staff, and authorised administrators.</p>
      </section>

      <section>
        <h2>7. Subprocessors</h2>
        <p>
          We use carefully selected subprocessors for hosting, authentication, email, push delivery, and AI/voice
          features. A current list is available on request. We remain responsible for subprocessors we engage
          under GDPR Article 28-style terms.
        </p>
      </section>

      <section>
        <h2>8. Security measures</h2>
        <ul>
          <li>Encryption in transit (TLS)</li>
          <li>Access controls and role-based staff permissions</li>
          <li>Room-scoped guest tokens and optional check-in codes</li>
          <li>Monitoring, backups, and vulnerability management appropriate to the service</li>
        </ul>
      </section>

      <section>
        <h2>9. International transfers</h2>
        <p>
          Where personal data is transferred outside the UK/EEA, we implement appropriate safeguards such as
          Standard Contractual Clauses where required.
        </p>
      </section>

      <section>
        <h2>10. Assistance</h2>
        <p>
          We assist controllers with data subject requests, security incidents, and DPIA inputs relating to
          TalkStay, as described in a signed DPA or as required by applicable law.
        </p>
      </section>
    </LegalLayout>
  );
}
