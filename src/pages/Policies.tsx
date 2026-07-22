import { useState } from 'react';

type PolicyKey = 'shipping' | 'returns' | 'privacy' | 'terms';

const POLICIES: { key: PolicyKey; label: string; icon: string }[] = [
  { key: 'shipping', label: 'Shipping Policy', icon: 'local_shipping' },
  { key: 'returns', label: 'Return & Refund Policy', icon: 'assignment_return' },
  { key: 'privacy', label: 'Privacy Policy', icon: 'privacy_tip' },
  { key: 'terms', label: 'Terms & Conditions', icon: 'gavel' },
];

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 text-label-sm font-semibold text-on-surface">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-body-md text-on-surface-variant">{children}</p>;
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul className="mt-2 list-disc space-y-1 pl-5 text-body-md text-on-surface-variant">{children}</ul>;
}

export default function Policies() {
  const [active, setActive] = useState<PolicyKey>('shipping');

  return (
    <div className="container-page py-xl">
      <div className="text-center">
        <p className="eyebrow">Know before you shop</p>
        <h1 className="mt-1 text-headline-lg text-on-surface">Policies</h1>
      </div>

      <div className="mt-lg grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="flex flex-row gap-2 overflow-x-auto lg:flex-col">
          {POLICIES.map((p) => (
            <button
              key={p.key}
              onClick={() => setActive(p.key)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-left text-label-sm transition ${
                active === p.key ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined !text-lg">{p.icon}</span>
              {p.label}
            </button>
          ))}
        </aside>

        <div className="card-surface p-lg">
          {/* ---------------------------------------------------------- */}
          {/* SHIPPING & DELIVERY POLICY                                   */}
          {/* ---------------------------------------------------------- */}
          {active === 'shipping' && (
            <div>
              <h2 className="text-headline-md !text-xl text-on-surface">Shipping &amp; Delivery Policy</h2>

              <H3>Order Processing Time</H3>
              <UL>
                <li>Orders are processed within 1–2 business days after confirmation.</li>
                <li>Orders placed on Sundays or public holidays will be processed on the next business day.</li>
              </UL>

              <H3>Delivery Timelines</H3>
              <UL>
                <li>Delivered within 2–7 business days.</li>
                <li>In remote areas, delivery may take slightly longer depending on the courier partner.</li>
              </UL>

              <H3>Shipping Charges / Free Shipping</H3>
              <UL>
                <li>Ships within 24 hours.</li>
                <li>Free shipping on orders above ₹799.</li>
                <li>A charge of ₹59 is applied to all orders of ₹799 and below.</li>
                <li>₹99 extra charge for all Cash on Delivery orders (irrespective of order value).</li>
                <li>Free shipping may be offered on selected orders or promotional offers.</li>
              </UL>

              <H3>Tracking Information</H3>
              <P>
                Once your order is shipped, you will receive a tracking link via SMS, email, or WhatsApp (where
                applicable).
              </P>

              <H3>Delays</H3>
              <P>
                While we work with trusted courier partners, delays caused by weather conditions, public holidays,
                strikes, or unforeseen circumstances may occur. We appreciate your patience in such situations. You
                can always reach out to us directly.
              </P>

              <H3>Incorrect Address or Failed Delivery</H3>
              <P>
                Please ensure that your shipping address and contact details are accurate. Mobile Bar will not be
                responsible for delays or failed deliveries due to incorrect information provided by the customer.
              </P>
            </div>
          )}

          {/* ---------------------------------------------------------- */}
          {/* RETURN, REPLACEMENT & REFUND POLICY                          */}
          {/* ---------------------------------------------------------- */}
          {active === 'returns' && (
            <div>
              <h2 className="text-headline-md !text-xl text-on-surface">Return, Replacement &amp; Refund Policy</h2>

              <H3>Which Products Are Eligible for Return/Replacement</H3>
              <P>Mobile covers, charger cases, cable protectors, watch straps.</P>
              <P>A return or replacement request may be accepted in the following situations:</P>
              <UL>
                <li>You received a damaged/defective/broken product.</li>
                <li>You received a wrong product or wrong model.</li>
                <li>The product received is significantly different from the product ordered.</li>
                <li>The product has a manufacturing defect.</li>
                <li>Any item is missing from your order.</li>
              </UL>
              <P>
                Returns may not be accepted for damage caused by misuse, accidental damage, scratches, or normal wear
                and tear. The product must be unused and returned in its original condition.
              </P>

              <H3>Tempered Glass</H3>
              <P>
                Not eligible for refund — only replacement requests will be accepted, if you received a wrong model
                or a broken product. Please note replacement is only possible if the original adhesive film has not
                been removed from the product.
              </P>

              <H3>Customised Mobile Skin Lamination</H3>
              <P>
                Since customised mobile skin lamination products are prepared according to the customer's selected
                device model, design, or customisation, they are non-returnable and non-refundable.
              </P>

              <H3>Return Request Time Limit</H3>
              <P>
                Return or replacement requests must be raised within 7 days of receiving the order. Requests raised
                after this period may not be accepted.
              </P>

              <H3>Non-Returnable Products</H3>
              <P>Returns or replacements may not be accepted in the following cases:</P>
              <UL>
                <li>The product has been used, installed, or altered.</li>
                <li>The product is damaged due to misuse or improper handling.</li>
                <li>The product has been damaged after delivery.</li>
                <li>The product is scratched, stained, or physically damaged due to customer use.</li>
                <li>The original packaging or accessories are missing.</li>
                <li>The customer ordered the wrong model or size.</li>
                <li>The customer changes their mind after receiving the product.</li>
                <li>Customised or personalised products.</li>
              </UL>

              <H3>Refund Processing Time</H3>
              <P>
                Refunds will be processed only after the returned product has been received and inspected by our
                team. If the product is approved for a refund:
              </P>
              <UL>
                <li>The refund will be processed within 3–5 business days.</li>
                <li>The refund will generally be issued to the original payment method.</li>
                <li>
                  For Cash on Delivery orders, the refund may be processed through a bank account, UPI, or another
                  payment method as requested by Mobile Bar.
                </li>
              </UL>
              <P>
                The actual time taken for the refund to reflect in your account may depend on the payment gateway or
                banking institution.
              </P>

              <H3>Shipping Charges on Returns</H3>
              <P>
                If the return or replacement is due to an error by Mobile Bar, a defective product, or damage during
                transit, return shipping may be arranged or reimbursed as per the circumstances.
              </P>

              <H3>How to Request a Return or Replacement</H3>
              <P>To raise a request, please contact us through Email / WhatsApp / Contact Form and provide:</P>
              <UL>
                <li>Order Number</li>
                <li>Reason for the request</li>
                <li>Clear photographs or video of the product</li>
              </UL>
              <P>Our team will review the request and inform you about the next steps.</P>

              <H3>Policy Changes</H3>
              <P>
                Mobile Bar reserves the right to update or modify this Return, Replacement &amp; Refund Policy at any
                time. Any changes will be published on this page.
              </P>
            </div>
          )}

          {/* ---------------------------------------------------------- */}
          {/* PRIVACY POLICY                                               */}
          {/* ---------------------------------------------------------- */}
          {active === 'privacy' && (
            <div>
              <h2 className="text-headline-md !text-xl text-on-surface">Privacy Policy</h2>
              <P>
                At Mobile Bar, we respect your privacy and are committed to protecting the personal information you
                share with us. This Privacy Policy explains how we collect, use, store, and protect your information
                when you visit or shop through our website.
              </P>

              <H3>1. Information We Collect</H3>
              <P>When you use our website or place an order, we may collect the following information:</P>
              <UL>
                <li>Full Name</li>
                <li>Mobile Number</li>
                <li>Email Address</li>
                <li>Billing and Shipping Address</li>
                <li>Order and purchase details</li>
                <li>Payment-related information</li>
                <li>Device and browser information</li>
                <li>IP address and website usage information</li>
                <li>Any information you voluntarily provide when contacting our customer support</li>
              </UL>
              <P>
                We do not store your complete debit card, credit card, or other sensitive payment details. Payments
                are processed securely through third-party payment gateways.
              </P>

              <H3>2. How We Use Your Information</H3>
              <P>We may use your information to:</P>
              <UL>
                <li>Process and deliver your orders.</li>
                <li>Confirm and provide updates about your orders.</li>
                <li>Process payments and refunds.</li>
                <li>Provide customer support.</li>
                <li>Handle returns, replacements, and complaints.</li>
                <li>Improve our products, website, and services.</li>
                <li>Prevent fraud, misuse, and unauthorized activities.</li>
                <li>Send promotional offers, updates, and marketing communications where permitted.</li>
              </UL>
              <P>You may opt out of promotional communications at any time.</P>

              <H3>3. Sharing of Information</H3>
              <P>
                We may share necessary information with trusted third-party service providers who help us operate
                our business, including:
              </P>
              <UL>
                <li>Payment gateway providers</li>
                <li>Courier and delivery partners</li>
                <li>Website and technology service providers</li>
                <li>Customer support and communication platforms</li>
                <li>Analytics and marketing service providers, where applicable</li>
              </UL>
              <P>
                These parties may only use the information necessary to provide their services. Mobile Bar does not
                sell, rent, or trade your personal information to third parties for their independent marketing
                purposes.
              </P>

              <H3>4. Cookies and Tracking Technologies</H3>
              <P>Our website may use cookies and similar technologies to:</P>
              <UL>
                <li>Improve website functionality.</li>
                <li>Remember your preferences.</li>
                <li>Understand how visitors use our website.</li>
                <li>Improve our products and customer experience.</li>
                <li>Support marketing and analytics activities, where applicable.</li>
              </UL>
              <P>
                You may manage or disable cookies through your browser settings. However, disabling certain cookies
                may affect some website features.
              </P>

              <H3>5. Data Security</H3>
              <P>
                We take reasonable technical and organisational measures to protect your personal information from
                unauthorized access, loss, misuse, alteration, or disclosure. However, no method of transmission or
                electronic storage is completely secure, and we cannot guarantee absolute security of information.
              </P>

              <H3>6. Your Rights</H3>
              <P>Depending on applicable law, you may have the right to:</P>
              <UL>
                <li>Request access to the personal information we hold about you.</li>
                <li>Request correction of inaccurate information.</li>
                <li>Request deletion of information, subject to legal or business requirements.</li>
                <li>Opt out of promotional communications.</li>
                <li>Raise concerns regarding the use of your personal information.</li>
              </UL>
              <P>To make a request, please contact us using the details provided in Contact Us.</P>

              <H3>7. Third-Party Websites</H3>
              <P>
                Our website may contain links to third-party websites or services. Mobile Bar is not responsible for
                the privacy practices or content of those third-party websites. We recommend reviewing their privacy
                policies before providing any personal information.
              </P>

              <H3>8. Changes to This Privacy Policy</H3>
              <P>
                Mobile Bar may update this Privacy Policy from time to time. Any changes will be published on this
                page with the updated effective date.
              </P>
            </div>
          )}

          {/* ---------------------------------------------------------- */}
          {/* TERMS & CONDITIONS                                           */}
          {/* ---------------------------------------------------------- */}
          {active === 'terms' && (
            <div>
              <h2 className="text-headline-md !text-xl text-on-surface">Terms &amp; Conditions</h2>
              <P>
                Welcome to Mobile Bar. By accessing, browsing, or purchasing from our website, you agree to be bound
                by these Terms &amp; Conditions. Please read them carefully before using our website.
              </P>

              <H3>1. About Our Website</H3>
              <P>Mobile Bar provides mobile accessories and related products, including but not limited to:</P>
              <UL>
                <li>Mobile Covers</li>
                <li>Tempered Glass</li>
                <li>Charger Cases</li>
                <li>Cable Protectors</li>
                <li>Watch Straps</li>
                <li>Customisable Mobile Skin Lamination</li>
                <li>Other accessories that may be added in the future</li>
              </UL>
              <P>We reserve the right to add, modify, or discontinue products and services at any time.</P>

              <H3>2. Product Information</H3>
              <P>
                We make reasonable efforts to ensure that product descriptions, images, specifications, colours, and
                other information displayed on our website are accurate. However:
              </P>
              <UL>
                <li>Actual product colours may vary depending on your device screen and display settings.</li>
                <li>Minor variations in design, finish, colour, texture, or appearance may occur.</li>
                <li>Product specifications may change due to manufacturing or supplier updates.</li>
                <li>Product images may be for representation purposes where clearly indicated.</li>
              </UL>
              <P>
                We recommend checking the product details, compatibility, and model information carefully before
                placing an order.
              </P>

              <H3>3. Device Model and Compatibility</H3>
              <P>
                Customers are responsible for selecting the correct mobile model, device variant, watch model, watch
                size, or other compatible product details while placing an order. Mobile Bar will not be responsible
                for incorrect orders resulting from incorrect information selected or provided by the customer.
              </P>
              <P>
                For customised mobile skin lamination, customers are responsible for providing accurate device and
                customisation details.
              </P>

              <H3>4. Prices and Product Availability</H3>
              <P>
                All prices displayed on the website are in Indian Rupees (INR), unless otherwise stated. Prices,
                discounts, offers, and product availability may change without prior notice. We reserve the right to
                correct any pricing, product description, or technical errors that may occur on the website.
              </P>

              <H3>5. Orders and Order Acceptance</H3>
              <P>Placing an order on our website does not automatically guarantee acceptance of the order.</P>
              <P>Mobile Bar reserves the right to:</P>
              <UL>
                <li>Accept or decline an order.</li>
                <li>Cancel an order due to product unavailability.</li>
                <li>Cancel an order due to pricing or listing errors.</li>
                <li>Cancel an order due to payment issues.</li>
                <li>Cancel an order in cases of suspected fraud or misuse.</li>
                <li>Limit the quantity of products purchased by a customer.</li>
              </UL>
              <P>
                If an order is cancelled after payment has been received, the eligible amount will be refunded
                according to our Refund Policy.
              </P>

              <H3>6. Payments</H3>
              <P>
                Payments may be made through the payment methods available at checkout. Payment transactions are
                processed through secure third-party payment service providers. Mobile Bar does not store complete
                debit card, credit card, or other sensitive payment details. Orders may be processed only after
                successful payment confirmation, unless Cash on Delivery is available for the particular order or
                location.
              </P>

              <H3>7. Shipping and Delivery</H3>
              <P>Delivery timelines provided on the website are estimated timelines and may vary depending on:</P>
              <UL>
                <li>Delivery location</li>
                <li>Courier availability</li>
                <li>Weather conditions</li>
                <li>Public holidays</li>
                <li>Operational delays</li>
                <li>Other circumstances beyond our reasonable control</li>
              </UL>
              <P>For more information, please refer to our Shipping Policy.</P>

              <H3>8. Returns, Replacements and Refunds</H3>
              <P>
                Returns, replacements, and refunds are governed by our Return, Replacement &amp; Refund Policy.
                Customers are advised to review that policy before placing an order. Certain products, including
                customised or personalised products, may be subject to specific return and replacement conditions.
              </P>

              <H3>9. Cancellation of Orders</H3>
              <P>
                Customers may request cancellation of an order before it has been shipped. Once an order has been
                shipped, cancellation may not be possible. The applicable refund process for an approved cancellation
                will depend on the payment method and order status.
              </P>

              <H3>10. Customised Products</H3>
              <P>For customised mobile skin lamination and other personalised products:</P>
              <UL>
                <li>Customers are responsible for providing correct device details and customisation information.</li>
                <li>Production may begin after the order and details are confirmed.</li>
                <li>Customised products may not be eligible for return or refund due to a change of mind.</li>
              </UL>
              <P>Please refer to our Return, Replacement &amp; Refund Policy for further details.</P>

              <H3>11. Intellectual Property</H3>
              <P>All content available on the Mobile Bar website, including:</P>
              <UL>
                <li>Brand name</li>
                <li>Logo</li>
                <li>Product images</li>
                <li>Product videos</li>
                <li>Text</li>
                <li>Graphics</li>
                <li>Designs</li>
                <li>Website layout</li>
                <li>Other original content</li>
              </UL>
              <P>
                is owned by or licensed to Mobile Bar and is protected by applicable intellectual property laws. You
                may not copy, reproduce, modify, distribute, sell, or use our content for commercial purposes without
                our prior written permission.
              </P>

              <H3>12. Prohibited Use</H3>
              <P>You agree not to:</P>
              <UL>
                <li>Use the website for any unlawful purpose.</li>
                <li>Attempt to gain unauthorized access to our website or systems.</li>
                <li>Interfere with the security or functioning of the website.</li>
                <li>Upload harmful code, viruses, or malicious content.</li>
                <li>Use our content or brand identity without permission.</li>
                <li>Provide false or misleading information.</li>
                <li>Engage in fraudulent transactions or misuse offers and promotions.</li>
              </UL>

              <H3>13. Third-Party Services and Links</H3>
              <P>
                Our website may use or link to third-party services, including payment gateways, courier services,
                analytics tools, and other service providers. Mobile Bar is not responsible for the content,
                availability, policies, or actions of third-party services. Your use of third-party services may be
                subject to their own terms and policies.
              </P>

              <H3>14. Limitation of Liability</H3>
              <P>
                To the extent permitted by applicable law, Mobile Bar shall not be responsible for indirect,
                incidental, or consequential losses arising from:
              </P>
              <UL>
                <li>The use or inability to use our website.</li>
                <li>Delays beyond our reasonable control.</li>
                <li>Temporary website interruptions.</li>
                <li>Third-party services.</li>
                <li>Incorrect information provided by the customer.</li>
                <li>Improper use of our products.</li>
              </UL>
              <P>
                Nothing in these Terms &amp; Conditions is intended to exclude any liability that cannot legally be
                excluded under applicable law.
              </P>

              <H3>15. Changes to These Terms</H3>
              <P>
                Mobile Bar reserves the right to update or modify these Terms &amp; Conditions at any time. Updated
                terms will be published on this page. Your continued use of the website after changes are published
                constitutes acceptance of the updated Terms &amp; Conditions.
              </P>

              <H3>16. Governing Law</H3>
              <P>
                These Terms &amp; Conditions shall be governed by and interpreted in accordance with the applicable
                laws of India. Any disputes shall be subject to the jurisdiction of the competent courts having
                jurisdiction over the business of Mobile Bar.
              </P>

              <H3>17. Contact Us</H3>
              <P>For any questions regarding these Terms &amp; Conditions, please contact us using the details on our Contact page.</P>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}