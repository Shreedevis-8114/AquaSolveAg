import pytest
import io
import json
import pandas as pd
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.research_data_service import research_data_service
from backend.app.services.research_analysis_service import research_analysis_service
from backend.app.services.research_recommendation_service import research_recommendation_service
from backend.app.services.research_comparison_service import research_comparison_service
from backend.app.services.research_report_service import research_report_service
from backend.app.database.connection import get_db, SessionLocal
from backend.app.models.entities import ResearchDataset, ResearchObservation

client = TestClient(app)

def test_existing_aquasolve_endpoints_preserved():
    """Verify core AquaSolve endpoints continue to function without regression."""
    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

    res_params = client.get("/api/parameters")
    assert res_params.status_code == 200
    assert len(res_params.json()) >= 10

    res_standards = client.get("/api/standards")
    assert res_standards.status_code == 200

    # Test Water Analysis endpoint
    analysis_payload = {
        "source": "Borewell",
        "intended_use": "Drinking",
        "standard_id": "is10500",
        "measurements": {
            "ph": 6.8,
            "turbidity": 4.5,
            "tds": 450.0,
            "arsenic": 0.03
        }
    }
    res_ana = client.post("/api/analyze", json=analysis_payload)
    assert res_ana.status_code == 200
    assert "concerns" in res_ana.json()

def test_removal_efficiency_calculations_exact():
    """Test exact mathematical removal efficiency formula and edge case handling."""
    # Normal removal: (100 - 20) / 100 * 100 = 80%
    r1 = research_data_service.calculate_removal_efficiency(100.0, 20.0)
    assert r1 == 80.0

    # Partial removal: (50 - 35) / 50 * 100 = 30%
    r2 = research_data_service.calculate_removal_efficiency(50.0, 35.0)
    assert r2 == 30.0

    # Negative removal (desorption / leaching): (2.0 - 2.5) / 2.0 * 100 = -25%
    # MUST NOT be clamped to zero!
    r3 = research_data_service.calculate_removal_efficiency(2.0, 2.5)
    assert r3 == -25.0

    # Zero initial concentration: should be None or safely handled
    r4 = research_data_service.calculate_removal_efficiency(0.0, 5.0)
    assert r4 is None

    # Invalid negative inputs
    r5 = research_data_service.calculate_removal_efficiency(-10.0, 5.0)
    assert r5 is None

def test_load_sample_benchmark_dataset():
    """Test loading verified AquaSolve benchmark experimental dataset."""
    res = client.get("/api/research/sample-dataset")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] is not None
    assert data["total_records"] >= 15
    assert len(data["observations"]) == data["total_records"]
    assert "quality_metrics" in data
    assert data["quality_metrics"]["replicate_groups_count"] >= 3

def test_manual_dataset_creation_and_quality():
    """Test manual experimental observation creation and quality metrics evaluation."""
    payload = {
        "name": "Bench Equilibrium Test Series",
        "description": "Manual input of batch adsorption trials",
        "observations": [
            {
                "experiment_id": "TEST-MAN-01",
                "sample_id": "SMP-T1",
                "experiment_date": "2026-10-18",
                "water_source": "Laboratory spiked groundwater",
                "contaminant": "Lead (Pb)",
                "initial_concentration": 0.20,
                "final_concentration": 0.02,
                "unit": "mg/L",
                "treatment_method": "Granular Activated Carbon",
                "treatment_duration": 60.0,
                "ph": 7.0,
                "temperature": 22.0,
                "treatment_dose": 2.5,
                "replicate_number": 1,
                "measurement_uncertainty": 0.002,
                "instrument_method": "ICP-MS",
                "notes": "Replicate 1"
            },
            {
                "experiment_id": "TEST-MAN-02",
                "sample_id": "SMP-T2",
                "experiment_date": "2026-10-18",
                "water_source": "Laboratory spiked groundwater",
                "contaminant": "Lead (Pb)",
                "initial_concentration": 0.20,
                "final_concentration": 0.022,
                "unit": "mg/L",
                "treatment_method": "Granular Activated Carbon",
                "treatment_duration": 60.0,
                "ph": 7.0,
                "temperature": 22.0,
                "treatment_dose": 2.5,
                "replicate_number": 2,
                "measurement_uncertainty": 0.002,
                "instrument_method": "ICP-MS",
                "notes": "Replicate 2"
            }
        ]
    }
    res = client.post("/api/research/manual", json=payload)
    assert res.status_code == 200
    d = res.json()
    assert d["total_records"] == 2
    assert d["valid_records"] == 2
    # Verify calculated removal efficiency is 90% and 89%
    obs1 = next(o for o in d["observations"] if o["experiment_id"] == "TEST-MAN-01")
    obs2 = next(o for o in d["observations"] if o["experiment_id"] == "TEST-MAN-02")
    assert pytest.approx(obs1["removal_efficiency"], 0.01) == 90.0
    assert pytest.approx(obs2["removal_efficiency"], 0.01) == 89.0

