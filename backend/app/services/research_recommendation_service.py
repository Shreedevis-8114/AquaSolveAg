from typing import Dict, List, Any, Optional
from collections import defaultdict

from backend.app.models.entities import ResearchObservation
from backend.app.schemas.research_schemas import (
    ExperimentRecommendationItem,
    ExperimentRecommendationResponse,
    ReplicateGroupAnalysis
)
from backend.app.services.research_analysis_service import research_analysis_service

class ResearchRecommendationService:
    def generate_recommendations(
        self,
        dataset_id: int,
        observations: List[ResearchObservation]
    ) -> ExperimentRecommendationResponse:
        """Generate explainable, evidence-backed next experiment recommendations."""
        active = [o for o in observations if o.audit_status != "excluded"]
        if not active:
            return ExperimentRecommendationResponse(
                dataset_id=dataset_id,
                total_recommendations=0,
                highest_priority_recommendation=None,
                recommendations=[],
                methodology_notes=["No active observations available in dataset."]
            )

        replicate_analyses = research_analysis_service.compute_replicate_reproducibility(active)
        recommendations: List[ExperimentRecommendationItem] = []
        rec_id_counter = 1

        # 1. Anomaly Resolution / Negative Removal Check
        negative_obs = [o for o in active if (o.removal_efficiency or 0) < 0]
        if negative_obs:
            target = negative_obs[0]
            rec = ExperimentRecommendationItem(
                id=f"REC-{rec_id_counter:02d}",
                priority=1,
                category="anomaly_check",
                research_question=f"Does {target.treatment_method} induce solute desorption/leaching of {target.contaminant} under acidic or low-dose conditions?",
                reason=f"Experiment '{target.experiment_id}' exhibited negative removal efficiency ({target.removal_efficiency:.2f}%), where effluent final concentration ({target.final_concentration} {target.unit}) exceeded influent initial concentration ({target.initial_concentration} {target.unit}).",
                supporting_observations=[target.experiment_id],
                variables_to_investigate=["Re-testing with analytical reagent blank", "Pre-washing of sorbent/media bed to test for pre-existing contaminant contamination"],
                variables_to_keep_constant={
                    "Initial Concentration": f"{target.initial_concentration} {target.unit}",
                    "pH": target.ph if target.ph else "Match original",
                    "Dose": f"{target.treatment_dose} mg/L" if target.treatment_dose else "Match original",
                    "Duration": f"{target.treatment_duration} min" if target.treatment_duration else "Match original"
                },
                expected_information_gain="Determines whether negative removal is an analytical measurement artifact or represents real physical desorption/column breakthrough.",
                confidence_limitations="Requires certified calibration standards and verified analytical instrument blanks."
            )
            recommendations.append(rec)
            rec_id_counter += 1

        # 2. Replicate Insufficiency (Small Sample Size or High CV%)
        small_sample_groups = [r for r in replicate_analyses if r.sample_size < 3]
        if small_sample_groups:
            target_rep = small_sample_groups[0]
            rec = ExperimentRecommendationItem(
                id=f"REC-{rec_id_counter:02d}",
                priority=2,
                category="replicate_deficit",
                research_question=f"What is the true mean removal efficiency and 95% confidence interval for {target_rep.treatment_method} on {target_rep.contaminant}?",
                reason=f"Experiment '{target_rep.experiment_id}' has only {target_rep.sample_size} replicate observation(s). A minimum of 3 independent replicates is required to calculate meaningful standard deviation and student's t confidence intervals.",
                supporting_observations=[target_rep.experiment_id],
                variables_to_investigate=["Independent experimental replicate runs (Replicate 2 & Replicate 3)"],
                variables_to_keep_constant={
                    "Contaminant": target_rep.contaminant,
                    "Treatment Method": target_rep.treatment_method,
                    "Initial Concentration": f"{target_rep.mean_initial} mg/L",
                    "Operating Temperature": "Keep uniform (±1°C)",
                    "Solution pH": "Keep identical to original experiment"
                },
                expected_information_gain="Closes statistical replicate deficit, narrows confidence intervals, and confirms experimental repeatability.",
                confidence_limitations="Assumes identical water matrix composition and reagent batch stability."
            )
            recommendations.append(rec)
            rec_id_counter += 1

        # 3. High Experimental Variability Investigation
        high_cv_groups = [r for r in replicate_analyses if r.cv_percent > 15.0 and r.sample_size >= 3]
        if high_cv_groups:
            target_cv = high_cv_groups[0]
            rec = ExperimentRecommendationItem(
                id=f"REC-{rec_id_counter:02d}",
                priority=3,
                category="variability_investigation",
                research_question=f"What hydrodynamic or chemical factor causes high variability (CV = {target_cv.cv_percent:.1f}%) in {target_cv.treatment_method} removal of {target_cv.contaminant}?",
                reason=f"Replicate group '{target_cv.experiment_id}' demonstrated significant experimental dispersion (CV {target_cv.cv_percent:.1f}% > 15% threshold), suggesting sensitivity to minor operating fluctuations.",
                supporting_observations=[target_cv.experiment_id],
                variables_to_investigate=["Controlled mixing gradient (G-value)", "Rigorous pH buffering", "Floc settling time monitoring"],
                variables_to_keep_constant={
                    "Initial Concentration": f"{target_cv.mean_initial} mg/L",
                    "Treatment Method": target_cv.treatment_method
                },
                expected_information_gain="Identifies source of experimental noise, isolating whether variability originates from chemical kinetics or hydrodynamic inconsistency.",
                confidence_limitations="Requires precision instrumentation to monitor velocity gradients and shear rates."
            )
            recommendations.append(rec)
            rec_id_counter += 1

        # 4. Operating Space Gap: pH Speciation Boundary
        # Look for contaminants where pH was only tested in a narrow range (< 1.5 pH units)
        contam_ph_map: Dict[Tuple[str, str], List[float]] = defaultdict(list)
        for o in active:
            if o.ph is not None:
                contam_ph_map[(o.contaminant, o.treatment_method)].append(o.ph)

        for (c, t), ph_list in contam_ph_map.items():
            if len(ph_list) >= 2:
                ph_spread = max(ph_list) - min(ph_list)
                if ph_spread < 1.0:
                    avg_ph = sum(ph_list) / len(ph_list)
                    alt_ph = 8.5 if avg_ph < 7.0 else 5.5
                    rec = ExperimentRecommendationItem(
                        id=f"REC-{rec_id_counter:02d}",
                        priority=4,
                        category="operating_space_gap",
                        research_question=f"How does shifting pH from {avg_ph:.1f} to {alt_ph:.1f} affect the removal mechanism of {c} by {t}?",
                        reason=f"Current dataset explores {c} removal by {t} only in a narrow pH window ({min(ph_list):.1f} – {max(ph_list):.1f}). Aqueous speciation (e.g. hydroxide complexation, hydrolysis, and surface protonation) changes dramatically across pH 5.5 to 8.5.",
                        supporting_observations=[o.experiment_id for o in active if o.contaminant == c and o.treatment_method == t][:3],
                        variables_to_investigate=[f"Solution pH adjusted to {alt_ph:.1f} using dilute HCl or NaOH"],
                        variables_to_keep_constant={
                            "Contaminant": c,
                            "Treatment Method": t,
                            "Initial Concentration": "Match baseline",
                            "Dose / Sorbent Mass": "Match baseline",
                            "Contact Time": "Match baseline"
                        },
                        expected_information_gain="Maps pH-dependent adsorption/precipitation envelope, establishing whether acidification or alkalinization enhances removal efficiency.",
                        confidence_limitations="Chemical adjustment may slightly alter ionic strength and electrical conductivity."
                    )
                    recommendations.append(rec)
                    rec_id_counter += 1
                    break

        # 5. Head-to-Head Comparative Benchmarking
        # Check if multiple treatments were tested on the same contaminant under differing conditions
        contam_treats: Dict[str, Dict[str, List[ResearchObservation]]] = defaultdict(lambda: defaultdict(list))
        for o in active:
            contam_treats[o.contaminant][o.treatment_method].append(o)

        for c, treat_dict in contam_treats.items():
            if len(treat_dict) >= 2:
                treat_names = list(treat_dict.keys())
                t1, t2 = treat_names[0], treat_names[1]
                t1_dur = treat_dict[t1][0].treatment_duration
                t2_dur = treat_dict[t2][0].treatment_duration
                t1_ph = treat_dict[t1][0].ph
                t2_ph = treat_dict[t2][0].ph

                # Check if operating conditions differed
                if (t1_dur and t2_dur and t1_dur != t2_dur) or (t1_ph and t2_ph and abs(t1_ph - t2_ph) > 0.5):
                    rec = ExperimentRecommendationItem(
                        id=f"REC-{rec_id_counter:02d}",
                        priority=5,
                        category="head_to_head",
                        research_question=f"Which technology achieves superior removal of {c} under standardized, identical operating conditions: {t1} or {t2}?",
                        reason=f"Both {t1} and {t2} were evaluated for {c}, but under mismatched operating conditions ({t1}: pH {t1_ph}, {t1_dur} min vs {t2}: pH {t2_ph}, {t2_dur} min). Direct performance comparison is scientifically compromised without standardized conditions.",
                        supporting_observations=[treat_dict[t1][0].experiment_id, treat_dict[t2][0].experiment_id],
                        variables_to_investigate=[f"Direct head-to-head performance of {t1} vs {t2}"],
                        variables_to_keep_constant={
                            "Contaminant": c,
                            "Initial Concentration": "Standardized identical feed",
                            "Solution pH": "Standardized (e.g. 7.0)",
                            "Contact Time": "Standardized (e.g. 60 min)",
                            "Operating Temperature": "22°C"
                        },
                        expected_information_gain="Provides fair, peer-reviewed technological comparison without confounding condition discrepancies.",
                        confidence_limitations="Applies only to tested water matrix."
                    )
                    recommendations.append(rec)
                    rec_id_counter += 1
                    break

        # 6. Dose-Response Optimization
        # If a sorbent/coagulant was only tested at a single dose
        dose_groups: Dict[Tuple[str, str], List[float]] = defaultdict(list)
        for o in active:
            if o.treatment_dose is not None and o.treatment_dose > 0:
                dose_groups[(o.contaminant, o.treatment_method)].append(o.treatment_dose)

        for (c, t), doses in dose_groups.items():
            if len(set(doses)) == 1:
                cur_dose = doses[0]
                rec = ExperimentRecommendationItem(
                    id=f"REC-{rec_id_counter:02d}",
                    priority=6,
                    category="parameter_optimization",
                    research_question=f"What is the multi-point adsorption isotherm or coagulant dose-response curve for {t} treating {c}?",
                    reason=f"{t} was evaluated only at a single fixed dose ({cur_dose} mg/L). Without multi-point dose variation, optimal chemical dosing cannot be determined, risking chemical overdosing or inadequate treatment.",
                    supporting_observations=[o.experiment_id for o in active if o.contaminant == c and o.treatment_method == t][:3],
                    variables_to_investigate=[f"Multi-point dosage sweep: {cur_dose * 0.5:.1f}, {cur_dose:.1f}, and {cur_dose * 2.0:.1f} mg/L"],
                    variables_to_keep_constant={
                        "Contaminant": c,
                        "Initial Concentration": "Identical baseline",
                        "pH": "7.0",
                        "Contact Time": "Identical baseline"
                    },
                    expected_information_gain="Determines empirical Freundlich/Langmuir adsorption capacity or optimum coagulation sweep threshold.",
                    confidence_limitations="Isotherm models assume steady-state thermodynamic equilibrium."
                )
                recommendations.append(rec)
                break

        # Sort recommendations by priority ascending
        recommendations.sort(key=lambda r: r.priority)
        highest = recommendations[0] if recommendations else None

        return ExperimentRecommendationResponse(
            dataset_id=dataset_id,
            total_recommendations=len(recommendations),
            highest_priority_recommendation=highest,
            recommendations=recommendations,
            methodology_notes=[
                "Recommendations are generated algorithmically using deterministic environmental chemistry decision rules.",
                "Prioritizes resolving negative removal anomalies and replicate deficits before exploring new design space.",
                "All recommended experiments are scientific research inquiries and do not constitute unsupervised operational protocols."
            ]
        )

research_recommendation_service = ResearchRecommendationService()
