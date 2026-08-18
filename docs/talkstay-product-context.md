# TalkStay — Master Product Context

**Purpose of this document.** Paste this whole file into a new ChatGPT chat as
grounding before asking it to build marketing campaigns, ads, landing copy,
sales decks, or outreach for TalkStay. It describes what the product actually
is and does.

**Rules for anyone (or any model) using this file:**

1. Everything under "What TalkStay is" through "Feature inventory" is **built
   and shipped**. You may state it as fact.
2. Everything under "Not built" is **false** — never imply it exists.
3. Everything under "Unknown — ask before claiming" is genuinely unknown to
   this document. **Do not invent numbers.** No made-up customer counts,
   response-time reductions, revenue uplift, star-rating gains, or ROI
   percentages. If a campaign needs a stat, mark it `[NEEDS DATA]` and move on.
4. This is a young product at version 1. Write like a credible newcomer, not
   like an established market leader.

---

## 1. What TalkStay is

**One line:** TalkStay is a voice-first guest service assistant for hotels and
short stays — a guest scans a QR code, speaks or types in their own language,
and the request becomes a tracked task on the right team's queue.

**Product name:** TalkStay, by TalkWeb.
**Live at:** talkstay.talkweb.io
**Category:** Guest experience / hotel operations software.

**The shape of it:**

- **For the guest:** a web page reached by scanning a QR code. No app download,
  no account, no password. Speak or type, in any language.
- **For the property:** a dashboard where those requests arrive as structured
  tasks, routed to the right department, tracked to completion.

TalkStay is deliberately **not** a chatbot on a website. Its output is not a
conversation — it's a task with a department, a location, a quantity, a status
and an owner.

---

## 2. The problem it solves

Three real problems, in the order they hurt:

**1. The front desk is a bottleneck.** A guest wants towels, so they call
reception. Reception writes it down, then relays it to housekeeping. The desk
spends its day as a switchboard, and every relay is a chance to lose the
request. TalkStay's framing for this: *"Stop being the middleman."*

**2. Guests don't complain — they leave a review.** Most unhappy guests say
nothing during the stay and everything afterwards, in public, permanently. By
the time the property learns about the problem, the guest has gone and the
damage is a star rating. This is the insight behind the mid-stay pulse check
(§4.7): *a guest shouldn't have to wait until they're angry enough to leave a
one-star review.*

**3. Language.** A guest who can't ask comfortably doesn't ask. Staff who can't
read the request can't act on it. TalkStay translates in both directions.

**Supporting friction:** small properties (Airbnb hosts, guest houses,
serviced apartments) have no front desk at all, so the "middleman" is the owner's
personal phone, at any hour.

---

## 3. Who it's for

**Property types the product explicitly supports** (this is a real setting in
the app that shapes its behaviour and advice):

| Type | Note |
|---|---|
| Hotel | The core case — multiple departments, shift staff |
| Serviced apartment / aparthotel | Fewer staff, more self-service |
| Airbnb / short-let | Often a single owner, no desk, remote |
| B&B / guest house | Owner-operated, small team |
| Hostel | High volume, public areas matter |
| Other | Catch-all |

**Buyer:** owner, general manager, or operations manager. For small properties
the buyer, the admin and the staff are the same person.

**Users:**
- **Guests** — never sign up, never trained, may not speak the local language.
- **Staff** — invited by email, assigned to a department and optionally to a
  specific area/outlet. Often on a phone, often mid-shift, often not desk-based.
- **Owners/managers** — dashboard, insights, branding, billing.

**Multi-property is supported.** One owner account can hold several properties
with a switcher between them.

---

## 4. How it works

### 4.1 The guest journey

1. A branded QR poster sits in the room (or at a bar, pool, or lobby).
2. The guest scans it. A web page opens — no download, no signup.
3. They **speak or type**, in their own language. Real-time voice is supported.
4. The assistant either **answers from the property's knowledge base** (Wi-Fi
   password, breakfast times, checkout) or **creates a service request**.
5. The guest can watch the request's status, get replies from staff, and
   confirm when it's done — or reopen it if it isn't.

**Public-area QRs** work differently from room QRs: since there's no room
number, the assistant asks where the guest is sitting (table number, sun
lounger) and attaches that to the task.

### 4.2 The staff journey

1. A new request arrives on the live queue and raises an alert — push
   notification, email, and an in-app sound.
2. Staff see a plain-language summary **translated into their own language**,
   with the department, the location and the quantity.
3. They move it through status: new → accepted → in progress → on the way →
   completed.
4. They can reply to the guest in the chat thread; the guest is notified.
5. The guest confirms completion. If they reopen it, staff are alerted again.

