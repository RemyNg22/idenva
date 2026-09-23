import { useEffect, useState } from "react";
import { api, ApiError, type SecurityDashboard } from "../services/api";
import "./SecurityDashboardPage.css";

interface SecurityDashboardPageProps {
  onClose: () => void;
}

export function SecurityDashboardPage({ onClose }: SecurityDashboardPageProps) {
  const [data, setData] = useState<SecurityDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSecurityDashboard()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Échec du chargement."));
  }, []);

  if (error) {
    return (
      <div className="security-dashboard">
        <div className="security-dashboard__header">
          <h1>Sécurité</h1>
          <button className="security-dashboard__close" onClick={onClose}>× Retour au canvas</button>
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
        <h1>Sécurité</h1>
        <button className="security-dashboard__close" onClick={onClose}>× Retour au canvas</button>
      </div>

      <div className="security-dashboard__stats">
        <StatCard label="Identités" value={overview.identities_count} />
        <StatCard label="Comptes" value={overview.accounts_count} />
        <StatCard label="Mots de passe" value={overview.passwords_count} />
        <StatCard
          label="2FA activée"
          value={`${overview.two_fa_enabled_count} / ${overview.two_fa_total_count}`}
        />
        <StatCard label="Mots de passe faibles" value={overview.weak_passwords_count} warn={overview.weak_passwords_count > 0} />
        <StatCard label="Mots de passe réutilisés" value={overview.reused_passwords_count} warn={overview.reused_passwords_count > 0} />
        <StatCard label="Mots de passe anciens" value={overview.old_passwords_count} warn={overview.old_passwords_count > 0} />
        <StatCard label="Alertes OPSEC" value={alerts.length} warn={alerts.length > 0} />
      </div>

      <section className="security-dashboard__section">
        <h2>Scores OPSEC par identité</h2>
        {scores.length === 0 ? (
          <p className="security-dashboard__empty">Aucune identité pour l'instant.</p>
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
                        {f.label} <span className="opsec-card__points">({f.points})</span>
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
        <h2>Alertes</h2>
        {alerts.length === 0 ? (
          <p className="security-dashboard__empty">Aucune alerte. 👍</p>
        ) : (
          <ul className="security-dashboard__alerts">
            {alerts.map((a, i) => (
              <li key={i} className={`alert alert--${a.severity}`}>
                <span className="alert__icon">{a.severity === "critical" ? "🔴" : "🟡"}</span>
                <span className="alert__target">{a.service_name ?? a.identity_name}</span>
                <span className="alert__message">{a.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {correlations.length > 0 && (
        <section className="security-dashboard__section">
          <h2>Corrélations d'identité</h2>
          <ul className="security-dashboard__correlations">
            {correlations.map((c, i) => (
              <li key={i} className="correlation">
                <strong>{c.identity_a_name}</strong> et <strong>{c.identity_b_name}</strong> partagent :{" "}
                {c.shared_fields.join(", ")}
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