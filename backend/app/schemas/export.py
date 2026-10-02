from pydantic import BaseModel, Field

EXPORT_PASSWORD_MIN_LENGTH = 12


class ExportFile(BaseModel):
    format_version: int
    exported_at: str
    kdf_salt: str
    nonce: str
    ciphertext: str


class ExportPasswordIn(BaseModel):
    export_password: str = Field(min_length=EXPORT_PASSWORD_MIN_LENGTH)


class ImportIn(BaseModel):
    export_password: str = Field(min_length=1)
    export_data: ExportFile


class ImportSummary(BaseModel):
    identities_imported: int
    accounts_imported: int
    notes_imported: int
    tasks_imported: int
    nodes_imported: int
    edges_imported: int


class BackupInfo(BaseModel):
    filename: str
    created_at: str
    size_bytes: int