### 4.3 Departments

Eight built-in departments: **Housekeeping, Laundry, Kitchen, Bar, Maintenance,
Concierge, Front Desk, Duty Manager.**

Requests are routed to the right one automatically. Duty Manager has a special
role: negative sentiment is escalated *there*, not to the department being
complained about.

### 4.4 Knowledge base

The property's own information, so the assistant answers correctly instead of
guessing:

- Upload documents (PDF, Word) — parsed to text.
- Crawl the property's website.
- Search and edit entries inline.

### 4.5 Menus, orders and charges

- A **catalogue** per department — tap to add rather than typing "2 club
  sandwiches" mid-service.
- **Per-outlet menus and prices.** A pool bar and a lobby bar are separate
  outlets run by one bar team, and can carry the same drink at different
  prices. This avoids duplicating staff and alerts just to vary a price list.
- **Scan a menu to import it** — photograph it, or upload a PDF or document.
  Items are extracted, duplicates flagged, and nothing is saved until reviewed.
- **Guest folio** — chargeable items accumulate on the guest's bill, scoped to
  their stay, with a pay-now flow.
- **Log order / walk-in** — staff can log a request that arrived by phone or in
  person, so it's tracked like any other.

### 4.6 Staff management

- Invite staff by email; they set their own password.
- Assign to a department, and optionally to a **specific area within it** — so
  the pool bar team isn't alerted for lobby bar orders.

### 4.7 Mid-stay pulse check *(a genuine differentiator — lead with this)*

TalkStay asks guests how the stay is going **while they're still there**, and
classifies the answer against a fixed taxonomy of twelve issue types:

> Cleanliness · Staff attitude · Response time · Noise · Something broken ·
> Food & drink · Wi-Fi & tech · Check-in / check-out · Amenities · Room comfort
> · Value for money · General

Negative feedback is routed to the **Duty Manager** for recovery while the
guest is still on site. Issues are tracked over time in Insights, so a property
can see whether the thing they fixed actually stayed fixed.

**The marketing story:** turn the one-star review into a conversation you can
still win.

### 4.8 Insights

Analytics on volume, departments, response, and recurring issues, plus a
written business-intelligence brief tailored to the property type, and an
exportable report.

### 4.9 QR posters

- Branded poster generator — logo, colours, photo, and every line of copy
  editable.
- Prints at **A4** (doors, lobby walls), **A5** (desks, bedside), or **four A6
  cards per A4 sheet** (table cards, cut into four).
- **Bulk print** every room at once, each sheet stamped with its room number so
  a print run can be sorted without scanning every code.

### 4.10 Branding and white label

- Per-property logo, colours and copy on the guest experience, the sign-in page
  and emails.
- **White-label tier:** remove TalkStay's own branding entirely.
- **Custom email sender:** a property that verifies its domain can send guest
  emails from its own address, configured from the dashboard.

### 4.11 Alerts and notifications

- **Web push** to browser and installed app.
- **Email** notifications.
- **In-app alert sounds**, selectable, engineered so an iPhone's silent switch
  doesn't mute them — a real operational failure mode for a hotel.
- TalkStay is an **installable app (PWA)** on phones and tablets.

### 4.12 Try before you buy

- A **live demo mode** at `/demo` — a full working property, no signup.
- A **"Book a live demo"** form on the marketing site.

---

## 5. Feature inventory (checklist form)

Guest side: QR entry · no app/no signup · voice · text · any language ·
knowledge answers · service requests · status tracking · staff replies ·
completion confirm · reopen · mid-stay pulse · folio & pay · public-area
table capture · push notifications · check-in code.

Staff side: live queue · department routing · translated summaries · status
workflow · guest replies · alerts (push/email/sound) · log phone & walk-in
orders · menu catalogue · per-outlet pricing · menu scan import · area
assignment · staff invites.

Owner side: multi-property switcher · branding · white label · custom email
sender · QR poster designer · bulk poster printing · knowledge base · website
crawl · insights & BI brief · report export · live share link · demo mode.

Platform admin: properties · users · usage · AI performance · live links ·
demo requests · partner/referral program · platform settings.

---

## 6. Positioning

**Core promise:** *Ask once. Done.*

**Positioning statement:** For hotels and short-stay properties whose guests
have to chase the front desk for everything, TalkStay turns a spoken request in
any language into a tracked task on the right team's queue — so the desk stops
relaying messages and problems get fixed during the stay, not in the review.

