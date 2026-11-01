from typing import Dict, List, Any
import numpy as np
from sqlalchemy.orm import Session

from backend.app.models.entities import ResearchObservation
from backend.app.schemas.research_schemas import (
    ExperimentCompareResponse,
    ConditionDifference
)

class ResearchComparisonService:
    def compare_experiments(
        self,
        db: Session,
        dataset_id: int,
        experiment_ids: List[str]
    ) -> ExperimentCompareResponse:
        """Compare two or more experimental runs side-by-side with fair condition auditing."""
        observations = (
            db.query(ResearchObservation)
            .filter(
                ResearchObservation.dataset_id == dataset_id,
                ResearchObservation.experiment_id.in_(experiment_ids),
                ResearchObservation.audit_status != "excluded"
            )
            .all()
        )

        if not observations:
            return ExperimentCompareResponse(
                dataset_id=dataset_id,
                experiments=[],
                condition_differences=[],
                fair_comparison_advisory="No valid observations found for selected experiment IDs.",
                performance_comparison_summary="No data available."
            )

        # Group observations by experiment_id
        grouped: Dict[str, List[ResearchObservation]] = {}
        for o in observations:
            if o.experiment_id not in grouped:
                grouped[o.experiment_id] = []
            grouped[o.experiment_id].append(o)

        exp_summaries = []
        for exp_id in experiment_ids:
            obs_list = grouped.get(exp_id, [])
            if not obs_list:
                continue

            removals = [o.removal_efficiency for o in obs_list if o.removal_efficiency is not None]
            c0_vals = [o.initial_concentration for o in obs_list]
            ct_vals = [o.final_concentration for o in obs_list]
            ph_vals = [o.ph for o in obs_list if o.ph is not None]
            temp_vals = [o.temperature for o in obs_list if o.temperature is not None]
            dur_vals = [o.treatment_duration for o in obs_list if o.treatment_duration is not None]
            dose_vals = [o.treatment_dose for o in obs_list if o.treatment_dose is not None]

            mean_rem = float(np.mean(removals)) if removals else 0.0
            std_rem = float(np.std(removals, ddof=1)) if len(removals) > 1 else 0.0
            cv = (std_rem / abs(mean_rem) * 100.0) if abs(mean_rem) > 0.001 and len(removals) > 1 else 0.0

            summary = {
                "experiment_id": exp_id,
                "contaminant": obs_list[0].contaminant,
                "treatment_method": obs_list[0].treatment_method,
                "water_source": obs_list[0].water_source,
                "sample_size": len(obs_list),
                "mean_initial_concentration": round(float(np.mean(c0_vals)), 4),
                "mean_final_concentration": round(float(np.mean(ct_vals)), 4),
                "mean_removal_efficiency": round(mean_rem, 2),
                "std_removal_efficiency": round(std_rem, 2),
                "cv_percent": round(cv, 2),
                "unit": obs_list[0].unit,
                "mean_ph": round(float(np.mean(ph_vals)), 2) if ph_vals else None,
                "mean_temperature": round(float(np.mean(temp_vals)), 1) if temp_vals else None,
                "mean_duration": round(float(np.mean(dur_vals)), 1) if dur_vals else None,
                "mean_dose": round(float(np.mean(dose_vals)), 2) if dose_vals else None,
                "instrument_method": obs_list[0].instrument_method or "Standard Lab Method",
                "notes": " | ".join(filter(None, [o.notes for o in obs_list])) or None
            }
            exp_summaries.append(summary)

        # Analyze condition discrepancies
        differences: List[ConditionDifference] = []
        advisories = []

        if len(exp_summaries) >= 2:
            # 1. Contaminant check
            contams = set(e["contaminant"] for e in exp_summaries)
            if len(contams) > 1:
                differences.append(ConditionDifference(
                    condition="Contaminant Target",
                    is_mismatched=True,
                    description=f"Experiments target different chemical species ({', '.join(contams)}). Performance percentages reflect disparate ionic behavior.",
                    severity="unfair_comparison"
                ))
                advisories.append("Cross-contaminant comparison: Direct efficiency comparison is scientifically invalid without speciation normalization.")

            # 2. pH check
            phs = [e["mean_ph"] for e in exp_summaries if e["mean_ph"] is not None]
            if len(phs) >= 2 and (max(phs) - min(phs)) > 0.6:
                diff_val = max(phs) - min(phs)
                differences.append(ConditionDifference(
                    condition="Solution pH",
                    is_mismatched=True,
                    description=f"pH varies by {diff_val:.2f} units across experiments (min: {min(phs)}, max: {max(phs)}). pH dramatically alters metal speciation and sorbent surface charge.",
                    severity="caution"
                ))
                advisories.append("pH discrepancy noted: Observed removal differences may stem from pH shift rather than inherent technology capability.")

            # 3. Treatment Duration check
            durs = [e["mean_duration"] for e in exp_summaries if e["mean_duration"] is not None]
            if len(durs) >= 2 and (max(durs) - min(durs)) > 15:
                differences.append(ConditionDifference(
                    condition="Treatment Duration",
                    is_mismatched=True,
                    description=f"Reaction / contact times differ significantly (range: {min(durs)} to {max(durs)} minutes). Shorter duration runs may not have attained chemical equilibrium.",
                    severity="caution"
                ))
                advisories.append("Kinetic time discrepancy: Ensure experiments are compared at steady-state equilibrium.")

            # 4. Temperature check
            temps = [e["mean_temperature"] for e in exp_summaries if e["mean_temperature"] is not None]
            if len(temps) >= 2 and (max(temps) - min(temps)) > 3.0:
                differences.append(ConditionDifference(
                    condition="Operating Temperature",
                    is_mismatched=True,
                    description=f"Operating temperatures differ by {max(temps) - min(temps):.1f}°C, influencing thermodynamic sorption equilibria.",
                    severity="caution"
                ))

            # 5. Initial Concentration check
            c0s = [e["mean_initial_concentration"] for e in exp_summaries]
            if len(c0s) >= 2 and (max(c0s) / (min(c0s) + 1e-6)) > 1.8:
                differences.append(ConditionDifference(
                    condition="Initial Feed Concentration",
                    is_mismatched=True,
                    description=f"Influent contaminant loading varies substantially ({min(c0s)} vs {max(c0s)} mg/L). High feed concentrations can cause sorbent site saturation or concentration polarization.",
                    severity="caution"
                ))

        if not advisories:
            fair_msg = "Operating conditions (pH, duration, temperature, initial concentration) are sufficiently standardized for direct performance comparison."
        else:
            fair_msg = " | ".join(advisories)

        # Performance summary statement
        if len(exp_summaries) >= 2:
            sorted_by_rem = sorted(exp_summaries, key=lambda x: -x["mean_removal_efficiency"])
            top = sorted_by_rem[0]
            bottom = sorted_by_rem[-1]
            perf_summary = f"Highest removal: '{top['experiment_id']}' ({top['treatment_method']}: {top['mean_removal_efficiency']}%) vs Lowest: '{bottom['experiment_id']}' ({bottom['treatment_method']}: {bottom['mean_removal_efficiency']}%). Net difference: {top['mean_removal_efficiency'] - bottom['mean_removal_efficiency']:.2f}%."
        else:
            perf_summary = "Single experiment selected."

        return ExperimentCompareResponse(
            dataset_id=dataset_id,
            experiments=exp_summaries,
            condition_differences=differences,
            fair_comparison_advisory=fair_msg,
            performance_comparison_summary=perf_summary
        )

research_comparison_service = ResearchComparisonService()
