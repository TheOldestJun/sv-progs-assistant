/*
 * Footer: прижатый к низу футер с копирайтом по центру.
 */
export function Footer() {
  return (
    <footer className="border-t border-border bg-footer-bg">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8">
        <p className="text-sm text-text-secondary">
          &copy; {new Date().getFullYear()} SV Progs Assistant
        </p>
      </div>
    </footer>
  );
}
