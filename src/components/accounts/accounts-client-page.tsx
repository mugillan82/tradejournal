"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { TradingAccountDto } from "@/lib/client/accounts";
import { fetchTradingAccountsClient } from "@/lib/client/accounts";
import { AccountsHeader } from "./accounts-header";
import { AccountsSummaryBar } from "./accounts-summary-bar";
import { AccountsTable } from "./accounts-table";
import { AccountCreateModal } from "./account-create-modal";
import { AccountEditModal } from "./account-edit-modal";
import { AccountDeleteModal } from "./account-delete-modal";
import { AccountStatusModal } from "./account-status-modal";
import { AccountsSkeleton } from "./accounts-skeleton";
import { AccountsEmptyState } from "./accounts-empty-state";
import { Search, RotateCcw, AlertCircle, CheckCircle } from "@/components/icons";

export function AccountsClientPage() {
  const [accounts, setAccounts] = useState<ReadonlyArray<TradingAccountDto>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TradingAccountDto | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<TradingAccountDto | null>(null);
  const [statusTogglingAccount, setStatusTogglingAccount] = useState<TradingAccountDto | null>(null);

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await fetchTradingAccountsClient({
        sort: { field: "createdAt", direction: "desc" },
        pagination: { pageSize: 100 },
      });
      setAccounts(result.items);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load trading accounts. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function init() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const result = await fetchTradingAccountsClient(
          {
            sort: { field: "createdAt", direction: "desc" },
            pagination: { pageSize: 100 },
          },
          controller.signal,
        );
        setAccounts(result.items);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load trading accounts.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    init();

    return () => {
      controller.abort();
    };
  }, []);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = account.name.toLowerCase().includes(query);
        const matchesCurrency = account.currency.toLowerCase().includes(query);
        const matchesType = account.type.toLowerCase().includes(query);
        if (!matchesName && !matchesCurrency && !matchesType) return false;
      }

      if (statusFilter === "ACTIVE" && !account.isActive) return false;
      if (statusFilter === "INACTIVE" && account.isActive) return false;

      if (typeFilter !== "ALL" && account.type !== typeFilter) return false;

      return true;
    });
  }, [accounts, searchQuery, statusFilter, typeFilter]);

  const isFiltered = searchQuery.trim() !== "" || statusFilter !== "ALL" || typeFilter !== "ALL";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
  };

  // Handlers for modal completions
  const handleCreated = (newAccount: TradingAccountDto) => {
    setAccounts((prev) => [newAccount, ...prev]);
    showToast(`Trading account "${newAccount.name}" created successfully.`);
  };

  const handleUpdated = (updated: TradingAccountDto) => {
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    showToast(`Trading account "${updated.name}" updated successfully.`);
  };

  const handleDeleted = (deletedId: string) => {
    const found = accounts.find((a) => a.id === deletedId);
    setAccounts((prev) => prev.filter((a) => a.id !== deletedId));
    showToast(`Trading account "${found?.name || "account"}" deleted successfully.`);
  };

  const handleStatusToggled = (updated: TradingAccountDto) => {
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    showToast(
      `Account "${updated.name}" is now ${updated.isActive ? "active" : "inactive"}.`,
    );
  };

  if (isLoading) {
    return <AccountsSkeleton />;
  }

  if (errorMessage && accounts.length === 0) {
    return (
      <div className="space-y-6">
        <AccountsHeader onAddAccount={() => setIsCreateOpen(true)} />
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-rose-900/50 bg-rose-950/20 backdrop-blur-sm">
          <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-3">
            <AlertCircle size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-100">Unable to Load Accounts</h3>
          <p className="mt-1 text-sm text-slate-400 max-w-sm">{errorMessage}</p>
          <button
            type="button"
            onClick={loadAccounts}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RotateCcw size={15} />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast feedback */}
      {successToast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-400 text-sm shadow-xl backdrop-blur-md animate-fade-in"
        >
          <CheckCircle size={18} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <AccountsHeader onAddAccount={() => setIsCreateOpen(true)} />

      {/* Summary KPI Bar */}
      {accounts.length > 0 && <AccountsSummaryBar accounts={accounts} />}

      {/* Main Content Area */}
      {accounts.length === 0 ? (
        <AccountsEmptyState onAddAccount={() => setIsCreateOpen(true)} />
      ) : (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/80">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search accounts by name or currency..."
                className="w-full pl-9 pr-3.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2">
              <select
                aria-label="Filter by Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>

              <select
                aria-label="Filter by Type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Types</option>
                <option value="LIVE">Live</option>
                <option value="PAPER_TRADING">Paper Trading</option>
                <option value="SIMULATION">Simulation</option>
                <option value="DEMO">Demo</option>
              </select>

              <button
                type="button"
                onClick={loadAccounts}
                title="Refresh Accounts"
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <RotateCcw size={15} />
                <span className="sr-only">Refresh Accounts</span>
              </button>
            </div>
          </div>

          {/* Accounts List / Table */}
          {filteredAccounts.length === 0 ? (
            <AccountsEmptyState
              onAddAccount={() => setIsCreateOpen(true)}
              isFiltered={isFiltered}
              onClearFilters={clearFilters}
            />
          ) : (
            <AccountsTable
              accounts={filteredAccounts}
              onEdit={(acc) => setEditingAccount(acc)}
              onDelete={(acc) => setDeletingAccount(acc)}
              onToggleStatus={(acc) => setStatusTogglingAccount(acc)}
            />
          )}
        </div>
      )}

      {/* Modals */}
      <AccountCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreated}
      />

      <AccountEditModal
        account={editingAccount}
        isOpen={editingAccount !== null}
        onClose={() => setEditingAccount(null)}
        onSuccess={handleUpdated}
      />

      <AccountDeleteModal
        account={deletingAccount}
        isOpen={deletingAccount !== null}
        onClose={() => setDeletingAccount(null)}
        onSuccess={handleDeleted}
      />

      <AccountStatusModal
        account={statusTogglingAccount}
        isOpen={statusTogglingAccount !== null}
        onClose={() => setStatusTogglingAccount(null)}
        onSuccess={handleStatusToggled}
      />
    </div>
  );
}
