import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS, LegalPage, List, Section } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Dripping Honey Treats collects, uses and protects your personal information.",
};

const UPDATED = "20 November 2026";

const mail = (
  <a className="font-semibold text-tea" href={`mailto:${BUSINESS.email}`}>
    {BUSINESS.email}
  </a>
);

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={UPDATED}
      intro={
        <>
          <p>
            Your privacy matters to us. This policy explains how {BUSINESS.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
            &ldquo;our&rdquo;) collects, uses, shares and protects personal information when you order from us, book an
            event, or use our website and app at {BUSINESS.site}.
          </p>
          <p>
            We handle personal information in line with the <strong>Nigeria Data Protection Act 2023</strong> and the
            regulations of the Nigeria Data Protection Commission (NDPC).
          </p>
        </>
      }
    >
      <Section n={1} title="What is personal information and why do we collect it?">
        <p>
          Personal information is any information that identifies you or could reasonably be used to identify you. The
          personal information we collect includes:
        </p>
        <List
          items={[
            "your name, email address and phone (WhatsApp) number;",
            "delivery addresses, landmarks and delivery instructions;",
            "your order history, including items, quantities, prices, notes for the baker or rider, and whether you chose pickup or delivery;",
            "event and catering requests, including the date, venue, number of guests and budget;",
            "payment records (a payment reference, the amount and its status, never your full card details); and",
            "messages you send us by email, WhatsApp or phone.",
          ]}
        />
        <p>
          We collect this information directly from you when you create an account, place an order, request an event,
          or contact us. If you choose <strong>Continue with Google</strong>, Google shares your name, email address and
          profile picture with us. We use them only to create and sign in to your account. We do not receive your Google
          password or access anything else in your Google account, and we do not use Google data for advertising.
        </p>
        <p>We collect and use personal information to:</p>
        <List
          items={[
            "create and secure your account, including sending one-time sign-in codes;",
            "take, bake, and deliver your orders, or have them ready for pickup;",
            "send order updates by email and WhatsApp, such as confirmations, dispatch and rider details, and receipts;",
            "respond to event requests and send quotes;",
            "provide customer support and process refunds;",
            "prevent fraud and keep our service secure; and",
            "tell you about new treats on our menu, unless you opt out (see section 7).",
          ]}
        />
        <p>
          We rely on the following lawful bases: performing our contract with you (your orders and account), our
          legitimate interests (running and securing our business), your consent where we ask for it, and compliance
          with the law (for example, keeping tax records).
        </p>
      </Section>

      <Section n={2} title="Sensitive information">
        <p>
          Some information is more sensitive, such as information about your health. The only sensitive information we
          may hold is <strong>allergy or dietary information</strong> that you choose to include in an order note or
          event request (for example, &ldquo;nut allergy&rdquo;).
        </p>
        <p>We use it only:</p>
        <List
          items={[
            "to prepare your order or event safely, which is the reason you gave it to us;",
            "with your consent, which you give by including it; or",
            "where the law requires or allows it.",
          ]}
        />
        <p>
          Please don&apos;t send us any other sensitive information. Our kitchen handles common allergens, so we can&apos;t
          guarantee any product is allergen-free. See our{" "}
          <Link href="/terms" className="font-semibold text-tea">
            Terms of Service
          </Link>
          .
        </p>
      </Section>

      <Section n={3} title="Third parties">
        <p>
          Where practical, we collect personal information directly from you. When we receive it from someone else, we
          take reasonable steps to make sure you know about it. This can happen when a friend places an order for
          delivery to you, or when you sign in with Google.
        </p>
        <p>
          We use trusted service providers to run our business. Each receives only the information it needs and must keep
          it secure:
        </p>
        <List
          items={[
            <>
              <strong>Supabase</strong>: secure storage for accounts, orders and addresses;
            </>,
            <>
              <strong>Flutterwave</strong>: payment processing (receives your name, email, phone and order amount);
            </>,
            <>
              <strong>Google</strong>: only if you sign in with Google;
            </>,
            <>
              <strong>Resend</strong>: sends our emails;
            </>,
            <>
              <strong>Meta (WhatsApp Business)</strong>: sends WhatsApp codes and order updates;
            </>,
            <>
              <strong>Cloudinary</strong> and <strong>Netlify</strong>: host our product photos and website;
            </>,
            <>
              <strong>delivery riders</strong>: receive your name, phone number and address to deliver your order.
            </>,
          ]}
        />
        <p>
          Some of these providers store data outside Nigeria. Where that happens, we rely on their security commitments
          and contractual safeguards, as the Nigeria Data Protection Act allows.
        </p>
      </Section>

      <Section n={4} title="Disclosure of personal information">
        <p>
          <strong>We never sell or rent your personal information.</strong> Apart from the service providers above, we
          only disclose it:
        </p>
        <List
          items={[
            "with your consent;",
            "where the law requires or allows it, for example to comply with a court order or a regulator; or",
            "to protect our customers, staff or business from fraud or harm.",
          ]}
        />
      </Section>

      <Section n={5} title="Security of personal information">
        <p>
          We take reasonable steps to protect your personal information from misuse, loss, and unauthorised access,
          change or disclosure. These steps include:
        </p>
        <List
          items={[
            "encrypted (HTTPS) connections;",
            "a database that only our own servers can reach;",
            "staff access protected by one-time sign-in codes; and",
            "never storing passwords or card details.",
          ]}
        />
        <p>
          If a data breach is likely to affect you, we will tell you and the NDPC as the law requires.
        </p>
        <p>
          When we no longer need personal information, we delete or anonymise it. We keep your account details while your
          account is open, order and payment records for up to 6 years for tax and accounting, and event requests for up
          to 2 years. Sign-in codes expire after 10 minutes and are never stored in readable form.
        </p>
      </Section>

      <Section n={6} title="Cookies">
        <p>
          We use a single, essential cookie to keep you signed in, and your browser remembers your cart. We do not use
          advertising or tracking cookies. Our hosting provider keeps basic technical logs, such as IP address and browser
          type, for security.
        </p>
      </Section>

      <Section n={7} title="Marketing">
        <p>
          We may occasionally email you when something new comes out of our oven. Every one of these emails has a
          one-click <strong>unsubscribe</strong> link, or you can email {mail} to stop them. Unsubscribing won&apos;t
          affect messages about your own orders or account.
        </p>
      </Section>

      <Section n={8} title="Access to your personal information">
        <p>
          You may ask for a copy of the personal information we hold about you, and ask us to correct it, delete it or
          your account, restrict or object to how we use it, or send it to you in a common format. You can withdraw
          consent at any time.
        </p>
        <p>
          Email {mail} from the address on your account. We may need to confirm your identity first, and we will respond
          within 30 days. There is no charge for a request.
        </p>
      </Section>

      <Section n={9} title="Maintaining the quality of your personal information">
        <p>
          We want the information we hold to be accurate, complete and up to date. You can update your name and contact
          details in the app under <strong>Account</strong>. If anything else is wrong, please let us know and we&apos;ll
          fix it promptly.
        </p>
      </Section>

      <Section n={10} title="Children">
        <p>
          Our service is for adults. We do not knowingly collect information from children under 13. If you think a child
          has given us their information, contact us and we will delete it.
        </p>
      </Section>

      <Section n={11} title="Policy updates">
        <p>
          We may update this policy from time to time. The current version is always on this page with its &ldquo;last
          updated&rdquo; date. If we make significant changes, we&apos;ll let you know by email or in the app.
        </p>
      </Section>

      <Section n={12} title="Privacy complaints and enquiries">
        <p>
          If you have a question or complaint about this policy or how we handle your information, email {mail} or write
          to us at {BUSINESS.address}. We aim to respond within 7 days and to resolve complaints within 30 days.
        </p>
        <p>
          If you&apos;re not satisfied with our response, you can complain to the{" "}
          <strong>Nigeria Data Protection Commission</strong> at ndpc.gov.ng.
        </p>
      </Section>
    </LegalPage>
  );
}
