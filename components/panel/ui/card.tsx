import { cn } from "@/lib/utils/cn";

type Props = React.HTMLAttributes<HTMLDivElement> & { padded?: boolean };
export function Card({ className, padded, children, ...rest }: Props) {
  return (
    <div className={cn("od-card", padded && "od-card-padded", className)} {...rest}>
      {children}
    </div>
  );
}

type HeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
};
export function CardHeader({ title, subtitle, right }: HeaderProps) {
  return (
    <div className="od-card-hd">
      <div>
        <div className="od-card-hd-title">{title}</div>
        {subtitle ? <div className="od-card-hd-sub">{subtitle}</div> : null}
      </div>
      {right ? <div className="od-card-hd-right">{right}</div> : null}
    </div>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("od-card-bd", className)}>{children}</div>;
}
