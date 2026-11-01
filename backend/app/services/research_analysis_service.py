import math
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
from scipy import stats
from collections import defaultdict

from backend.app.models.entities import ResearchObservation
from backend.app.schemas.research_schemas import (
    TreatmentPerformanceMetric,
    ReplicateGroupAnalysis,
    ConditionCorrelation,
    ObservationResponse
)

class ResearchAnalysisService:
    def compute_treatment_performance(
        self, observations: List[ResearchObservation]
    ) -> List[TreatmentPerformanceMetric]:
        """Aggregate contaminant removal performance across treatment technologies."""
        # Filter out excluded records
        active = [o for o in observations if o.audit_status != "excluded"]
        if not active:
            return []

        grouped: Dict[Tuple[str, str], List[ResearchObservation]] = defaultdict(list)
        for o in active:
            grouped[(o.contaminant, o.treatment_method)].append(o)

        metrics: List[TreatmentPerformanceMetric] = []
        for (contam, treat), obs_list in grouped.items():
            removals = [o.removal_efficiency for o in obs_list if o.removal_efficiency is not None]
            c0_vals = [o.initial_concentration for o in obs_list]
            ct_vals = [o.final_concentration for o in obs_list]
            unit = obs_list[0].unit or "mg/L"

            if not removals:
                continue

            arr = np.array(removals)
            mean_rem = float(np.mean(arr))
            std_rem = float(np.std(arr, ddof=1)) if len(arr) > 1 else 0.0
            min_rem = float(np.min(arr))
            max_rem = float(np.max(arr))
            median_rem = float(np.median(arr))

            metric = TreatmentPerformanceMetric(
                contaminant=contam,
                treatment_method=treat,
                record_count=len(obs_list),
                mean_removal_efficiency=round(mean_rem, 2),
                std_removal_efficiency=round(std_rem, 2),
                min_removal_efficiency=round(min_rem, 2),
                max_removal_efficiency=round(max_rem, 2),
                median_removal_efficiency=round(median_rem, 2),
                mean_initial_concentration=round(float(np.mean(c0_vals)), 4),
                mean_final_concentration=round(float(np.mean(ct_vals)), 4),
                unit=unit
            )
            metrics.append(metric)

        # Sort by contaminant name, then mean removal descending
        metrics.sort(key=lambda m: (m.contaminant, -m.mean_removal_efficiency))
        return metrics

    def compute_replicate_reproducibility(
        self, observations: List[ResearchObservation]
    ) -> List[ReplicateGroupAnalysis]:
        """Perform statistical reproducibility, CV%, CI, and uncertainty propagation across replicate groups."""
        active = [o for o in observations if o.audit_status != "excluded"]
        if not active:
            return []

        # Check if experiment_id has duplicates
        exp_id_counts = defaultdict(int)
        for o in active:
            exp_id_counts[o.experiment_id] += 1

        has_shared_exp_ids = any(cnt > 1 for cnt in exp_id_counts.values())

        grouped: Dict[Tuple[str, str, str], List[ResearchObservation]] = defaultdict(list)
        for o in active:
            if has_shared_exp_ids and exp_id_counts[o.experiment_id] > 1:
                key = (o.experiment_id, o.contaminant, o.treatment_method)
            else:
                # Group by identical operational treatment conditions (condition-based replicate group)
                cond_tag = f"Dose:{o.treatment_dose}_pH:{o.ph}_Dur:{o.treatment_duration}"
                key = (cond_tag, o.contaminant, o.treatment_method)
            grouped[key].append(o)

        replicate_analyses: List[ReplicateGroupAnalysis] = []

        for (exp_id, contam, treat), obs_list in grouped.items():
            n = len(obs_list)
            removals = [o.removal_efficiency for o in obs_list if o.removal_efficiency is not None]
            c0_vals = [o.initial_concentration for o in obs_list]
            ct_vals = [o.final_concentration for o in obs_list]
            uncert_vals = [o.measurement_uncertainty for o in obs_list if o.measurement_uncertainty is not None]

            if not removals:
                continue

            arr = np.array(removals)
            mean_rem = float(np.mean(arr))
            std_rem = float(np.std(arr, ddof=1)) if n > 1 else 0.0

            # Coefficient of Variation: CV (%) = (s / |mean|) * 100
            if abs(mean_rem) > 0.001 and n > 1:
                cv = (std_rem / abs(mean_rem)) * 100.0
            else:
                cv = 0.0

            # 95% Confidence Interval using Student's t-distribution
            ci_lower = None
            ci_upper = None
            if n >= 2 and std_rem > 0:
                t_crit = stats.t.ppf(0.975, df=n - 1)
                margin = t_crit * (std_rem / math.sqrt(n))
                ci_lower = round(mean_rem - margin, 2)
                ci_upper = round(mean_rem + margin, 2)

            # Instrument uncertainty propagation: dR = sqrt( (Ct/C0^2 * dC0)^2 + (1/C0 * dCt)^2 ) * 100
            mean_uncert = float(np.mean(uncert_vals)) if uncert_vals else None
            propagated_uncert = None
            if mean_uncert and mean_uncert > 0:
                mean_c0 = float(np.mean(c0_vals))
                mean_ct = float(np.mean(ct_vals))
                if mean_c0 > 0:
                    term1 = (mean_ct / (mean_c0 ** 2)) * mean_uncert
                    term2 = (1.0 / mean_c0) * mean_uncert
                    propagated_uncert = round(math.sqrt(term1 ** 2 + term2 ** 2) * 100.0, 3)

            is_small = n < 3

            # Repeatability classification
            if cv < 5.0 and not is_small:
                rating = "High Precision (CV < 5%)"
            elif cv <= 15.0 and not is_small:
                rating = "Moderate Reproducibility (CV 5–15%)"
            elif is_small:
                rating = "Insufficient Replicates (n < 3)"
            else:
                rating = "High Experimental Variability (CV > 15%)"

            # Scientific hypothesis for observed variability
            hypothesis = self._generate_variability_hypothesis(obs_list, cv, is_small)

            obs_responses = [
                ObservationResponse(
                    id=o.id,
                    dataset_id=o.dataset_id,
                    experiment_id=o.experiment_id,
                    sample_id=o.sample_id,
                    experiment_date=o.experiment_date,
                    water_source=o.water_source,
                    contaminant=o.contaminant,
                    initial_concentration=o.initial_concentration,
                    final_concentration=o.final_concentration,
                    removal_efficiency=o.removal_efficiency,
                    unit=o.unit,
                    treatment_method=o.treatment_method,
                    treatment_duration=o.treatment_duration,
                    ph=o.ph,
                    temperature=o.temperature,
                    treatment_dose=o.treatment_dose,
                    replicate_number=o.replicate_number,
                    measurement_uncertainty=o.measurement_uncertainty,
                    instrument_method=o.instrument_method,
                    notes=o.notes,
                    is_flagged=o.is_flagged,
                    flag_reason=o.flag_reason,
                    audit_status=o.audit_status,
                    audit_annotation=o.audit_annotation,
                    audited_at=o.audited_at.isoformat() if o.audited_at else None
                )
                for o in obs_list
            ]

            analysis_item = ReplicateGroupAnalysis(
                group_key=f"{exp_id}_{contam}_{treat}",
                experiment_id=exp_id,
                contaminant=contam,
                treatment_method=treat,
                sample_size=n,
                mean_initial=round(float(np.mean(c0_vals)), 4),
                mean_final=round(float(np.mean(ct_vals)), 4),
                mean_removal_efficiency=round(mean_rem, 2),
                std_removal_efficiency=round(std_rem, 2),
                cv_percent=round(cv, 2),
                ci_95_lower=ci_lower,
                ci_95_upper=ci_upper,
                mean_uncertainty=round(mean_uncert, 4) if mean_uncert else None,
                propagated_uncertainty=propagated_uncert,
                is_small_sample=is_small,
                repeatability_rating=rating,
                hypothesis_for_variability=hypothesis,
                observations=obs_responses
            )
            replicate_analyses.append(analysis_item)

        return replicate_analyses

    def compute_condition_correlations(
        self, observations: List[ResearchObservation]
    ) -> List[ConditionCorrelation]:
        """Examine relationships between operating variables (pH, temp, dose, duration) and removal efficiency."""
        active = [o for o in observations if o.audit_status != "excluded" and o.removal_efficiency is not None]
        if len(active) < 3:
            return []

        correlations: List[ConditionCorrelation] = []
        parameters = ["ph", "temperature", "treatment_dose", "treatment_duration"]

        grouped: Dict[Tuple[str, str], List[ResearchObservation]] = defaultdict(list)
        for o in active:
            grouped[(o.contaminant, o.treatment_method)].append(o)

        for (contam, treat), obs_list in grouped.items():
            if len(obs_list) < 3:
                continue

            for param in parameters:
                x_vals = []
                y_vals = []
                for o in obs_list:
                    val = getattr(o, param)
                    if val is not None:
                        x_vals.append(val)
                        y_vals.append(o.removal_efficiency)

                # Only compute if we have sufficient variance in X
                if len(x_vals) >= 3 and len(set(x_vals)) > 1:
                    r, p_val = stats.pearsonr(x_vals, y_vals)
                    r_val = round(float(r), 3) if not math.isnan(r) else 0.0

                    if r_val > 0.6:
                        trend = f"Strong positive relationship (r = {r_val:.2f}): Higher {param.replace('_', ' ')} corresponds to increased removal."
                    elif r_val < -0.6:
                        trend = f"Strong negative relationship (r = {r_val:.2f}): Higher {param.replace('_', ' ')} suppresses removal."
                    elif abs(r_val) >= 0.3:
                        trend = f"Moderate trend (r = {r_val:.2f}) observed across {param.replace('_', ' ')} variations."
                    else:
                        trend = f"Weak or no direct linear correlation (r = {r_val:.2f}) observed."

                    interp = self._get_chemical_correlation_interpretation(param, contam, treat, r_val)

                    correlations.append(
                        ConditionCorrelation(
                            parameter=param,
                            contaminant=contam,
                            treatment_method=treat,
                            observation_count=len(x_vals),
                            pearson_r=r_val,
                            trend_description=trend,
                            scientific_interpretation=interp
                        )
                    )

        return correlations

    def identify_research_gaps(
        self,
        observations: List[ResearchObservation],
        replicate_analyses: List[ReplicateGroupAnalysis]
    ) -> List[str]:
        """Detect missing experimental conditions, single replicates, and unexplored operating bounds."""
        gaps = []
        # 1. Single replicate check
        single_reps = [r for r in replicate_analyses if r.is_small_sample]
        if single_reps:
            names = [f"{r.experiment_id} ({r.contaminant}/{r.treatment_method}, n={r.sample_size})" for r in single_reps[:3]]
            gaps.append(
                f"Replicate Deficit: {len(single_reps)} experiment group(s) have fewer than 3 replicates (e.g. {', '.join(names)}), limiting statistical significance and confidence interval estimation."
            )

        # 2. Missing pH or temperature measurements
        no_ph = sum(1 for o in observations if o.ph is None)
        if no_ph > 0:
            gaps.append(
                f"Operating Parameter Gap: {no_ph} observation(s) lack recorded solution pH. Because aqueous speciation and surface charge are pH-dependent, unrecorded pH impairs mechanistic conclusions."
            )

        no_temp = sum(1 for o in observations if o.temperature is None)
        if no_temp > 0:
            gaps.append(
                f"Thermodynamic Gap: {no_temp} observation(s) lack operating temperature records, preventing adsorption enthalpy or solubility product (Ksp) verification."
            )

        # 3. Treatment-contaminant coverage
        contaminants = set(o.contaminant for o in observations)
        treatments = set(o.treatment_method for o in observations)
        for c in contaminants:
            treats_for_c = set(o.treatment_method for o in observations if o.contaminant == c)
            if len(treats_for_c) == 1:
                gaps.append(
                    f"Benchmarking Gap: Contaminant '{c}' has only been evaluated with '{list(treats_for_c)[0]}'. No alternative or complementary unit operations have been benchmarked."
                )

        return gaps

    def _generate_variability_hypothesis(
        self, obs_list: List[ResearchObservation], cv: float, is_small: bool
    ) -> str:
        if is_small:
            return "Hypothesis: Sample size (n < 3) is insufficient to distinguish true experimental variance from random analytical instrument noise."

        if cv > 15.0:
            # Inspect notes or flags
            notes_text = " ".join([o.notes or "" for o in obs_list]).lower()
            if "hydraulic" in notes_text or "turbulence" in notes_text:
                return "Hypothesis: Hydrodynamic disturbance or settling disruption during clarification caused irregular particulate carryover."
            if any(o.ph and abs(o.ph - 7.0) > 1.5 for o in obs_list):
                return "Hypothesis: Non-neutral pH regime may cause fluctuating aqueous speciation or variable surface charge on sorbent/resin media."
            return "Hypothesis: Pronounced variation (CV > 15%) suggests potential competitive ion interference, non-equilibrium contact time, or sampling heterogeneity."

        if cv < 5.0:
            return "Observation: Exceptional experimental repeatability (CV < 5%) indicating rigorous chemical control, stable temperature, and uniform reagent mixing."

        return "Observation: Typical analytical reproducibility for aqueous laboratory bench tests (CV 5–15%)."

    def _get_chemical_correlation_interpretation(
        self, param: str, contam: str, treat: str, r: float
    ) -> str:
        if param == "ph":
            if r > 0.4:
                return f"Increasing pH depresses hydrogen ion [H+] activity, reducing hydronium competition for active sorption sites and promoting metallic hydroxide precipitation."
            elif r < -0.4:
                return f"Decreasing pH promotes higher removal; acid condition may shift contaminant into an ionic form more readily adsorbed or exchanged."
            else:
                return "pH variation within the tested window showed minor influence on overall removal efficiency."
        elif param == "treatment_dose":
            if r > 0.4:
                return f"Higher {treat} dosage increases the total specific surface area and available functional adsorption/exchange sites, driving removal upward."
            else:
                return f"Dosage plateau: Additional reagent beyond threshold yields diminishing removal returns due to site saturation."
        elif param == "treatment_duration":
            return f"Contact time kinetics: Long residence times allow mass transfer across boundary layer films to reach chemical equilibrium."
        elif param == "temperature":
            return f"Temperature effect: Thermal kinetics influence aqueous diffusion rates and endothermic/exothermic sorption equilibria."
        return "Correlation reflects observed experimental trend within nominal laboratory operating bounds."

research_analysis_service = ResearchAnalysisService()
