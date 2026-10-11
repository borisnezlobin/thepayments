import { Clock } from "@phosphor-icons/react/dist/ssr";
import { buttonClasses } from "@/components/ui/Button";
import Link from "next/link";
export function StatusPanel({
  title,
  children,
  href,
  action,
}: {
  title: string;
  children: React.ReactNode;
  href?: string;
  action?: string;
}) {
  return (
    <section className="status-panel">
      <Clock className="status-symbol" size={36} aria-hidden />
      <h2>{title}</h2>
      <div className="muted">{children}</div>
      {href && (
        <Link className={buttonClasses("quiet")} href={href}>
          {action}
        </Link>
      )}
    </section>
  );
}
