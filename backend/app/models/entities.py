from datetime import datetime, timezone
import json
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from backend.app.database.connection import Base

def get_utc_now():
    return datetime.now(timezone.utc)

class WaterSample(Base):
    __tablename__ = "water_samples"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, nullable=False)
    intended_use = Column(String, default="Drinking")
    standard_id = Column(String, default="is10500")
    location_name = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)

    measurements = relationship("Measurement", back_populates="sample", cascade="all, delete-orphan")
    analyses = relationship("AnalysisRecord", back_populates="sample", cascade="all, delete-orphan")

class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("water_samples.id"), nullable=False)
    parameter_id = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String, nullable=False)

    sample = relationship("WaterSample", back_populates="measurements")

class AnalysisRecord(Base):
    __tablename__ = "analysis_records"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("water_samples.id"), nullable=False)
    standard_id = Column(String, nullable=False)
    concerns_count = Column(Integer, default=0)
    summary = Column(Text, nullable=True)
    result_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)

    sample = relationship("WaterSample", back_populates="analyses")
    simulations = relationship("SimulationRecord", back_populates="analysis", cascade="all, delete-orphan")

class SimulationRecord(Base):
    __tablename__ = "simulation_records"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analysis_records.id"), nullable=False)
    treatment_sequence_json = Column(Text, nullable=False)
    result_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)

    analysis = relationship("AnalysisRecord", back_populates="simulations")

class SavedReport(Base):
    __tablename__ = "saved_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_uid = Column(String, unique=True, index=True)
    analysis_id = Column(Integer, nullable=True)
    title = Column(String, nullable=False)
    water_source = Column(String, nullable=False)
    file_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)

# ==========================================
# RESEARCH INTELLIGENCE LAB MODELS
# ==========================================

class ResearchDataset(Base):
    __tablename__ = "research_datasets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    file_name = Column(String, nullable=True)
    file_type = Column(String, default="csv")  # csv, xlsx, manual, synthetic
    uploaded_at = Column(DateTime, default=get_utc_now)
    total_records = Column(Integer, default=0)
    valid_records = Column(Integer, default=0)
    flagged_records = Column(Integer, default=0)
    metadata_json = Column(Text, nullable=True)

    observations = relationship("ResearchObservation", back_populates="dataset", cascade="all, delete-orphan")
    recommendations = relationship("ResearchRecommendation", back_populates="dataset", cascade="all, delete-orphan")

class ResearchObservation(Base):
    __tablename__ = "research_observations"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("research_datasets.id"), nullable=False)
    experiment_id = Column(String, nullable=False, index=True)
    sample_id = Column(String, nullable=True)
    experiment_date = Column(String, nullable=True)
    water_source = Column(String, nullable=True)
    contaminant = Column(String, nullable=False, index=True)
    initial_concentration = Column(Float, nullable=False)
    final_concentration = Column(Float, nullable=False)
    removal_efficiency = Column(Float, nullable=True)
    unit = Column(String, default="mg/L")
    treatment_method = Column(String, nullable=False, index=True)
    treatment_duration = Column(Float, nullable=True)  # in minutes
    ph = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)  # Celsius
    treatment_dose = Column(Float, nullable=True)  # mg/L or relevant unit
    replicate_number = Column(Integer, default=1)
    measurement_uncertainty = Column(Float, nullable=True)
    instrument_method = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    # Data Quality & Audit trail
    is_flagged = Column(Boolean, default=False)
    flag_reason = Column(Text, nullable=True)
    audit_status = Column(String, default="accepted")  # accepted, excluded, annotated
    audit_annotation = Column(Text, nullable=True)
    audited_at = Column(DateTime, nullable=True)

    dataset = relationship("ResearchDataset", back_populates="observations")

class ResearchRecommendation(Base):
    __tablename__ = "research_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("research_datasets.id"), nullable=False)
    priority = Column(Integer, default=1)
    category = Column(String, nullable=False)  # replicate_deficit, operating_space_gap, head_to_head, anomaly_check, parameter_optimization
    research_question = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)
    supporting_observations = Column(Text, nullable=True)  # JSON list of experiment IDs
    variables_to_investigate = Column(Text, nullable=True)  # JSON list
    variables_to_keep_constant = Column(Text, nullable=True)  # JSON dict
    expected_information_gain = Column(Text, nullable=False)
    confidence_limitations = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)

    dataset = relationship("ResearchDataset", back_populates="recommendations")

class ResearchComparison(Base):
    __tablename__ = "research_comparisons"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    dataset_id = Column(Integer, ForeignKey("research_datasets.id"), nullable=True)
    experiment_ids_json = Column(Text, nullable=False)
    comparison_results_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)
