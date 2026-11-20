import type { Metadata } from "next";
import { BUSINESS, LegalPage, List, Section } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Dripping Honey Treats collects, uses and protects your personal information.",
};

const UPDATED = "20 November 2026";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={UPDATED}
      intro={
        <>
          <p>
            {BUSINESS.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) bakes and delivers pastries in Lagos and caters events. This
            policy explains what personal information we collect when you use our website and app at {BUSINESS.site}, why
            we collect it, who we share it with, and the choices and rights you have.
          </p>
          <p>
            We process personal data in line with the <strong>Nigeria Data Protection Act 2023</strong>. If you have any
            question, email us at{" "}
            <a className="font-semibold text-tea" href={`mailto:${BUSINESS.email}`}>
              {BUSINESS.email}
            </a>
            .
          </p>
        </>
      }
    >
      <Section n={1} title="Information we collect">
        <p>
          <strong>Information you give us:</strong>
        </p>
        <List
          items={[
            "Your name, email address and/or phone (WhatsApp) number when you sign up or sign in.",
            "Delivery addresses, landmarks and delivery notes you enter at checkout.",
            "Your orders: items, quantities, prices, notes for the baker or rider, and whether you chose pickup or delivery.",
            "Event requests: event type, date, venue, number of guests, budget and any notes.",
            "Messages you send us by email or WhatsApp.",
          ]}
        />
        <p>
          <strong>If you sign in with Google:</strong> we receive your name, email address and profile picture from your
          Google account. We do not receive your Google password and we do not access your contacts, files or anything
          else in your Google account.
        </p>
        <p>
          <strong>Payments:</strong> card, bank transfer and USSD payments are handled by our payment provider,
          Flutterwave. We never see or store your full card number or PIN. We keep a payment reference, the amount and
          whether the payment succeeded.
        </p>
        <p>
          <strong>Collected automatically:</strong> a single sign-in cookie that keeps you logged in, the items in your
          cart (stored in your browser), and basic technical logs (such as IP address and browser type) kept by our
          hosting provider for security and troubleshooting. We do not use advertising or tracking cookies.
        </p>
      </Section>

      <Section n={2} title="How we use your information">
        <List
          items={[
            "To create and secure your account, including sending one-time sign-in codes by email or WhatsApp.",
            "To take, prepare and deliver your orders, and to let you collect pickup orders.",
            "To send order updates: confirmation, preparation, dispatch (with rider details), delivery and receipts.",
            "To respond to event requests and send quotes.",
            "To provide customer support and handle refunds.",
            "To prevent fraud and keep our service secure.",
            "To tell you about new products, only if you haven't opted out (see section 6).",
          ]}
        />
        <p>
          Our legal bases are: performing our contract with you (your orders and account), our legitimate interests
          (security, improving our service, telling existing customers about similar products), your consent (where we
          ask for it), and complying with the law (for example, keeping transaction records).
        </p>
      </Section>

      <Section n={3} title="Who we share it with">
        <p>We do not sell your personal information. We share it only with service providers that help us run the business, and only what each needs:</p>
        <List
          items={[
            <>
              <strong>Supabase</strong>: secure database where your account, orders and addresses are stored.
            </>,
            <>
              <strong>Flutterwave</strong>: processes payments (receives your name, email, phone and order amount).
            </>,
            <>
              <strong>Google</strong>: only if you choose &ldquo;Continue with Google&rdquo;.
            </>,
            <>
              <strong>Resend</strong>: delivers our emails (sign-in codes, order updates).
            </>,
            <>
              <strong>Meta (WhatsApp Business)</strong>: delivers WhatsApp sign-in codes and order updates.
            </>,
            <>
              <strong>Cloudinary</strong>: hosts product photos (no customer data).
            </>,
            <>
              <strong>Netlify</strong>: hosts the website.
            </>,
            <>
              <strong>Delivery riders</strong>: receive your name, phone number and delivery address to deliver your order.
            </>,
          ]}
        />
        <p>
          Some of these providers store data outside Nigeria. Where that happens we rely on their security commitments and
          contractual safeguards, as permitted by the Nigeria Data Protection Act. We may also disclose information if the
          law requires it or to protect our customers, staff or business.
        </p>
      </Section>

      <Section n={4} title="How long we keep it">
        <List
          items={[
            "Your account information: for as long as your account is open.",
            "Orders and payment records: up to 6 years, for tax and accounting purposes.",
            "One-time sign-in codes: they expire after 10 minutes and are never stored in readable form.",
            "Event requests: up to 2 years after the event.",
          ]}
        />
        <p>When you delete your account we delete or anonymise your personal information, except records we must keep by law.</p>
      </Section>

      <Section n={5} title="How we protect it">
        <p>
          Data is sent over encrypted connections (HTTPS). Our database can only be reached by our own servers, access is
          limited to authorised staff who sign in with one-time codes, and passwords are never used or stored. No system
          is perfectly secure, but if a breach affecting you ever happens we will notify you and the Nigeria Data
          Protection Commission as required by law.
        </p>
      </Section>

      <Section n={6} title="Marketing messages">
        <p>
          We may occasionally email you when something new is on the menu. Every such email has an{" "}
          <strong>unsubscribe</strong> link, and you can also ask us to stop by emailing {BUSINESS.email}. Opting out does
          not affect messages about your own orders or account.
        </p>
      </Section>

      <Section n={7} title="Your rights">
        <p>Under the Nigeria Data Protection Act 2023 you can ask us to:</p>
        <List
          items={[
            "give you a copy of the personal information we hold about you;",
            "correct information that is wrong or incomplete;",
            "delete your information or your account;",
            "stop or restrict certain processing, or object to it;",
            "send your information to you or another provider in a common format;",
            "withdraw consent at any time, where we rely on consent.",
          ]}
        />
        <p>
          Email {BUSINESS.email} from the address on your account and we will respond within 30 days. You can also
          complain to the <strong>Nigeria Data Protection Commission (NDPC)</strong> at ndpc.gov.ng.
        </p>
      </Section>

      <Section n={8} title="Children">
        <p>
          Our service is meant for adults. We do not knowingly collect information from children under 13. If you believe
          a child has given us their information, contact us and we will delete it.
        </p>
      </Section>

      <Section n={9} title="Changes to this policy">
        <p>
          We may update this policy as our service changes. We&apos;ll change the &ldquo;last updated&rdquo; date above,
          and for significant changes we&apos;ll let you know by email or in the app.
        </p>
      </Section>

      <Section n={10} title="Contact us">
        <p>
          {BUSINESS.name}, {BUSINESS.address}. Email:{" "}
          <a className="font-semibold text-tea" href={`mailto:${BUSINESS.email}`}>
            {BUSINESS.email}
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
