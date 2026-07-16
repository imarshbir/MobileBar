import { useState } from 'react';

type PolicyKey = 'shipping' | 'returns' | 'privacy' | 'terms';

const POLICIES: { key: PolicyKey; label: string; icon: string }[] = [
  { key: 'shipping', label: 'Shipping Policy', icon: 'local_shipping' },
  { key: 'returns', label: 'Return & Refund Policy', icon: 'assignment_return' },
  { key: 'privacy', label: 'Privacy Policy', icon: 'privacy_tip' },
  { key: 'terms', label: 'Terms & Conditions', icon: 'gavel' },
];

function PlaceholderNotice({ policyName }: { policyName: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-body-md text-amber-800">
      <span className="material-symbols-outlined !text-lg">edit_note</span>
      <p>
        This section wasn't included in the content document — replace this placeholder with your actual{' '}
        {policyName} copy in <code className="rounded bg-amber-100 px-1 py-0.5 text-caption">src/pages/Policies.tsx</code>.
      </p>
    </div>
  );
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
          {active === 'shipping' && (
            <div>
              <h2 className="text-headline-md !text-xl text-on-surface">Shipping Policy</h2>
              <p className="mt-3 text-body-md text-on-surface-variant">
                At Mobile Bar, we strive to deliver your order safely and on time.
              </p>

              <h3 className="mt-6 text-label-sm font-semibold text-on-surface">Order Processing</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-body-md text-on-surface-variant">
                <li>Orders are processed within 1–2 business days after confirmation.</li>
                <li>Orders placed on Sundays or public holidays will be processed on the next business day.</li>
              </ul>

              <h3 className="mt-6 text-label-sm font-semibold text-on-surface">Delivery Timeline</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-body-md text-on-surface-variant">
                <li>Metro Cities: 2–5 business days</li>
                <li>Other Locations: 4–7 business days</li>
                <li>Remote Areas: Delivery may take slightly longer depending on the courier partner.</li>
              </ul>

              <h3 className="mt-6 text-label-sm font-semibold text-on-surface">Shipping Charges</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-body-md text-on-surface-variant">
                <li>Shipping charges (if applicable) will be displayed during checkout.</li>
                <li>Free shipping may be offered on selected orders or promotional offers.</li>
              </ul>

              <h3 className="mt-6 text-label-sm font-semibold text-on-surface">Order Tracking</h3>
              <p className="mt-2 text-body-md text-on-surface-variant">
                Once your order is shipped, you will receive a tracking link via SMS, email, or WhatsApp (where
                applicable).
              </p>

              <h3 className="mt-6 text-label-sm font-semibold text-on-surface">Delivery Delays</h3>
              <p className="mt-2 text-body-md text-on-surface-variant">
                While we work with trusted courier partners, delays caused by weather conditions, public holidays,
                strikes, or unforeseen circumstances may occur. We appreciate your patience in such situations.
              </p>

              <h3 className="mt-6 text-label-sm font-semibold text-on-surface">Incorrect Address</h3>
              <p className="mt-2 text-body-md text-on-surface-variant">
                Please ensure that your shipping address and contact details are accurate. Mobile Bar will not be
                responsible for delays or failed deliveries due to incorrect information provided by the customer.
              </p>
            </div>
          )}

          {active === 'returns' && (
            <div>
              <h2 className="text-headline-md !text-xl text-on-surface">Return &amp; Refund Policy</h2>
              <PlaceholderNotice policyName="Return & Refund Policy" />
            </div>
          )}

          {active === 'privacy' && (
            <div>
              <h2 className="text-headline-md !text-xl text-on-surface">Privacy Policy</h2>
              <PlaceholderNotice policyName="Privacy Policy" />
            </div>
          )}

          {active === 'terms' && (
            <div>
              <h2 className="text-headline-md !text-xl text-on-surface">Terms &amp; Conditions</h2>
              <PlaceholderNotice policyName="Terms & Conditions" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
