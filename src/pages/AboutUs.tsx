const WHY_MOBILE_BAR = [
  'Wide range of accessories for multiple brands and device models.',
  'Premium-quality products at affordable prices.',
  'Trendy and unique designs updated regularly.',
  'Focus on durability without compromising style.',
  'Secure shopping experience with reliable customer support.',
  'Fast and careful order processing.',
  'A growing collection of accessories to meet all your device needs in one place.',
];

const QUALITY_PROMISE = [
  'Premium materials and reliable craftsmanship.',
  'Products designed for a perfect fit and long-lasting performance.',
  'Stylish collections that stay on trend.',
  'Honest pricing with no compromise on quality.',
  'Continuous efforts to improve our products and customer experience.',
];

export default function AboutUs() {
  return (
    <div>
      <section className="bg-primary py-xl">
        <div className="container-page text-center">
          <p className="text-caption font-semibold uppercase tracking-wider text-white/70">Our Story</p>
          <h1 className="mt-2 text-display-lg !text-4xl text-white">About Mobile Bar</h1>
        </div>
      </section>

      <section className="container-page max-w-3xl py-xl">
        <h2 className="text-headline-lg !text-2xl text-on-surface">Our Brand Story</h2>
        <div className="mt-4 space-y-4 text-body-lg leading-relaxed text-on-surface-variant">
          <p>
            At Mobile Bar, we believe your phone is more than just a device—it's a reflection of your personality
            and style. We started with a simple vision: to make premium-quality mobile accessories that are
            stylish, durable, and affordable for everyone.
          </p>
          <p>
            From trendy mobile covers and premium skins to watch straps and everyday accessories, every product is
            carefully selected to offer the perfect blend of protection and aesthetics. Our goal is to help you
            personalize your gadgets while ensuring they stay protected.
          </p>
          <p>
            As we continue to grow, we remain committed to bringing the latest designs, trusted quality, and an
            exceptional shopping experience to every customer.
          </p>
        </div>
      </section>

      <section className="bg-white py-xl">
        <div className="container-page max-w-3xl">
          <h2 className="text-headline-lg !text-2xl text-on-surface">Why Mobile Bar?</h2>
          <p className="mt-3 text-body-lg text-on-surface-variant">
            Choosing Mobile Bar means choosing quality, style, and reliability. Here's what makes us different:
          </p>
          <ul className="mt-5 space-y-3">
            {WHY_MOBILE_BAR.map((item) => (
              <li key={item} className="flex items-start gap-3 text-body-md text-on-surface">
                <span className="material-symbols-outlined mt-0.5 !text-lg text-primary">check_circle</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-body-md italic text-on-surface-variant">
            Whether you're looking for minimal elegance or bold statement designs, Mobile Bar has something for
            everyone.
          </p>
        </div>
      </section>

      <section className="container-page max-w-3xl py-xl">
        <h2 className="text-headline-lg !text-2xl text-on-surface">Our Quality Promise</h2>
        <p className="mt-3 text-body-lg text-on-surface-variant">
          Quality is at the heart of everything we do. Every product at Mobile Bar is selected with attention to
          design, durability, and functionality. We work to ensure that our accessories not only look great but
          also provide dependable protection for your everyday devices.
        </p>
        <p className="mt-3 text-label-sm font-semibold text-on-surface">Our promise to every customer:</p>
        <ul className="mt-3 space-y-3">
          {QUALITY_PROMISE.map((item) => (
            <li key={item} className="flex items-start gap-3 text-body-md text-on-surface-variant">
              <span className="material-symbols-outlined mt-0.5 !text-lg text-primary">verified</span>
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-body-md italic text-on-surface-variant">
          Your trust inspires us to deliver products you'll love to use every day.
        </p>
      </section>
    </div>
  );
}
