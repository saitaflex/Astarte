import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-6xl text-orange-ink">404</p>
      <h1 className="mt-4 font-display text-3xl">This page does not exist.</h1>
      <p className="mt-2 text-muted">The artist or page may have been removed or not yet approved.</p>
      <Link href="/" className="mt-8 inline-block rounded-full bg-charcoal px-5 py-2.5 text-cream">
        Back home
      </Link>
    </div>
  );
}
