import { Orb } from "@/components/orb/Orb";

/** Calm two-column frame for sign-in and join pages. */
export function AuthShell({ title, lead, children, aside }: { title: string; lead?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-4 pt-8 sm:px-6 md:grid-cols-[1fr_400px] md:items-start md:pt-16">
      <div className="order-2 md:order-1">
        <div className="hidden md:block">
          <Orb state="idle" className="-ms-10 w-72" />
        </div>
        {aside}
      </div>
      <div className="order-1 md:order-2">
        <h1 className="font-display text-4xl leading-tight">{title}</h1>
        {lead && <p className="mt-2 text-muted">{lead}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
