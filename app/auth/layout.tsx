export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          MedSchedule
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Healthcare workforce scheduling
        </p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
