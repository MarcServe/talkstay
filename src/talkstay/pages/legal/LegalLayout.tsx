import { Link } from "react-router-dom";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";
import { SUPPORT_EMAIL, SUPPORT_ADDRESS, MAILTO_SUPPORT } from "@/config/contact";

export const LEGAL_UPDATED = "11 August 2026";

const LINKS = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Use" },
  { to: "/cookies", label: "Cookie Policy" },
  { to: "/acceptable-use", label: "Acceptable Use" },
  { to: "/data-processing", label: "Data Processing" },
] as const;

export default function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div data-talkstay className="ts-atmosphere min-h-screen text-foreground">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <TalkStayLogo size={28} />
            <span className="font-semibold tracking-tight">TalkStay</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Legal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {LEGAL_UPDATED}</p>

        <nav className="mt-6 flex flex-wrap gap-2 border-b pb-4">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-violet-300 hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <article className="prose-legal mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_a]:text-violet-700 [&_a]:underline">
          {children}
        </article>

        <div className="mt-12 rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Contact</p>
          <p className="mt-1">
            TalkStay is a product of TalkWeb. Questions about these terms:{" "}
            <a href={MAILTO_SUPPORT} className="text-violet-700 underline">{SUPPORT_EMAIL}</a>
          </p>
          <p className="mt-1">{SUPPORT_ADDRESS}</p>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-x-4 gap-y-2 px-6 py-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} TalkStay by TalkWeb</span>
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-foreground">{l.label}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
