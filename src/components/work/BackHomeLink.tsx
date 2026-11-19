"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { returnToWorkByDefault } from "@/lib/work/navigation";

/** BACK TO HOME: lands on Featured Work — where the user left it, or its top. */
export function BackHomeLink({ className, children }: { className: string; children: ReactNode }) {
  return (
    <Link href="/" className={className} onClick={returnToWorkByDefault}>
      {children}
    </Link>
  );
}
