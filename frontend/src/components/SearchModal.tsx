import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Identity, Account } from "../services/api";
import "./SearchModal.css";

interface SearchModalProps {
  identities: Identity[];
  accounts: Account[];
  onSelectEntity: (type: "identity" | "account", entityId: string) => void;
  onClose: () => void;
}

type FilterType = "all" | "identity" | "account" | "no-2fa" | "no-password";

export function SearchModal({
  identities,
  accounts,
  onSelectEntity,
  onClose,
}: SearchModalProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const cleanQuery = query.trim().toLowerCase();

  const showIdentities = filter === "all" || filter === "identity";
  const showAccounts = filter !== "identity";

  const filteredIdentities = showIdentities
    ? identities.filter((i) => i.name.toLowerCase().includes(cleanQuery))
    : [];

  const filteredAccounts = showAccounts
    ? accounts.filter((a) => {
        const matchesQuery = a.service_name.toLowerCase().includes(cleanQuery);
        if (!matchesQuery) return false;

        if (filter === "no-2fa") return !a.has_2fa;
        if (filter === "no-password") return !a.has_password;
        return true;
      })
    : [];

  const hasResults = filteredIdentities.length > 0 || filteredAccounts.length > 0;

  return (
    <div
      className="modal-backdrop search-modal-backdrop"
      onClick={onClose}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div
        className="modal-card search-modal-card"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="modal-field">
          <input
            type="text"
            className="search-input"
            placeholder={t("searchModal.placeholder")}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>

        <div className="search-filters">
          <button
            type="button"
            className={`search-filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            {t("searchModal.filters.all")}
          </button>
          <button
            type="button"
            className={`search-filter-btn ${filter === "identity" ? "active" : ""}`}
            onClick={() => setFilter("identity")}
          >
            👤 {t("searchModal.filters.identities")}
          </button>
          <button
            type="button"
            className={`search-filter-btn ${filter === "account" ? "active" : ""}`}
            onClick={() => setFilter("account")}
          >
            🔑 {t("searchModal.filters.accounts")}
          </button>
          <button
            type="button"
            className={`search-filter-btn ${filter === "no-2fa" ? "active" : ""}`}
            onClick={() => setFilter("no-2fa")}
          >
            ⚠️ {t("searchModal.filters.no2fa")}
          </button>
          <button
            type="button"
            className={`search-filter-btn ${filter === "no-password" ? "active" : ""}`}
            onClick={() => setFilter("no-password")}
          >
            🚫 {t("searchModal.filters.noPassword")}
          </button>
        </div>

        <div className="search-results">
          {!hasResults && <div className="search-empty">{t("searchModal.empty")}</div>}

          {filteredIdentities.length > 0 && (
            <div className="search-group">
              <div className="search-group-title">
                {t("searchModal.groups.identities", { count: filteredIdentities.length })}
              </div>
              {filteredIdentities.map((identity) => (
                <div
                  key={identity.id}
                  className="search-item"
                  onClick={() => {
                    onSelectEntity("identity", identity.id);
                    onClose();
                  }}
                >
                  <span className="search-item-icon">👤</span>
                  <span className="search-item-label">{identity.name}</span>
                </div>
              ))}
            </div>
          )}

          {filteredAccounts.length > 0 && (
            <div className="search-group">
              <div className="search-group-title">
                {t("searchModal.groups.accounts", { count: filteredAccounts.length })}
              </div>
              {filteredAccounts.map((account) => (
                <div
                  key={account.id}
                  className="search-item"
                  onClick={() => {
                    onSelectEntity("account", account.id);
                    onClose();
                  }}
                >
                  <span className="search-item-icon">🔑</span>
                  <span className="search-item-label">{account.service_name}</span>
                  <div className="search-item-badges">
                    {!account.has_password && (
                      <span className="search-badge badge-error">
                        {t("searchModal.badges.noPassword")}
                      </span>
                    )}
                    {!account.has_2fa && (
                      <span className="search-badge badge-warning">
                        {t("searchModal.badges.no2fa")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t("searchModal.buttons.close")}
          </button>
        </div>
      </div>
    </div>
  );
}