**Existing brand lines already in the product** (reuse for consistency):
- "Ask once. Done."
- "Stop being the middleman."
- "A task, not a message."
- "Built for modern hospitality."
- "Ready when your guests are."
- "Built for hotels and short stays alike."

**Three pillars:**

1. **No friction for the guest.** No download, no account, no language barrier.
   The lowest-effort way to ask for anything.
2. **A task, not a message.** Structured, routed, owned, tracked to completion
   and confirmed by the guest.
3. **Fix it before the review.** The mid-stay pulse check is the part
   competitors' request apps don't do.

**Differentiators, ranked for campaign use:**

1. Mid-stay sentiment capture with recovery routing to a duty manager.
2. Genuinely no guest app and no guest account.
3. Two-way translation — guest's language in, staff's language out.
4. Per-outlet menus and pricing under one department.
5. Works for a 6-room guest house and a full hotel from the same product.
6. Scan a paper menu to build the digital one.

---

## 7. Objections to write against

| Objection | Honest answer |
|---|---|
| "Our guests won't use a QR code." | Nothing to install and nothing to sign up for — it's a web page, and it's the same gesture as a restaurant menu. |
| "We're too small for this." | Small properties have no front desk at all; the owner's phone is the front desk. Supported property types include Airbnb and B&B explicitly. |
| "Our staff aren't technical." | Staff get a queue and a tap-to-add menu on a phone. Requests arrive translated into their language. |
| "We already have a PMS / a phone system." | TalkStay is the guest-request layer, not a PMS. **No PMS integration exists today** — do not claim one. |
| "AI will say something wrong to my guest." | Answers come from the property's own uploaded knowledge base and website, not general knowledge. |
| "What about guests with no phone?" | Staff can log phone and walk-in requests so everything lives in one queue. |

---

## 8. Tone of voice

- **Plain, operational, unhype.** Hospitality managers are practical buyers.
- Talk about **towels, breakfast times, a broken kettle, the pool bar** — the
  specific beats the abstract every time.
- Avoid "revolutionary", "seamless", "cutting-edge", "game-changing", and
  "leverage".
- Say "guest", not "user" or "customer". Say "property" when addressing mixed
  audiences (hotels + Airbnb + hostels) and "hotel" only when you mean hotels.
  The product deliberately uses property-neutral language.
- Short sentences. Concrete nouns. No emoji in B2B material.

---

## 9. Not built — never imply these exist

- No PMS / channel-manager / booking-engine integration.
- No WhatsApp or SMS channel (WhatsApp was deliberately removed).
- No native iOS or Android app in the app stores (it's an installable web app).
- No phone-line / IVR product — "log phone order" means staff typing in a call
  they received, not TalkStay answering the phone.
- No housekeeping rota, shift scheduling, or payroll.
- No loyalty program, upsell engine, or booking/reservations.
- No public API or marketplace.
- No published SOC 2 / ISO / PCI certification.

---

## 10. Unknown — ask before claiming

Get these from the founder before any campaign goes out:

- **Pricing and packaging.** Tiers, per-room vs per-property, trial length,
  what the white-label tier costs.
- **Traction.** Number of properties live, rooms covered, requests handled.
- **Outcome metrics.** Response times, review-score movement, calls deflected
  from the front desk, revenue from in-stay orders.
- **Named customers, logos, testimonials, case studies.**
- **Geography.** Target markets and languages actually prioritised.
- **Support model.** Hours, onboarding, who installs the QR posters.
- **Compliance posture.** GDPR stance, data residency, retention.
- **Partner/referral program terms** (the mechanism exists in the product; the
  commercial terms are not recorded here).
- **Competitors** the founder considers the real alternatives.

---

## 11. Suggested campaign angles

Starting points, not finished ideas:

1. **"The review you never got."** Lead with mid-stay pulse. The emotional
   hook for any owner who has been ambushed by a one-star review.
2. **"Your front desk is a switchboard."** Operational efficiency angle for
   hotels with real departments.
3. **"No app. No signup. No language barrier."** The friction story — strongest
   for hostels and international guests.
4. **"For hosts who are the front desk."** Airbnb / short-let segment, where
   the pain is the owner's personal phone at 11pm.
5. **"From paper menu to room service in ten minutes."** The menu-scan
   onboarding story — good for demo and product-led content.
6. **Poster-led field marketing.** The QR poster is physical, branded and
   printable — a natural hook for trade shows and direct mail.

**Highest-leverage asset:** the no-signup live demo. Any campaign should drive
to it, because the product's core claim — that it takes no effort — is proven
in ten seconds by using it.

---

*Compiled from the TalkStay codebase at version 1. If a feature is not
described here, assume it does not exist and ask.*
