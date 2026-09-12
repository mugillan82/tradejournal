/**
 * Account Detail Page Route — /accounts/[id]
 *
 * Server component wrapper for individual Trading Account detail and performance.
 * Enforces server-side authentication check and passes account id to client page.
 */

import { Suspense } from "react";
import { requireServerUser } from "@/lib/auth/session";
import { AccountDetailClientPage } from "@/components/accounts/account-detail-client-page";
import { AccountsSkeleton } from "@/components/accounts/accounts-skeleton";

export const dynamic = "force-dynamic";

interface AccountDetailPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
  await requireServerUser();
  const { id } = await params;

  return (
    <Suspense fallback={<AccountsSkeleton />}>
      <AccountDetailClientPage id={id} />
    </Suspense>
  );
}
