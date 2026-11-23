import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS, LegalPage, List, Section } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for ordering from Dripping Honey Treats.",
};

const UPDATED = "20 November 2026";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated={UPDATED}
      intro={
        <p>
          These terms apply when you use {BUSINESS.site} or our app to order pastries or request event catering from{" "}
          {BUSINESS.name}. By creating an account or placing an order you agree to them. Please also read our{" "}
          <Link href="/privacy" className="font-semibold text-tea">
            Privacy Policy
          </Link>
          .
        </p>
      }
    >
      <Section n={1} title="Your account">
        <p>
          You sign in with a one-time code sent to your email or WhatsApp, or with Google. Keep access to that email or
          phone secure. You are responsible for orders placed from your account. Please give us accurate contact and
          delivery details.
        </p>
      </Section>

      <Section n={2} title="Orders and prices">
        <List
          items={[
            "All prices are in Nigerian Naira (₦) and are shown before you pay.",
            "An order is confirmed only once your payment succeeds and you receive our confirmation.",
            "Products are baked fresh and availability can change. If something you paid for isn't available, we will contact you to offer a replacement or refund it.",
            "Promo codes can't be exchanged for cash and may have conditions or expiry dates.",
          ]}
        />
      </Section>

      <Section n={3} title="Payment">
        <p>
          Online payments are processed securely by our payment partners, Paystack and Flutterwave (card, bank transfer or USSD). We don&apos;t store your
          card details. If a payment fails or is cancelled, your order is not placed and you can try again.
        </p>
      </Section>

      <Section n={4} title="Pickup and delivery">
        <List
          items={[
            <>
              <strong>Pickup:</strong> we&apos;ll message you when your order is ready. Please collect it during our
              pickup hours. Freshly baked items are best enjoyed the same day.
            </>,
            <>
              <strong>Delivery:</strong> we deliver within Lagos. The <strong>delivery fee is not included</strong> in
              your online payment. It depends on your location and you pay it directly to the rider when your order
              arrives, as you agree at checkout.
            </>,
            "Delivery times are estimates. Traffic and weather can cause delays; we'll keep you updated on WhatsApp.",
            "Please make sure someone is available at the address. If a rider can't reach you, extra delivery costs may apply to re-deliver.",
          ]}
        />
      </Section>

      <Section n={5} title="Cancellations and refunds">
        <List
          items={[
            "You can ask to cancel an order before we start preparing it. Message us on WhatsApp or email as soon as possible.",
            "Once an order is being prepared it can't be cancelled, because it is made fresh for you.",
            "If we cancel your order, you receive a full refund of the amount you paid online.",
            `If something is wrong with your order (missing, damaged or not what you ordered), contact us within 24 hours with a photo at ${BUSINESS.email} and we'll make it right with a replacement or refund.`,
            "Approved refunds are returned to your original payment method and may take a few working days to reflect, depending on your bank.",
          ]}
        />
      </Section>

      <Section n={6} title="Allergens and ingredients">
        <p>
          Our products are made in a kitchen that handles <strong>wheat (gluten), eggs, milk, nuts (including tigernut),
          coconut and sesame</strong>. We list ingredients where we can, but we cannot guarantee any product is free from
          allergens. If you have an allergy, please contact us before ordering.
        </p>
      </Section>

      <Section n={7} title="Events and catering">
        <p>
          Event requests are not bookings until we send you a quote and you confirm it. Deposits, payment schedules and
          cancellation terms for events are set out in your quote. Events outside Lagos (such as Ibadan) need to be
          booked at least 3 weeks ahead and may carry extra travel costs.
        </p>
      </Section>

      <Section n={8} title="Using our service fairly">
        <p>
          Please don&apos;t misuse the service. That includes placing fraudulent orders, using someone else&apos;s payment
          details, or trying to interfere with the website. We may suspend accounts that do.
        </p>
      </Section>

      <Section n={9} title="Our responsibility">
        <p>
          We take care to provide fresh, safe products and a reliable service. To the extent the law allows, our liability
          for any order is limited to the amount you paid for it. Nothing in these terms limits your rights under the
          Federal Competition and Consumer Protection Act or other Nigerian consumer law.
        </p>
      </Section>

      <Section n={10} title="Changes and governing law">
        <p>
          We may update these terms from time to time; the version on this page applies to orders placed after the update.
          These terms are governed by the laws of the Federal Republic of Nigeria, and the courts of Lagos State have
          jurisdiction.
        </p>
      </Section>

      <Section n={11} title="Contact">
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
