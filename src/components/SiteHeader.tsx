import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/demo", label: "Demo" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/status", label: "Status" },
  { href: "/setup", label: "Setup" },
];

export default function SiteHeader() {
  return (
    <header className="border-b border-white/10 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-semibold tracking-tight text-zinc-50">
          PR Intent Checker
        </Link>
        <nav className="flex gap-4 text-sm text-zinc-400">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-zinc-100">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