def test_csv_preview_and_upload_with_mapping():
    """Test previewing and uploading CSV with custom headers and mapping."""
    csv_content = """ExpCode,Pollutant,InitVal,FinalVal,Tech,DosePPM,pHLevel,RepNum
EXP-A,Arsenic,0.05,0.005,Iron Coagulation,10.0,7.2,1
EXP-A,Arsenic,0.05,0.006,Iron Coagulation,10.0,7.2,2
EXP-A,Arsenic,0.05,0.005,Iron Coagulation,10.0,7.2,3
"""
    file_bytes = csv_content.encode("utf-8")

    # 1. Preview
    res_prev = client.post(
        "/api/research/preview",
        files={"file": ("custom_data.csv", file_bytes, "text/csv")}
    )
    assert res_prev.status_code == 200
    preview = res_prev.json()
    assert "ExpCode" in preview["columns"]
    assert preview["total_preview_rows"] == 3

    # 2. Upload with column mapping
    mapping = {
        "experiment_id": "ExpCode",
        "contaminant": "Pollutant",
        "initial_concentration": "InitVal",
        "final_concentration": "FinalVal",
        "treatment_method": "Tech",
        "treatment_dose": "DosePPM",
        "ph": "pHLevel",
        "replicate_number": "RepNum",
        "unit_default": "mg/L"
    }

    res_up = client.post(
        "/api/research/upload",
        files={"file": ("custom_data.csv", file_bytes, "text/csv")},
        data={
            "dataset_name": "Arsenic Coagulation Series",
            "description": "Custom mapped CSV upload",
            "mapping_json": json.dumps(mapping)
        }
    )
    assert res_up.status_code == 200
    up_data = res_up.json()
    assert up_data["total_records"] == 3
    assert up_data["valid_records"] == 3

    # Test Replicate Analysis on uploaded dataset
    dataset_id = up_data["id"]
    res_ana = client.get(f"/api/research/datasets/{dataset_id}/analysis")
    assert res_ana.status_code == 200
    ana_data = res_ana.json()
    assert len(ana_data["replicate_groups"]) >= 1
    rep_group = ana_data["replicate_groups"][0]
    assert rep_group["sample_size"] == 3
    # Mean removal ~ 89.33%
    assert 88.0 <= rep_group["mean_removal"] <= 91.0
    # Small sample warning should be False since n=3
    assert rep_group["small_sample_warning"] is False

def test_observation_audit_trail_update():
    """Test auditing an observation: accept, exclude, and annotate."""
    # Load sample dataset
    res_sample = client.get("/api/research/sample-dataset")
    dataset_id = res_sample.json()["id"]
    obs = res_sample.json()["observations"][0]
    obs_id = obs["id"]

    # Audit to 'excluded' with reason
    audit_payload = {
        "observation_id": obs_id,
        "audit_status": "excluded",
        "audit_annotation": "Excluded due to baseline probe recalibration drift."
    }
    res_audit = client.post(f"/api/research/datasets/{dataset_id}/audit", json=audit_payload)
    assert res_audit.status_code == 200
    audited_obs = res_audit.json()
    assert audited_obs["audit_status"] == "excluded"
    assert "recalibration" in audited_obs["audit_annotation"]

def test_experiment_recommendations_generation():
    """Test intelligent recommendation engine produces explainable follow-up experiments."""
    res_sample = client.get("/api/research/sample-dataset")
    dataset_id = res_sample.json()["id"]

    res_rec = client.get(f"/api/research/datasets/{dataset_id}/recommendations")
    assert res_rec.status_code == 200
    recs = res_rec.json()
    assert recs["total_recommendations"] >= 1
    assert recs["highest_priority_recommendation"] is not None
    top = recs["highest_priority_recommendation"]
    assert "research_question" in top
    assert "reason_for_recommendation" in top
    assert len(top["variables_to_investigate"]) > 0
    assert len(top["variables_to_keep_consistent"]) > 0
    assert "expected_information_gain" in top

def test_experiment_comparison_workspace():
    """Test side-by-side comparison and detection of condition disparities."""
    res_sample = client.get("/api/research/sample-dataset")
    dataset_id = res_sample.json()["id"]
    observations = res_sample.json()["observations"]

    # Pick two different experiments
    exp_ids = [observations[0]["experiment_id"], observations[1]["experiment_id"]]
    cmp_payload = {
        "dataset_id": dataset_id,
        "experiment_ids": exp_ids
    }
    res_cmp = client.post("/api/research/compare", json=cmp_payload)
    assert res_cmp.status_code == 200
    cmp_data = res_cmp.json()
    assert len(cmp_data["experiments"]) == 2
    assert "fair_comparison_advisory" in cmp_data
    assert "performance_comparison" in cmp_data

def test_pdf_and_csv_report_generation():
    """Test publication-grade PDF and CSV report streaming."""
    res_sample = client.get("/api/research/sample-dataset")
    dataset_id = res_sample.json()["id"]

    # 1. PDF Report
    pdf_payload = {
        "dataset_id": dataset_id,
        "report_title": "AquaSolve Environmental Chemistry Research Dossier",
        "include_raw_data": True,
        "include_audit_trail": True
    }
    res_pdf = client.post("/api/research/reports/pdf", json=pdf_payload)
    assert res_pdf.status_code == 200
    assert res_pdf.headers.get("content-type") == "application/pdf"
    assert res_pdf.content.startswith(b"%PDF")
    assert len(res_pdf.content) > 1000

    # 2. CSV Export
    csv_payload = {"dataset_id": dataset_id}
    res_csv = client.post("/api/research/reports/csv", json=csv_payload)
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers.get("content-type")
    csv_text = res_csv.content.decode("utf-8")
    assert "experiment_id" in csv_text
    assert "removal_efficiency" in csv_text
    assert len(csv_text.splitlines()) > 10
