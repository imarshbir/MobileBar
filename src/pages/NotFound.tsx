import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-headline-md !text-base font-semibold text-primary">404</p>
      <h1 className="mt-2 text-headline-lg text-on-surface">Page not found</h1>
      <Link to="/" className="btn-primary mt-6">
        Back home
      </Link>
    </div>
  );
}
