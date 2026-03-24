from pydantic import BaseModel


class MethodologyResponse(BaseModel):
    score_version: str
    metric_descriptions: dict[str, str]
    caveats: list[str]
    source_coverage_notes: list[str]


class EvidenceCoverageRow(BaseModel):
    dataset: str
    row_count: int


class EvidenceResponse(BaseModel):
    methodology_version: str
    coverage: list[EvidenceCoverageRow]
    freshness_note: str
