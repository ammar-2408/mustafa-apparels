import Image from 'next/image';
import type { ReactNode } from 'react';

// Login and 2FA pages: the submark, then one narrow column. No motion in the admin.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-gutter py-12">
      <Image
        src="/brand/svg/mustafa-apparels-submark-black.svg"
        alt="MA Apparels"
        width={53}
        height={32}
        className="mb-12 h-8 w-auto"
        priority
      />
      {children}
    </main>
  );
}
