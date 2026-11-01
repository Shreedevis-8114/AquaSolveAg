import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.chemistry_engine import chemistry_engine
from backend.app.services.water_analyzer import water_analyzer
from backend.app.services.recommendation_engine import recommendation_engine
from backend.app.services.simulation_engine import simulation_engine
from backend.app.services.report_generator import report_generator

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_parameters_catalog():
    res = client.get("/api/parameters")
    assert res.status_code == 200
    params = res.json()
    assert len(params) >= 10
    param_ids = [p["id"] for p in params]
    assert "ph" in param_ids
    assert "turbidity" in param_ids
    assert "tds" in param_ids
    assert "hardness" in param_ids
    assert "nitrate" in param_ids

def test_standards_catalog():
    res = client.get("/api/standards")
    assert res.status_code == 200
    standards = res.json()
    std_ids = [s["id"] for s in standards]
    assert "is10500" in std_ids
    assert "who" in std_ids
    assert "usepa" in std_ids

def test_treatments_catalog():
    res = client.get("/api/treatments")
    assert res.status_code == 200
    treatments = res.json()
    assert len(treatments) == 14

def test_water_analysis_valid_and_invalid():
    # Valid normal water
    normal_payload = {
        "source": "Municipal",
        "intended_use": "Drinking",
        "standard_id": "is10500",
        "measurements": {
            "ph": 7.4,
            "turbidity": 0.8,
            "tds": 320.0,
            "hardness": 160.0,
            "nitrate": 15.0
        }
    }
    res = client.post("/api/analyze", json=normal_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["summary"]["outside_reference_count"] == 0

    # Exceedance and invalid values
    bad_payload = {
        "source": "Borewell",
        "intended_use": "Drinking",
        "standard_id": "is10500",
        "measurements": {
            "ph": 16.5, # Physically impossible
            "hardness": 750.0, # Above limit
            "nitrate": 90.0 # Above limit
        }
    }
    res_bad = client.post("/api/analyze", json=bad_payload)
    assert res_bad.status_code == 200
    data_bad = res_bad.json()
    assert data_bad["parameters"]["ph"]["status"] == "Invalid input"
    assert data_bad["parameters"]["hardness"]["status"] == "Above selected reference"
    assert data_bad["parameters"]["nitrate"]["status"] == "Above selected reference"

def test_recommendation_multi_problem():
    payload = {
        "source": "Borewell",
        "intended_use": "Drinking",
        "standard_id": "is10500",
        "measurements": {
            "ph": 6.0,
            "turbidity": 45.0,
            "tds": 1200.0,
            "hardness": 550.0,
            "nitrate": 65.0,
            "iron": 3.0,
            "lead": 0.02
        }
    }
    res = client.post("/api/recommend", json=payload)
    assert res.status_code == 200
    rec = res.json()
    stages = [s["id"] for s in rec["recommended_sequence"]]
    
    # Must include clarification (coagulation/flocculation/sedimentation) for turbidity,
    # filtration, reverse osmosis for TDS, neutralization for pH, disinfection for potable
    assert "coagulation" in stages
    assert "sand_filtration" in stages
    assert "reverse_osmosis" in stages
    assert "neutralization" in stages
    assert "disinfection" in stages

def test_simulation_calculations_and_warnings():
    # Test simulation with reverse osmosis placed without pre-filtration
    bad_sequence_payload = {
        "standard_id": "is10500",
        "baseline_measurements": {
            "turbidity": 25.0,
            "tds": 1100.0,
            "hardness": 500.0,
            "ph": 6.8
        },
        "treatment_sequence": ["reverse_osmosis", "neutralization"]
    }
    res = client.post("/api/simulate", json=bad_sequence_payload)
    assert res.status_code == 200
    sim = res.json()
    
    # Check warning generated for turbidity > 1.0 directly into RO
    assert any("Sequence Warning" in w for w in sim["sequence_warnings"])
    
    # Check TDS reduction: RO removes ~94%
    assert sim["final_measurements"]["tds"] < 150.0

def test_scenario_comparison():
    payload = {
        "standard_id": "is10500",
        "baseline_measurements": {
            "turbidity": 15.0,
            "tds": 850.0,
            "hardness": 450.0
        },
        "scenario_a_name": "RO Train",
        "scenario_a_sequence": ["sand_filtration", "reverse_osmosis", "neutralization"],
        "scenario_b_name": "Softener Only",
        "scenario_b_sequence": ["sand_filtration", "ion_exchange"]
    }
    res = client.post("/api/compare-scenarios", json=payload)
    assert res.status_code == 200
    comp = res.json()
    assert "scenario_a" in comp
    assert "scenario_b" in comp
    assert "comparison_summary" in comp

def test_pdf_report_generation():
    payload = {
        "source": "Borewell Test",
        "intended_use": "Drinking",
        "standard_id": "is10500",
        "baseline_measurements": {
            "ph": 7.1,
            "turbidity": 2.5,
            "tds": 650.0,
            "hardness": 320.0
        },
        "treatment_sequence": ["sand_filtration", "ion_exchange", "disinfection"]
    }
    res = client.post("/api/reports/generate", json=payload)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert len(res.content) > 1000
    assert res.content.startswith(b"%PDF")

def test_csv_export():
    payload = {
        "source": "River Intake",
        "intended_use": "Potable",
        "standard_id": "is10500",
        "baseline_measurements": {
            "ph": 7.3,
            "turbidity": 15.0,
            "iron": 2.1
        },
        "treatment_sequence": ["aeration", "sand_filtration"]
    }
    res = client.post("/api/reports/csv", json=payload)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "AquaSolve" in res.text
