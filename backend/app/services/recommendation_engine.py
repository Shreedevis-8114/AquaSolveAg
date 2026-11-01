from typing import Dict, List, Any, Set
from backend.app.services.chemistry_engine import chemistry_engine
from backend.app.services.water_analyzer import water_analyzer
from backend.app.schemas.schemas import (
    RecommendationResponse,
    TreatmentStageRecommendation
)

STAGE_HIERARCHY = {
    "aeration": 10,
    "coagulation": 20,
    "flocculation": 25,
    "sedimentation": 30,
    "chemical_precipitation": 35,
    "sand_filtration": 40,
    "ultrafiltration": 45,
    "activated_carbon": 50,
    "lime_soda_softening": 55,
    "ion_exchange": 60,
    "biological_nitrate_treatment": 65,
    "reverse_osmosis": 70,
    "neutralization": 80,
    "disinfection": 90
}

class RecommendationEngine:
    def __init__(self):
        self.engine = chemistry_engine

    def generate_recommendations(
        self,
        measurements: Dict[str, float],
        standard_id: str = "is10500",
        source: str = "Borewell",
        intended_use: str = "Drinking"
    ) -> RecommendationResponse:
        analysis = water_analyzer.evaluate_water(measurements, standard_id, source, intended_use)
        concerns = analysis.concerns

        selected_stages: Dict[str, str] = {} # stage_id -> rationale
        alternatives: List[Dict[str, Any]] = []
        engineering_notes: List[str] = []
        targeted_contaminants: Set[str] = set()

        # Check specific parameter triggers
        turbidity_val = measurements.get("turbidity", 0.0)
        iron_val = measurements.get("iron", 0.0)
        ph_val = measurements.get("ph", 7.0)
        tds_val = measurements.get("tds", 0.0)
        hardness_val = measurements.get("hardness", 0.0)
        nitrate_val = measurements.get("nitrate", 0.0)
        chloride_val = measurements.get("chloride", 0.0)
        do_val = measurements.get("dissolved_oxygen", 6.0)
        lead_val = measurements.get("lead", 0.0)
        arsenic_val = measurements.get("arsenic", 0.0)

        standard = self.engine.get_standard(standard_id) or self.engine.get_standard("is10500")
        limits = standard.get("limits", {})

        # 1. Aeration check (low DO, high Fe)
        if do_val < limits.get("dissolved_oxygen", {}).get("min", 4.0) or iron_val > limits.get("iron", {}).get("desirable_max", 1.0):
            selected_stages["aeration"] = f"Aeration is recommended to raise dissolved oxygen (current: {do_val} mg/L) and oxidize soluble ferrous iron [Fe(2+)] (current: {iron_val} mg/L) into settleable ferric hydroxide flocs."
            targeted_contaminants.add("dissolved_oxygen")
            targeted_contaminants.add("iron")

        # 2. Turbidity and Coagulation/Clarification
        if turbidity_val > limits.get("turbidity", {}).get("desirable_max", 1.0) or arsenic_val > limits.get("arsenic", {}).get("desirable_max", 0.01):
            if turbidity_val > 10.0 or arsenic_val > 0.01:
                selected_stages["coagulation"] = f"Rapid-mix coagulation with ferric chloride/alum destabilizes colloidal particles (turbidity: {turbidity_val} NTU) and co-precipitates dissolved arsenate [HAsO4(2-)]."
                selected_stages["flocculation"] = "Gentle mechanical agitation promotes micro-floc collision into dense agglomerated flocs."
                selected_stages["sedimentation"] = "Gravity settling clarifies water by separating heavy floc particles before sand filtration."
            selected_stages["sand_filtration"] = f"Granular sand filtration captures residual particulate matter, polishing turbidity to < 1.0 NTU and trapping iron precipitate flocs."
            targeted_contaminants.add("turbidity")
            if arsenic_val > 0.01:
                targeted_contaminants.add("arsenic")

        # 3. Heavy Metals (Lead / Arsenic)
        if lead_val > limits.get("lead", {}).get("desirable_max", 0.01):
            selected_stages["activated_carbon"] = f"Granular activated carbon adsorption captures neurotoxic heavy metals (Lead: {lead_val} mg/L) and synthetic organic compounds via chemisorption."
            targeted_contaminants.add("lead")
            alternatives.append({
                "stage": "chemical_precipitation",
                "name": "Chemical Hydroxide Precipitation",
                "rationale": "For heavy industrial metal concentrations (> 1 mg/L), chemical pH adjustment precipitation with lime is more cost-effective than carbon or resins."
            })

        # 4. Total Dissolved Solids & Chloride
        needs_membrane = False
        if tds_val > limits.get("tds", {}).get("desirable_max", 500.0) or chloride_val > limits.get("chloride", {}).get("desirable_max", 250.0):
            needs_membrane = True
            selected_stages["reverse_osmosis"] = f"Reverse Osmosis semi-permeable membrane rejects 92-96% of dissolved ionic salts, reducing elevated TDS ({tds_val} mg/L) and chloride ({chloride_val} mg/L) to wholesome potable levels."
            targeted_contaminants.add("tds")
            targeted_contaminants.add("chloride")

        # 5. Hardness
        if hardness_val > limits.get("hardness", {}).get("desirable_max", 200.0):
            if needs_membrane:
                # RO already removes hardness
                engineering_notes.append("Reverse Osmosis selected for TDS also removes >95% of total hardness (Ca2+/Mg2+), eliminating the need for a separate cation exchange softener.")
                targeted_contaminants.add("hardness")
            else:
                selected_stages["ion_exchange"] = f"Strong-acid cation exchange resin softens water by exchanging scaling calcium and magnesium ions ({hardness_val} mg/L as CaCO3) for sodium ions."
                targeted_contaminants.add("hardness")
                alternatives.append({
                    "stage": "lime_soda_softening",
                    "name": "Lime-Soda Softening",
                    "rationale": "Lime-soda precipitation is preferable for large municipal flows (>10 MLD) with high carbonate hardness where concentrated brine disposal is restricted."
                })

        # 6. Nitrate
        if nitrate_val > limits.get("nitrate", {}).get("desirable_max", 45.0):
            if "reverse_osmosis" in selected_stages:
                targeted_contaminants.add("nitrate")
                engineering_notes.append("The configured Reverse Osmosis unit simultaneously rejects monovalent nitrate anions (NO3-) alongside general salinity.")
            else:
                selected_stages["ion_exchange"] = f"Nitrate-selective anion exchange resin adsorbs toxic nitrate ({nitrate_val} mg/L), exchanging it for chloride ions."
                targeted_contaminants.add("nitrate")
                alternatives.append({
                    "stage": "biological_nitrate_treatment",
                    "name": "Biological Denitrification",
                    "rationale": "Autotrophic or heterotrophic anoxic bioreactor reducing nitrate to harmless N2 gas without generating hazardous brine."
                })

        # 7. pH Adjustment / Neutralization
        ph_min = limits.get("ph", {}).get("min", 6.5)
        ph_max = limits.get("ph", {}).get("max", 8.5)
        if ph_val < ph_min or ph_val > ph_max or "reverse_osmosis" in selected_stages or "lime_soda_softening" in selected_stages:
            reasons = []
            if ph_val < ph_min:
                reasons.append(f"raw water acidity (pH {ph_val} < {ph_min})")
            elif ph_val > ph_max:
                reasons.append(f"raw water alkalinity (pH {ph_val} > {ph_max})")
            if "reverse_osmosis" in selected_stages:
                reasons.append("acidic permeate produced by CO2 passage across RO membranes")
            if "lime_soda_softening" in selected_stages:
                reasons.append("high caustic pH resulting from lime-soda softening")

            selected_stages["neutralization"] = f"pH neutralization and remineralization (calcite contactor or NaOH) balances water to non-corrosive pH ~7.3, addressing {', '.join(reasons)}."
            targeted_contaminants.add("ph")

        # 8. Terminal Disinfection (Standard hygiene barrier for potable water)
        if intended_use.lower().find("drink") != -1 or intended_use.lower().find("potable") != -1 or intended_use.lower().find("domestic") != -1:
            selected_stages["disinfection"] = "Final chlorination or UV irradiation provides critical microbial pathogen inactivation and residual protection in storage/distribution."

        # If sand filtration not added but RO is added, mandatory pre-filtration rule applies
        if "reverse_osmosis" in selected_stages and "sand_filtration" not in selected_stages:
            selected_stages["sand_filtration"] = "Pre-membrane granular filtration is mandatory to protect sensitive RO polyamide membranes against particulate abrasion and silt fouling."
            engineering_notes.append("Pre-filtration automatically sequenced upstream to ensure Silt Density Index (SDI) < 3 for membrane longevity.")

        # Sort stages according to chemical engineering hierarchy
        sorted_stage_ids = sorted(selected_stages.keys(), key=lambda sid: STAGE_HIERARCHY.get(sid, 50))

        recommended_sequence: List[TreatmentStageRecommendation] = []
        for idx, sid in enumerate(sorted_stage_ids, start=1):
            t_info = self.engine.get_treatment(sid)
            if not t_info:
                continue
            rec_stage = TreatmentStageRecommendation(
                id=sid,
                name=t_info["name"],
                stage_category=t_info.get("stage_category", "Treatment"),
                order=idx,
                rationale=selected_stages[sid],
                chemistry_principle=t_info["chemistry_principle"],
                target_contaminants=t_info["target_contaminants"],
                prerequisites=t_info.get("prerequisites", "None"),
                limitations=t_info.get("limitations", "None"),
                secondary_effects=t_info.get("secondary_effects", "None")
            )
            recommended_sequence.append(rec_stage)

        # Check for unresolved out-of-spec parameters
        all_concern_params = {c["parameter_id"] for c in concerns}
        unresolved = list(all_concern_params - targeted_contaminants)

        return RecommendationResponse(
            recommended_sequence=recommended_sequence,
            alternative_options=alternatives,
            unresolved_contaminants=unresolved,
            engineering_notes=engineering_notes,
            disclaimer="Treatment recommendations are algorithmic decision-support guidelines based on standard environmental engineering unit operations (AWWA/WHO). Field pilot testing and chemical jar tests must precede physical plant construction."
        )

recommendation_engine = RecommendationEngine()
