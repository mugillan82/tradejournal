/**
 * Accounts Page Route — /accounts
 *
 * Server component wrapper for the Trading Accounts management dashboard.
 * Enforces server-side authentication check and wraps AccountsClientPage in Suspense.
 */

import { Suspense } from "react";
import { requireServerUser } from "@/lib/auth/session";
import { AccountsClientPage } from "@/components/accounts/accounts-client-page";
import { AccountsSkeleton } from "@/components/accounts/accounts-skeleton";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  await requireServerUser();

  return (
    <Suspense fallback={<AccountsSkeleton />}>
      <AccountsClientPage />
    </Suspense>
  );
}
