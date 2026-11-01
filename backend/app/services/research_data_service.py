import io
import json
import math
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from backend.app.models.entities import ResearchDataset, ResearchObservation
from backend.app.schemas.research_schemas import (
    ColumnMappingConfig,
    DataQualityMetrics,
    FlaggedRecordDetail
)

class ResearchDataService:
    def parse_file_to_dataframe(self, file_bytes: bytes, file_name: str) -> pd.DataFrame:
        """Parse raw CSV or Excel bytes into a Pandas DataFrame."""
        if file_name.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(file_bytes))
        else:
            # Default to CSV with flexible separator sniffing
            try:
                df = pd.read_csv(io.BytesIO(file_bytes))
            except Exception:
                df = pd.read_csv(io.BytesIO(file_bytes), sep=';')
        return df

    def calculate_removal_efficiency(self, c0: float, ct: float) -> Optional[float]:
        """
        Calculate contaminant removal efficiency (%) = ((C0 - Ct) / C0) * 100.
        Preserves negative removal (sorbent desorption / leaching).
        Returns None for invalid (negative C0/Ct or zero C0) inputs.
        """
        if c0 is None or ct is None or c0 <= 0 or ct < 0:
            return None
        return round(((c0 - ct) / c0) * 100.0, 4)

    def extract_preview(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Extract columns and preview records for mapping interface."""
        columns = list(df.columns)
        records = df.head(5).to_dict(orient="records")
        # Clean NaNs for JSON serialization
        clean_records = []
        for r in records:
            clean_r = {k: (None if pd.isna(v) else v) for k, v in r.items()}
            clean_records.append(clean_r)
        return {
            "columns": columns,
            "total_rows": len(df),
            "total_preview_rows": len(clean_records),
            "preview_rows": clean_records
        }

    def ingest_dataframe(
        self,
        db: Session,
        df: pd.DataFrame,
        dataset_name: str,
        file_name: Optional[str] = None,
        file_type: str = "csv",
        mapping: Optional[ColumnMappingConfig] = None,
        description: Optional[str] = None
    ) -> ResearchDataset:
        """Map, validate, flag quality issues, and persist research dataset."""
        if mapping is None:
            mapping = ColumnMappingConfig()

        map_dict = mapping.model_dump()

        dataset = ResearchDataset(
            name=dataset_name,
            description=description,
            file_name=file_name,
            file_type=file_type,
            uploaded_at=datetime.now(timezone.utc),
            metadata_json=json.dumps({"original_columns": list(df.columns)})
        )
        db.add(dataset)
        db.flush()

        observations = []
        replicate_groups: Dict[Tuple[str, str, str], List[float]] = {}

        # 1. First pass: extract raw mapped values
        raw_rows = []
        for idx, row in df.iterrows():
            def get_val(key, default=None):
                col = map_dict.get(key)
                if col and col in row and not pd.isna(row[col]):
                    return row[col]
                return default

            exp_id = str(get_val("experiment_id", f"EXP-{idx+1}")).strip()
            contam = str(get_val("contaminant", "Unknown")).strip()
            treat = str(get_val("treatment_method", "Untreated")).strip()

            try:
                c0 = float(get_val("initial_concentration", 0.0))
            except (ValueError, TypeError):
                c0 = 0.0

            try:
                ct = float(get_val("final_concentration", 0.0))
            except (ValueError, TypeError):
                ct = 0.0

            # Calculate removal efficiency without clamping
            if c0 > 0:
                removal = ((c0 - ct) / c0) * 100.0
            else:
                removal = 0.0

            row_dict = {
                "experiment_id": exp_id,
                "sample_id": str(get_val("sample_id", "")).strip() or None,
                "experiment_date": str(get_val("experiment_date", "")).strip() or None,
                "water_source": str(get_val("water_source", "Groundwater")).strip() or "Groundwater",
                "contaminant": contam,
                "initial_concentration": c0,
                "final_concentration": ct,
                "removal_efficiency": round(removal, 4),
                "unit": str(get_val("unit", "mg/L")).strip() or "mg/L",
                "treatment_method": treat,
                "treatment_duration": float(get_val("treatment_duration", 0.0)) if get_val("treatment_duration") is not None else None,
                "ph": float(get_val("ph", 7.0)) if get_val("ph") is not None else None,
                "temperature": float(get_val("temperature", 20.0)) if get_val("temperature") is not None else None,
                "treatment_dose": float(get_val("treatment_dose", 0.0)) if get_val("treatment_dose") is not None else None,
                "replicate_number": int(get_val("replicate_number", 1)) if get_val("replicate_number") is not None else 1,
                "measurement_uncertainty": float(get_val("measurement_uncertainty", 0.0)) if get_val("measurement_uncertainty") is not None else None,
                "instrument_method": str(get_val("instrument_method", "")).strip() or None,
                "notes": str(get_val("notes", "")).strip() or None,
            }
            raw_rows.append(row_dict)

            # Track for replicate outlier statistics
            grp_key = (exp_id, contam, treat)
            if grp_key not in replicate_groups:
                replicate_groups[grp_key] = []
            replicate_groups[grp_key].append(removal)

        # 2. Second pass: Data quality evaluation & scientific outlier flagging
        valid_count = 0
        flagged_count = 0

        for row_dict in raw_rows:
            flags = []
            c0 = row_dict["initial_concentration"]
            ct = row_dict["final_concentration"]
            removal = row_dict["removal_efficiency"]
            ph = row_dict["ph"]
            grp_key = (row_dict["experiment_id"], row_dict["contaminant"], row_dict["treatment_method"])
            grp_removals = replicate_groups.get(grp_key, [])

            if c0 <= 0:
                flags.append("Non-positive initial concentration (C0 <= 0)")
            if ct < 0:
                flags.append("Negative final concentration (physically impossible)")
            if ph is not None and (ph < 0 or ph > 14):
                flags.append(f"Unusual pH value ({ph}) outside standard physical boundaries [0-14]")
            if removal < 0:
                flags.append(f"Negative removal efficiency ({removal:.2f}%): Final concentration exceeds initial (indicates desorption, leaching, or analytical error)")

            # Replicate group statistical outlier check (if n >= 3)
            if len(grp_removals) >= 3:
                arr = np.array(grp_removals)
                mean_r = np.mean(arr)
                std_r = np.std(arr, ddof=1)
                if std_r > 0:
                    z_score = abs(removal - mean_r) / std_r
                    if z_score > 2.5:
                        flags.append(f"Statistical outlier in replicate group (Z-score: {z_score:.2f}, deviates from group mean {mean_r:.1f}%)")

            is_flag = len(flags) > 0
            if is_flag:
                flagged_count += 1
                flag_reason = " | ".join(flags)
            else:
                valid_count += 1
                flag_reason = None

            obs = ResearchObservation(
                dataset_id=dataset.id,
                experiment_id=row_dict["experiment_id"],
                sample_id=row_dict["sample_id"],
                experiment_date=row_dict["experiment_date"],
                water_source=row_dict["water_source"],
                contaminant=row_dict["contaminant"],
                initial_concentration=c0,
                final_concentration=ct,
                removal_efficiency=removal,
                unit=row_dict["unit"],
                treatment_method=row_dict["treatment_method"],
                treatment_duration=row_dict["treatment_duration"],
                ph=row_dict["ph"],
                temperature=row_dict["temperature"],
                treatment_dose=row_dict["treatment_dose"],
                replicate_number=row_dict["replicate_number"],
                measurement_uncertainty=row_dict["measurement_uncertainty"],
                instrument_method=row_dict["instrument_method"],
                notes=row_dict["notes"],
                is_flagged=is_flag,
                flag_reason=flag_reason,
                audit_status="accepted"
            )
            observations.append(obs)

        dataset.total_records = len(observations)
        dataset.valid_records = valid_count
        dataset.flagged_records = flagged_count

        db.add_all(observations)
        db.commit()
        db.refresh(dataset)
        return dataset

    def compute_quality_metrics(self, observations: List[ResearchObservation]) -> DataQualityMetrics:
        """Compute comprehensive scientific data quality indicators."""
        total = len(observations)
        if total == 0:
            return DataQualityMetrics(
                total_records=0, valid_records=0, flagged_records=0, excluded_records=0,
                missing_data_percentage=0.0, total_replicate_groups=0,
                single_replicate_count=0, negative_removal_count=0, outlier_count=0
            )

        valid = sum(1 for o in observations if not o.is_flagged and o.audit_status != "excluded")
        flagged = sum(1 for o in observations if o.is_flagged)
        excluded = sum(1 for o in observations if o.audit_status == "excluded")
        negative_removals = sum(1 for o in observations if (o.removal_efficiency or 0) < 0)
        outliers = sum(1 for o in observations if o.flag_reason and "outlier" in o.flag_reason.lower())

        # Count missing fields across critical dimensions
        missing_fields = 0
        total_cells = total * 7  # 7 core fields
        for o in observations:
            if o.ph is None: missing_fields += 1
            if o.temperature is None: missing_fields += 1
            if o.treatment_duration is None: missing_fields += 1
            if o.measurement_uncertainty is None: missing_fields += 1
            if o.sample_id is None: missing_fields += 1
            if o.treatment_dose is None: missing_fields += 1
            if o.instrument_method is None: missing_fields += 1

        missing_pct = round((missing_fields / total_cells) * 100.0, 1) if total_cells > 0 else 0.0

        # Group replicates
        groups: Dict[Tuple[str, str, str], int] = {}
        for o in observations:
            k = (o.experiment_id, o.contaminant, o.treatment_method)
            groups[k] = groups.get(k, 0) + 1

        single_reps = sum(1 for count in groups.values() if count == 1)

        return DataQualityMetrics(
            total_records=total,
            valid_records=valid,
            flagged_records=flagged,
            excluded_records=excluded,
            missing_data_percentage=missing_pct,
            missing_data_pct=missing_pct,
            total_replicate_groups=len(groups),
            replicate_groups_count=len(groups),
            single_replicate_count=single_reps,
            negative_removal_count=negative_removals,
            outlier_count=outliers,
            potential_outliers_count=outliers,
            data_completeness_pct=round(100.0 - missing_pct, 1),
            quality_summary=f"Quality audit completed for {total} observations: {valid} valid records, {flagged} flagged. Data completeness is {100.0 - missing_pct:.1f}%."
        )

    def update_observation_audit(
        self,
        db: Session,
        observation_id: int,
        status: str,
        annotation: Optional[str] = None
    ) -> ResearchObservation:
        """Update audit trail for an observation (accept, exclude, annotate)."""
        obs = db.query(ResearchObservation).filter(ResearchObservation.id == observation_id).first()
        if not obs:
            raise ValueError(f"Observation #{observation_id} not found.")

        obs.audit_status = status
        obs.audit_annotation = annotation
        obs.audited_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(obs)
        return obs

research_data_service = ResearchDataService()
