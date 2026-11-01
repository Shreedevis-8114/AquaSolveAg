from typing import Dict, List, Any, Tuple
from backend.app.services.chemistry_engine import chemistry_engine
from backend.app.schemas.schemas import AnalysisResponse, ParameterEvaluation, AnalysisSummary

class WaterAnalyzer:
    def __init__(self):
        self.engine = chemistry_engine

    def evaluate_water(
        self,
        measurements: Dict[str, float],
        standard_id: str = "is10500",
        source: str = "Borewell",
        intended_use: str = "Drinking"
    ) -> AnalysisResponse:
        standard = self.engine.get_standard(standard_id)
        if not standard:
            standard = self.engine.get_standard("is10500")
            standard_id = "is10500"

        std_name = standard["name"]
        std_limits = standard.get("limits", {})

        evaluated_params: Dict[str, ParameterEvaluation] = {}
        concerns: List[Dict[str, Any]] = []

        total_submitted = len(measurements)
        total_evaluated = 0
        outside_reference_count = 0
        unconfigured_count = 0

        for param_id, value in measurements.items():
            param_def = self.engine.get_parameter(param_id)
            if not param_def:
                continue

            # Validate physically meaningful range
            min_valid = param_def.get("min_valid", 0.0)
            max_valid = param_def.get("max_valid", 100000.0)

            if value < min_valid or value > max_valid:
                eval_obj = ParameterEvaluation(
                    parameter_id=param_id,
                    name=param_def["name"],
                    value=value,
                    unit=param_def["unit"],
                    status="Invalid input",
                    desirable_limit=None,
                    permissible_limit=None,
                    reference_range_str=f"Valid physical bounds: {min_valid} - {max_valid} {param_def['unit']}",
                    concern_level="critical",
                    scientific_summary=f"Measurement {value} is outside physically possible boundaries.",
                    health_significance="Measurement error suspected; re-calibration required.",
                    notes="Invalid physical measurement"
                )
                evaluated_params[param_id] = eval_obj
                continue

            limit_rule = std_limits.get(param_id)
            if not limit_rule:
                unconfigured_count += 1
                eval_obj = ParameterEvaluation(
                    parameter_id=param_id,
                    name=param_def["name"],
                    value=value,
                    unit=param_def["unit"],
                    status="Not evaluated",
                    desirable_limit=None,
                    permissible_limit=None,
                    reference_range_str="Reference limit not configured in selected standard.",
                    concern_level="normal",
                    scientific_summary=param_def["scientific_definition"],
                    health_significance=param_def["environmental_significance"],
                    notes="Reference limit not configured."
                )
                evaluated_params[param_id] = eval_obj
                continue

            total_evaluated += 1
            status, concern_level, ref_str = self._classify_parameter(value, limit_rule, param_def["unit"])

            if status != "Within selected reference":
                outside_reference_count += 1
                concerns.append({
                    "parameter_id": param_id,
                    "parameter_name": param_def["name"],
                    "value": value,
                    "unit": param_def["unit"],
                    "status": status,
                    "concern_level": concern_level,
                    "reference_standard": std_name,
                    "reference_limit": ref_str,
                    "scientific_impact": param_def["potential_consequences"],
                    "chemical_basis": param_def["relevant_chemistry"]
                })

            eval_obj = ParameterEvaluation(
                parameter_id=param_id,
                name=param_def["name"],
                value=round(value, 4),
                unit=param_def["unit"],
                status=status,
                desirable_limit=limit_rule.get("desirable_max") or limit_rule.get("desirable_min"),
                permissible_limit=limit_rule.get("permissible_max"),
                reference_range_str=ref_str,
                concern_level=concern_level,
                scientific_summary=param_def["scientific_definition"],
                health_significance=param_def["potential_consequences"],
                notes=limit_rule.get("notes")
            )
            evaluated_params[param_id] = eval_obj

        # Determine overall summary status
        if outside_reference_count == 0:
            overall_status = "All tested parameters conform to selected reference limits."
        elif any(c["concern_level"] == "critical" for c in concerns):
            overall_status = f"Critical chemical exceedances detected ({outside_reference_count} out-of-limit parameters, including toxic/health hazards)."
        else:
            overall_status = f"{outside_reference_count} parameter(s) deviate from desirable reference benchmarks."

        summary = AnalysisSummary(
            total_submitted=total_submitted,
            total_evaluated=total_evaluated,
            outside_reference_count=outside_reference_count,
            unconfigured_count=unconfigured_count,
            overall_status=overall_status
        )

        return AnalysisResponse(
            source=source,
            intended_use=intended_use,
            standard_id=standard_id,
            standard_name=std_name,
            summary=summary,
            parameters=evaluated_params,
            concerns=concerns,
            educational_disclaimer="Educational and preliminary decision-support assessment. This analysis is limited to the tested parameters and does not constitute official certification of water safety."
        )

    def _classify_parameter(self, value: float, limit_rule: Dict[str, Any], unit: str) -> Tuple[str, str, str]:
        rule_type = limit_rule.get("type", "upper_limit")

        if rule_type == "range":
            min_val = limit_rule.get("min", 6.5)
            max_val = limit_rule.get("max", 8.5)
            ref_str = f"{min_val} – {max_val} {unit}"
            if value < min_val:
                severity = "severe" if value < 5.5 else "moderate"
                return "Below selected reference", severity, ref_str
            elif value > max_val:
                severity = "severe" if value > 9.5 else "moderate"
                return "Above selected reference", severity, ref_str
            else:
                return "Within selected reference", "normal", ref_str

        elif rule_type == "lower_limit":
            min_val = limit_rule.get("min", 4.0)
            ref_str = f"≥ {min_val} {unit}"
            if value < min_val:
                severity = "critical" if value < 2.0 else "moderate"
                return "Below selected reference", severity, ref_str
            else:
                return "Within selected reference", "normal", ref_str

        else: # upper_limit
            desirable = limit_rule.get("desirable_max", limit_rule.get("max", 0.0))
            permissible = limit_rule.get("permissible_max", desirable)
            ref_str = f"≤ {desirable} {unit} (Permissible: {permissible})" if permissible != desirable else f"≤ {desirable} {unit}"

            if value > permissible:
                # Distinguish heavy metals/toxic contaminants from aesthetic ones
                is_toxic = limit_rule.get("notes", "").lower().find("toxic") != -1 or desirable < 0.1
                severity = "critical" if is_toxic or value > (permissible * 1.5) else "severe"
                return "Above selected reference", severity, ref_str
            elif value > desirable:
                return "Above selected reference", "moderate", ref_str
            else:
                return "Within selected reference", "normal", ref_str

water_analyzer = WaterAnalyzer()
