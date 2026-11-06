import { HeaderLogo } from '../components/logo';

// Placeholder until the real header (step 6.1) and home page (step 6.13).
export default function Home() {
  return (
    <>
      <header className="bg-primary px-gutter py-4">
        <HeaderLogo />
      </header>
      <main>
        <h1 className="px-gutter py-section text-display font-light">Hello</h1>
      </main>
    </>
  );
}
