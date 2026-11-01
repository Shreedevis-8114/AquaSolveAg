from typing import Dict, List, Any
import copy
from backend.app.services.chemistry_engine import chemistry_engine
from backend.app.services.water_analyzer import water_analyzer
from backend.app.schemas.schemas import (
    SimulationResponse,
    StageStepResult,
    ParameterEvaluation
)

class SimulationEngine:
    def __init__(self):
        self.engine = chemistry_engine

    def run_simulation(
        self,
        baseline_measurements: Dict[str, float],
        treatment_sequence: List[str],
        standard_id: str = "is10500"
    ) -> SimulationResponse:
        models_data = self.engine.simulation_models
        removal_models = models_data.get("removal_efficiencies", {})
        prereq_rules = models_data.get("sequence_prerequisites", {})

        current_values = copy.deepcopy(baseline_measurements)
        stage_steps: List[StageStepResult] = []
        warnings: List[str] = []
        assumptions: List[Dict[str, Any]] = []

        seen_stages: List[str] = []

        for stage_id in treatment_sequence:
            t_def = self.engine.get_treatment(stage_id)
            if not t_def:
                continue

            stage_name = t_def["name"]
            stage_category = t_def.get("stage_category", "Process")

            # Check sequence rules and prerequisites
            if stage_id in prereq_rules:
                rule_info = prereq_rules[stage_id]
                required = rule_info.get("requires_prior", [])
                if required and not any(r in seen_stages for r in required):
                    crit = rule_info.get("critical_if_exceeded", {})
                    # Check if incoming values violate threshold
                    triggered = False
                    for p_chk, thr in crit.items():
                        if current_values.get(p_chk, 0.0) > thr:
                            triggered = True
                            warnings.append(
                                f"Sequence Warning at '{stage_name}': {p_chk.upper()} is {current_values.get(p_chk):.2f} (threshold: {thr}). {rule_info['rule']}"
                            )
                    if not triggered and required:
                        warnings.append(f"Engineering Precaution: '{stage_name}' generally requires prior {' or '.join(required)} for optimal operation.")

            incoming_snapshot = copy.deepcopy(current_values)
            applied_effects: Dict[str, str] = {}
            stage_model = removal_models.get(stage_id, {})

            # Apply parameter changes
            for param_id, rule in stage_model.items():
                if param_id not in current_values:
                    continue

                old_val = current_values[param_id]

                # Special models
                if "model" in rule:
                    mtype = rule["model"]
                    if mtype == "normalize":
                        target = rule.get("target", 7.3)
                        # Shift towards target
                        new_val = target
                        current_values[param_id] = round(new_val, 2)
                        applied_effects[param_id] = f"Neutralized to pH {new_val}"
                    elif mtype == "delta":
                        delta = rule.get("delta", 0.0)
                        new_val = max(0.0, old_val + delta)
                        current_values[param_id] = round(new_val, 2)
                        applied_effects[param_id] = f"{'+' if delta >= 0 else ''}{delta} units ({rule.get('notes', '')})"
                    elif mtype == "approach_saturation":
                        sat = rule.get("target_mg_l", 8.8)
                        rate = rule.get("rate", 0.75)
                        new_val = old_val + (sat - old_val) * rate
                        current_values[param_id] = round(new_val, 2)
                        applied_effects[param_id] = f"Increased DO toward {sat} mg/L saturation (+{new_val - old_val:.2f} mg/L)"
                    elif mtype == "set_minimum":
                        min_t = rule.get("min_target", 10.0)
                        if old_val < min_t:
                            current_values[param_id] = min_t
                            applied_effects[param_id] = f"Elevated pH to {min_t} for precipitation"
                else:
                    # Fractional removal model: C_after = C_before * (1 - fraction)
                    frac = rule.get("fraction", 0.0)
                    new_val = max(0.0, old_val * (1.0 - frac))
                    current_values[param_id] = round(new_val, 4)
                    applied_effects[param_id] = f"{int(frac * 100)}% removal ({rule.get('notes', '')})"

                # Log assumption
                assumptions.append({
                    "stage": stage_name,
                    "parameter": param_id,
                    "effect": applied_effects.get(param_id, "Modified"),
                    "source": t_def.get("reference", "Environmental Engineering Literature")
                })

            step_res = StageStepResult(
                stage_id=stage_id,
                stage_name=stage_name,
                stage_category=stage_category,
                incoming_values=incoming_snapshot,
                outgoing_values=copy.deepcopy(current_values),
                applied_effects=applied_effects
            )
            stage_steps.append(step_res)
            seen_stages.append(stage_id)

        # Evaluate final simulated values against reference standard
        after_analysis = water_analyzer.evaluate_water(
            measurements=current_values,
            standard_id=standard_id,
            source="Simulated Effluent",
            intended_use="Drinking"
        )

        before_analysis = water_analyzer.evaluate_water(
            measurements=baseline_measurements,
            standard_id=standard_id
        )

        before_concerns_params = {c["parameter_id"] for c in before_analysis.concerns}
        after_concerns_params = {c["parameter_id"] for c in after_analysis.concerns}

        resolved_params = list(before_concerns_params - after_concerns_params)

        return SimulationResponse(
            standard_id=standard_id,
            baseline_measurements=baseline_measurements,
            final_measurements=current_values,
            stage_steps=stage_steps,
            parameter_evaluations_after=after_analysis.parameters,
            remaining_concerns=after_analysis.concerns,
            resolved_concerns=resolved_params,
            sequence_warnings=warnings,
            model_assumptions=assumptions,
            scientific_disclaimer=models_data.get("scientific_disclaimer", "Simulated results are theoretical estimates for educational decision support. Certified laboratory verification is required before drinking.")
        )

simulation_engine = SimulationEngine()
