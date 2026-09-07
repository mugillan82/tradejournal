/**
 * /sign-up page (placeholder)
 *
 * The proxy layer redirects unauthenticated users here from
 * protected routes. The real form is a future Step.
 */
export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-950 text-slate-100">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-emerald-400">
          Sign Up
        </h1>
        <p className="text-sm text-slate-400">
          Sign-up form will be implemented in a future step.
        </p>
      </div>
    </main>
  );
}
