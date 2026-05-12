type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export function PageHeader({ title, subtitle, right }: Props) {
  return (
    <div className="od-page-head">
      <div>
        <h1 className="od-page-title">{title}</h1>
        {subtitle ? <p className="od-page-sub">{subtitle}</p> : null}
      </div>
      {right ? <div className="od-page-actions">{right}</div> : null}
    </div>
  );
}
