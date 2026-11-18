import type { Metadata } from "next";
import Link from "next/link";
import { servicesFont } from "@/components/services/font";
import "./errors.css";

// Next marks not-found responses noindex itself.
export const metadata: Metadata = { title: "Page not found" };

/** 404 — a real not-found response (status 404), in the ZORX look, with a way back. */
export default function NotFound() {
  return (
    <main className={`zorx-error ${servicesFont.variable}`}>
      <p className="zorx-error-code">404</p>
      <h1 className="zorx-error-title">This page doesn&apos;t exist.</h1>
      <Link href="/" className="zorx-cta zorx-error-link">
        Back to ZORX
      </Link>
    </main>
  );
}
