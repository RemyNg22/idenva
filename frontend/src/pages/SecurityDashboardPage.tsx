import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError, type SecurityDashboard } from "../services/api";
import "./SecurityDashboardPage.css";

interface SecurityDashboardPageProps {
  onClose: () => void;
}

export function SecurityDashboardPage({ onClose }: SecurityDashboardPageProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<SecurityDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSecurityDashboard()
      .then(setData)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : t("securityDashboard.errors.loadFailed")),
      );
  }, [t]);

  if (error) {
    return (
      <div className="security-dashboard">
        <div className="security-dashboard__header">
          <h1>{t("securityDashboard.title")}</h1>
          <button className="security-dashboard__close" onClick={onClose}>
            {t("securityDashboard.backToCanvas")}
          </button>
        </div>
        <p className="security-dashboard__error">{error}</p>
      </div>
    );
  }

  if (!data) {
    return <div className="security-dashboard" />;
  }

  const { overview, alerts, scores, correlations } = data;

  return (
    <div className="security-dashboard">
      <div className="security-dashboard__header">
        <h1>{t("securityDashboard.title")}</h1>
        <button className="security-dashboard__close" onClick={onClose}>
          {t("securityDashboard.backToCanvas")}
        </button>
      </div>

      <div className="security-dashboard__stats">
        <StatCard label={t("securityDashboard.stats.identities")} value={overview.identities_count} />
        <StatCard label={t("securityDashboard.stats.accounts")} value={overview.accounts_count} />
        <StatCard label={t("securityDashboard.stats.passwords")} value={overview.passwords_count} />
        <StatCard
          label={t("securityDashboard.stats.twoFaEnabled")}
          value={`${overview.two_fa_enabled_count} / ${overview.two_fa_total_count}`}
        />
        <StatCard
          label={t("securityDashboard.stats.weakPasswords")}
          value={overview.weak_passwords_count}
          warn={overview.weak_passwords_count > 0}
        />
        <StatCard
          label={t("securityDashboard.stats.reusedPasswords")}
          value={overview.reused_passwords_count}
          warn={overview.reused_passwords_count > 0}
        />
        <StatCard
          label={t("securityDashboard.stats.oldPasswords")}
          value={overview.old_passwords_count}
          warn={overview.old_passwords_count > 0}
        />
        <StatCard
          label={t("securityDashboard.stats.opsecAlerts")}
          value={alerts.length}
          warn={alerts.length > 0}
        />
      </div>

      <section className="security-dashboard__section">
        <h2>{t("securityDashboard.sections.scoresTitle")}</h2>
        {scores.length === 0 ? (
          <p className="security-dashboard__empty">{t("securityDashboard.emptyScores")}</p>
        ) : (
          <div className="security-dashboard__scores">
            {scores.map((s) => (
              <div key={s.identity_id} className="opsec-card">
                <div className="opsec-card__header">
                  <span className="opsec-card__name">{s.identity_name}</span>
                  <span className={`opsec-card__score ${scoreColorClass(s.score)}`}>{s.score}/100</span>
                </div>
                {s.factors.length > 0 && (
                  <ul className="opsec-card__factors">
                    {s.factors.map((f, i) => (
                      <li key={i}>
                        {formatFactorLabel(f.label, t)}{" "}
                        <span className="opsec-card__points">({f.points})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="security-dashboard__section">
        <h2>{t("securityDashboard.sections.alertsTitle")}</h2>
        {alerts.length === 0 ? (
          <p className="security-dashboard__empty">{t("securityDashboard.emptyAlerts")}</p>
        ) : (
          <ul className="security-dashboard__alerts">
            {alerts.map((a, i) => (
              <li key={i} className={`alert alert--${a.severity}`}>
                <span className="alert__icon">{a.severity === "critical" ? "🔴" : "🟡"}</span>
                <span className="alert__target">{a.service_name ?? a.identity_name}</span>
                <span className="alert__message">{formatAlertMessage(a.message, t)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {correlations.length > 0 && (
        <section className="security-dashboard__section">
          <h2>{t("securityDashboard.sections.correlationsTitle")}</h2>
          <ul className="security-dashboard__correlations">
            {correlations.map((c, i) => (
              <li key={i} className="correlation">
                {t("securityDashboard.correlationText", {
                  identityA: c.identity_a_name,
                  identityB: c.identity_b_name,
                  fields: c.shared_fields.join(", "),
                })}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className={`stat-card ${warn ? "stat-card--warn" : ""}`}>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}

function scoreColorClass(score: number): string {
  if (score >= 80) return "opsec-card__score--good";
  if (score >= 50) return "opsec-card__score--medium";
  return "opsec-card__score--bad";
}

function formatAlertMessage(message: string, t: (key: string, options?: any) => string): string {
  if (message.startsWith("shared_fields:")) {
    const [, fields, targetName] = message.split(":");
    return t("dashboard.alerts.sharedFields", { fields, targetName });
  }
  return t(`dashboard.alerts.${message}`, { defaultValue: message });
}

function formatFactorLabel(label: string, t: (key: string, options?: any) => string): string {
  if (label.includes(":")) {
    const [key, count] = label.split(":");
    return t(`dashboard.factors.${key}`, { count: Number(count), defaultValue: label });
  }
  return t(`dashboard.factors.${label}`, { defaultValue: label });
}