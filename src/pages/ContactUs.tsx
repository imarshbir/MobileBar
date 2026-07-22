import { FormEvent, useState } from 'react';
import { useToast } from '@/components/Toast';

const CONTACT_METHODS = [
  {
    icon: 'chat',
    label: 'WhatsApp',
    value: '+91 98148 53948',
    href: 'https://wa.me/919814853948',
    cta: 'Message us',
  },
  {
    icon: 'call',
    label: 'Phone',
    value: '+91 98148 53948',
    href: 'tel:+919814853948',
    cta: 'Call now',
  },
  {
    icon: 'mail',
    label: 'Email',
    value: 'Mobileebar@gmail.com',
    href: 'mailto:Mobileebar@gmail.com',
    cta: 'Send email',
  },
];

export default function ContactUs() {
  const { push } = useToast();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    // No backend contact-form endpoint yet — routes the message to
    // WhatsApp/email so it doesn't silently disappear. Swap this for a
    // real submit handler once a contact endpoint exists.
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`);
    window.location.href = `mailto:Mobileebar@gmail.com?subject=Website enquiry&body=${body}`;
    setSending(false);
    push('Opening your email client to send this message.', 'info');
  };

  return (
    <div className="container-page py-xl">
      <div className="text-center">
        <p className="eyebrow">Get in touch</p>
        <h1 className="mt-1 text-headline-lg text-on-surface">Contact Us</h1>
        <p className="mx-auto mt-2 max-w-md text-body-md text-on-surface-variant">
          Questions about an order, a product, or a bulk enquiry — we're a message away.
        </p>
      </div>

      <div className="mt-xl grid gap-lg lg:grid-cols-3">
        {CONTACT_METHODS.map((m) => (
          <a
            key={m.label}
            href={m.href}
            target={m.icon === 'chat' ? '_blank' : undefined}
            rel="noreferrer"
            className="card-surface flex flex-col items-center gap-2 p-lg text-center transition hover:shadow-2"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="material-symbols-outlined">{m.icon}</span>
            </span>
            <p className="text-label-sm font-semibold text-on-surface">{m.label}</p>
            <p className="text-body-md text-on-surface-variant">{m.value}</p>
            <span className="mt-1 text-caption font-semibold text-primary">{m.cta} →</span>
          </a>
        ))}
      </div>

      <div className="mt-xl grid gap-lg lg:grid-cols-2">
        <div className="card-surface p-lg">
          <h2 className="text-headline-md !text-lg text-on-surface">Store Address</h2>
          <p className="mt-2 flex items-start gap-2 text-body-md text-on-surface-variant">
            <span className="material-symbols-outlined !text-lg text-primary">location_on</span>
          Mobile Bar, Opp Baba Dariya Di Hatti, Sahnewal, Ludhiana, Punjab - 141120
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-surface flex flex-col gap-3 p-lg">
          <h2 className="text-headline-md !text-lg text-on-surface">Send a message</h2>
          <input
            required
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="input-field bg-white"
          />
          <input
            required
            type="email"
            placeholder="Your email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="input-field bg-white"
          />
          <textarea
            required
            rows={3}
            placeholder="How can we help?"
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            className="input-field resize-none bg-white"
          />
          <button type="submit" disabled={sending} className="btn-primary">
            Send message
          </button>
        </form>
      </div>
    </div>
  );
}
