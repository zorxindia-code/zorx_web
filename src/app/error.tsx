"use client";

import Link from "next/link";
import { servicesFont } from "@/components/services/font";
import "./errors.css";

/** Unexpected error in a route: the ZORX look, a retry and a way home. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className={`zorx-error ${servicesFont.variable}`}>
      <meta name="robots" content="noindex" />
      <p className="zorx-error-code">Error</p>
      <h1 className="zorx-error-title">Something went wrong.</h1>
      <div className="zorx-error-actions">
        <button type="button" className="zorx-error-link" onClick={() => reset()}>
          Try again
        </button>
        <Link href="/" className="zorx-error-link">
          Back to ZORX
        </Link>
      </div>
    </main>
  );
}
