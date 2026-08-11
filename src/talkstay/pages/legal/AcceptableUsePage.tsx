import LegalLayout from "@/talkstay/pages/legal/LegalLayout";
import { SUPPORT_EMAIL, MAILTO_SUPPORT } from "@/config/contact";

export default function AcceptableUsePage() {
  return (
    <LegalLayout title="Acceptable Use Policy">
      <section>
        <h2>1. Purpose</h2>
        <p>
          This Acceptable Use Policy (“AUP”) protects guests, properties, and TalkStay infrastructure. It
          applies to all users of TalkStay, including demos.
        </p>
      </section>

      <section>
        <h2>2. Prohibited activities</h2>
        <ul>
          <li>Scraping, crawling, bulk downloading, or harvesting data from TalkStay, demos, guest rooms, or live views beyond ordinary interactive use</li>
          <li>Copying, mirroring, or republishing TalkStay UI, demos, or content for competing products without written permission</li>
          <li>Attempting to bypass authentication, room tokens, check-in codes, or role restrictions</li>
          <li>Probing, scanning, or load-testing production systems without prior written approval</li>
          <li>Uploading malware, or using the assistant to spam, harass, or defraud guests or staff</li>
          <li>Storing or soliciting illegal content, or sensitive payment/ID data through guest chat contrary to our guidance</li>
          <li>Reselling access or sharing login credentials outside your organisation</li>
          <li>Using automated bots to create accounts or generate artificial traffic</li>
        </ul>
      </section>

      <section>
        <h2>3. Property responsibilities</h2>
        <ul>
          <li>Keep knowledge content accurate and lawful</li>
          <li>Train staff not to share guest personal data beyond operational need</li>
          <li>Use Public QR only for genuinely shared spaces</li>
          <li>Honour guest privacy notices required for your jurisdiction</li>
        </ul>
      </section>

      <section>
        <h2>4. Enforcement</h2>
        <p>
          We may investigate violations, throttle or block traffic, suspend accounts, and pursue legal remedies.
          Report abuse to <a href={MAILTO_SUPPORT}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
