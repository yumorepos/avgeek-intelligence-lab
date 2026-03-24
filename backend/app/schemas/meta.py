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


class InsightQualityResponse(BaseModel):
    methodology_version: str
    thresholds: dict[str, float]
    total_insights_generated: int
    suppressed_low_confidence_count: int
    suppressed_rate_pct: float
    label_distribution: dict[str, int]
    confidence_distribution: dict[str, int]
    data_coverage_stats: dict[str, int]
