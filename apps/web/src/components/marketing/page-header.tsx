export function PageHeader({
  title,
  body,
}: {
  title: string;
  body?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl px-6 pt-28 pb-4 text-center sm:pt-36">
      <h1 className="text-balance font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
        {title}
      </h1>
      {body && <p className="mt-4 text-pretty text-lg text-muted-foreground">{body}</p>}
    </div>
  );
}
