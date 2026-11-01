import json
import os
from typing import Dict, List, Any, Optional

KNOWLEDGE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "knowledge")

class ChemistryEngine:
    def __init__(self):
        self.parameters: Dict[str, Dict[str, Any]] = {}
        self.standards: Dict[str, Dict[str, Any]] = {}
        self.treatments: Dict[str, Dict[str, Any]] = {}
        self.simulation_models: Dict[str, Any] = {}
        self.samples: List[Dict[str, Any]] = []
        self._load_knowledge()

    def _load_knowledge(self):
        try:
            with open(os.path.join(KNOWLEDGE_DIR, "parameters.json"), "r", encoding="utf-8") as f:
                params_list = json.load(f)
                self.parameters = {p["id"]: p for p in params_list}

            with open(os.path.join(KNOWLEDGE_DIR, "standards.json"), "r", encoding="utf-8") as f:
                standards_list = json.load(f)
                self.standards = {s["id"]: s for s in standards_list}

            with open(os.path.join(KNOWLEDGE_DIR, "treatments.json"), "r", encoding="utf-8") as f:
                treatments_list = json.load(f)
                self.treatments = {t["id"]: t for t in treatments_list}

            with open(os.path.join(KNOWLEDGE_DIR, "simulation_models.json"), "r", encoding="utf-8") as f:
                self.simulation_models = json.load(f)

            with open(os.path.join(KNOWLEDGE_DIR, "samples.json"), "r", encoding="utf-8") as f:
                self.samples = json.load(f)
        except Exception as e:
            print(f"[ChemistryEngine] Error loading knowledge base: {e}")

    def get_parameter(self, param_id: str) -> Optional[Dict[str, Any]]:
        return self.parameters.get(param_id)

    def get_all_parameters(self) -> List[Dict[str, Any]]:
        return list(self.parameters.values())

    def get_standard(self, standard_id: str) -> Optional[Dict[str, Any]]:
        return self.standards.get(standard_id)

    def get_all_standards(self) -> List[Dict[str, Any]]:
        return list(self.standards.values())

    def get_treatment(self, treatment_id: str) -> Optional[Dict[str, Any]]:
        return self.treatments.get(treatment_id)

    def get_all_treatments(self) -> List[Dict[str, Any]]:
        return list(self.treatments.values())

    def get_samples(self) -> List[Dict[str, Any]]:
        return self.samples

    def get_sample_by_id(self, sample_id: str) -> Optional[Dict[str, Any]]:
        for s in self.samples:
            if s["id"] == sample_id:
                return s
        return None

chemistry_engine = ChemistryEngine()
