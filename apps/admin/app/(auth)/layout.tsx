import Image from 'next/image';
import type { ReactNode } from 'react';

// Login and 2FA pages: a powder blue band with the submark, then one narrow white column.
// No motion in the admin.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="bg-primary px-gutter py-4">
        <Image
          src="/brand/svg/mustafa-apparels-submark-black.svg"
          alt="MA Apparels"
          width={53}
          height={32}
          className="h-8 w-auto"
          priority
        />
      </header>
      <main className="mx-auto w-full max-w-md px-gutter pt-12 pb-section">{children}</main>
    </>
  );
}
