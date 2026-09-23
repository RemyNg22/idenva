from pydantic import BaseModel


class SecurityOverview(BaseModel):
    identities_count: int
    accounts_count: int
    passwords_count: int
    two_fa_enabled_count: int
    two_fa_total_count: int
    weak_passwords_count: int
    reused_passwords_count: int
    old_passwords_count: int


class SecurityAlert(BaseModel):
    severity: str  # "critical" | "warning" | "info"
    identity_id: str | None
    identity_name: str | None
    account_id: str | None
    service_name: str | None
    message: str


class OpsecFactor(BaseModel):
    label: str
    points: int


class IdentityOpsecScore(BaseModel):
    identity_id: str
    identity_name: str
    score: int
    factors: list[OpsecFactor]


class CorrelationAlert(BaseModel):
    identity_a_id: str
    identity_a_name: str
    identity_b_id: str
    identity_b_name: str
    shared_fields: list[str]


class SecurityDashboard(BaseModel):
    overview: SecurityOverview
    alerts: list[SecurityAlert]
    scores: list[IdentityOpsecScore]
    correlations: list[CorrelationAlert]