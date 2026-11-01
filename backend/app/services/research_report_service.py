import io
import csv
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from sqlalchemy.orm import Session

from backend.app.models.entities import ResearchDataset, ResearchObservation
from backend.app.services.research_data_service import research_data_service
from backend.app.services.research_analysis_service import research_analysis_service
from backend.app.services.research_recommendation_service import research_recommendation_service

class ResearchReportService:
    def generate_pdf_report(
        self,
        db: Session,
        dataset_id: int,
        report_title: str = "AquaSolve Research Intelligence Experimental Report",
        include_raw_data: bool = True,
        include_audit_trail: bool = True
    ) -> bytes:
        """Generate a scientific research dossier PDF using ReportLab."""
        dataset = db.query(ResearchDataset).filter(ResearchDataset.id == dataset_id).first()
        if not dataset:
            raise ValueError(f"Dataset #{dataset_id} not found.")

        observations = dataset.observations
        quality_metrics = research_data_service.compute_quality_metrics(observations)
        performances = research_analysis_service.compute_treatment_performance(observations)
        replicate_analyses = research_analysis_service.compute_replicate_reproducibility(observations)
        rec_response = research_recommendation_service.generate_recommendations(dataset_id, observations)
        gaps = research_analysis_service.identify_research_gaps(observations, replicate_analyses)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()

        primary_color = colors.HexColor("#0B192C")
        secondary_color = colors.HexColor("#0284C7")
        teal_color = colors.HexColor("#0D9488")
        dark_text = colors.HexColor("#1E293B")
        light_bg = colors.HexColor("#F8FAFC")
        alert_red = colors.HexColor("#DC2626")

        title_style = ParagraphStyle(
            'ResTitle', parent=styles['Heading1'], fontName='Helvetica-Bold',
            fontSize=18, leading=22, textColor=primary_color, spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            'ResSub', parent=styles['Normal'], fontName='Helvetica',
            fontSize=9.5, leading=13, textColor=secondary_color, spaceAfter=10
        )
        section_style = ParagraphStyle(
            'ResSec', parent=styles['Heading2'], fontName='Helvetica-Bold',
            fontSize=11.5, leading=15, textColor=primary_color, spaceBefore=10, spaceAfter=4
        )
        body_style = ParagraphStyle(
            'ResBody', parent=styles['Normal'], fontName='Helvetica',
            fontSize=8, leading=11, textColor=dark_text
        )
        bold_body = ParagraphStyle('ResBold', parent=body_style, fontName='Helvetica-Bold')
        disclaimer_style = ParagraphStyle(
            'ResDisc', parent=styles['Normal'], fontName='Helvetica-Oblique',
            fontSize=7, leading=9.5, textColor=colors.HexColor("#64748B")
        )

        elements = []

        # 1. Header Banner
        report_id = f"RES-LAB-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
        date_str = datetime.now(timezone.utc).strftime("%B %d, %Y - %H:%M UTC")

        elements.append(Paragraph("AquaSolve™ Research Intelligence Lab", title_style))
        elements.append(Paragraph(f"{report_title} | ID: <b>{report_id}</b> | Generated: {date_str}", subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=teal_color, spaceAfter=8))

        # 2. Dataset Overview Metadata
        meta_data = [
            [
                Paragraph("<b>Dataset Name:</b>", body_style), Paragraph(dataset.name, body_style),
                Paragraph("<b>Total Records:</b>", body_style), Paragraph(str(quality_metrics.total_records), body_style)
            ],
            [
                Paragraph("<b>Valid Records:</b>", body_style), Paragraph(str(quality_metrics.valid_records), body_style),
                Paragraph("<b>Flagged / Excluded:</b>", body_style), Paragraph(f"{quality_metrics.flagged_records} / {quality_metrics.excluded_records}", body_style)
            ],
            [
                Paragraph("<b>Missing Data %:</b>", body_style), Paragraph(f"{quality_metrics.missing_data_percentage}%", body_style),
                Paragraph("<b>Replicate Groups:</b>", body_style), Paragraph(f"{quality_metrics.total_replicate_groups} groups ({quality_metrics.single_replicate_count} single)", body_style)
            ]
        ]
        meta_table = Table(meta_data, colWidths=[1.3 * inch, 2.3 * inch, 1.4 * inch, 2.2 * inch])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), light_bg),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 6))

        # 3. Treatment Performance Table
        elements.append(Paragraph("1. Experimental Treatment Performance Summary", section_style))
        perf_rows = [
            [
                Paragraph("<b>Contaminant</b>", bold_body),
                Paragraph("<b>Treatment Method</b>", bold_body),
                Paragraph("<b>Runs (n)</b>", bold_body),
                Paragraph("<b>Mean C0</b>", bold_body),
                Paragraph("<b>Mean Ct</b>", bold_body),
                Paragraph("<b>Mean Removal %</b>", bold_body),
                Paragraph("<b>Std Dev (s)</b>", bold_body),
                Paragraph("<b>Range (Min–Max)</b>", bold_body)
            ]
        ]
        for p in performances:
            perf_rows.append([
                Paragraph(p.contaminant, body_style),
                Paragraph(p.treatment_method, body_style),
                Paragraph(str(p.record_count), body_style),
                Paragraph(f"{p.mean_initial_concentration} {p.unit}", body_style),
                Paragraph(f"{p.mean_final_concentration} {p.unit}", body_style),
                Paragraph(f"<b>{p.mean_removal_efficiency:.1f}%</b>", bold_body),
                Paragraph(f"±{p.std_removal_efficiency:.2f}%", body_style),
                Paragraph(f"{p.min_removal_efficiency:.1f}% – {p.max_removal_efficiency:.1f}%", body_style)
            ])

        perf_table = Table(perf_rows, colWidths=[1.0 * inch, 1.3 * inch, 0.6 * inch, 0.9 * inch, 0.9 * inch, 1.0 * inch, 0.7 * inch, 0.8 * inch])
        perf_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#94A3B8")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0,0), (-1,-1), 2.5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ]))
        elements.append(perf_table)
        elements.append(Spacer(1, 8))

        # 4. Reproducibility & Uncertainty Analysis
        elements.append(Paragraph("2. Replicate Reproducibility & Measurement Uncertainty Assessment", section_style))
        rep_rows = [
            [
                Paragraph("<b>Experiment ID</b>", bold_body),
                Paragraph("<b>Technology / Contaminant</b>", bold_body),
                Paragraph("<b>Replicates (n)</b>", bold_body),
                Paragraph("<b>Mean Removal</b>", bold_body),
                Paragraph("<b>CV (%)</b>", bold_body),
                Paragraph("<b>95% Conf. Interval</b>", bold_body),
                Paragraph("<b>Precision Rating</b>", bold_body)
            ]
        ]
        for r in replicate_analyses[:8]:  # Top replicate groups
            ci_str = f"[{r.ci_95_lower}%, {r.ci_95_upper}%]" if r.ci_95_lower is not None else "n/a (n < 2)"
            rating_style = ParagraphStyle('Rat', parent=body_style, textColor=colors.HexColor("#166534") if "High Precision" in r.repeatability_rating else alert_red if "High" in r.repeatability_rating else colors.HexColor("#B45309"))
            rep_rows.append([
                Paragraph(r.experiment_id, body_style),
                Paragraph(f"{r.treatment_method} / {r.contaminant}", body_style),
                Paragraph(str(r.sample_size), body_style),
                Paragraph(f"{r.mean_removal_efficiency:.1f}%", body_style),
                Paragraph(f"{r.cv_percent:.1f}%", body_style),
                Paragraph(ci_str, body_style),
                Paragraph(r.repeatability_rating, rating_style)
            ])

        rep_table = Table(rep_rows, colWidths=[1.1 * inch, 1.6 * inch, 0.7 * inch, 0.9 * inch, 0.7 * inch, 1.1 * inch, 1.1 * inch])
        rep_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E0F2FE")),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#0284C7")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0,0), (-1,-1), 2.5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ]))
        elements.append(rep_table)
        elements.append(Spacer(1, 8))

        # 5. Identified Research Gaps
        if gaps:
            elements.append(Paragraph("3. Identified Research Gaps & Experimental Deficits", section_style))
            for g in gaps:
                elements.append(Paragraph(f"• {g}", body_style))
            elements.append(Spacer(1, 6))

        # 6. Recommended Next Experiments (Intelligent Planner)
        elements.append(Paragraph("4. Recommended Follow-Up Experiments (Intelligent Experiment Planner)", section_style))
        for rec in rec_response.recommendations[:4]:
            rec_block = [
                [
                    Paragraph(f"<b>Priority #{rec.priority}: {rec.research_question}</b>", bold_body),
                    Paragraph(f"<b>Category:</b> {rec.category.replace('_', ' ').title()}", body_style)
                ],
                [
                    Paragraph(f"<b>Scientific Reason:</b> {rec.reason}", body_style),
                    Paragraph(f"<b>Expected Information Gain:</b> {rec.expected_information_gain}", body_style)
                ],
                [
                    Paragraph(f"<b>Variables to Investigate:</b> {', '.join(rec.variables_to_investigate)}", body_style),
                    Paragraph(f"<b>Variables to Hold Constant:</b> {', '.join(f'{k}: {v}' for k, v in rec.variables_to_keep_constant.items())}", body_style)
                ]
            ]
            rec_tbl = Table(rec_block, colWidths=[3.6 * inch, 3.6 * inch])
            rec_tbl.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FDFA")),
                ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#0D9488")),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CCFBF1")),
                ('TOPPADDING', (0,0), (-1,-1), 3),
                ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ]))
            elements.append(rec_tbl)
            elements.append(Spacer(1, 4))

        # 7. Scientific Methodology & Limitations Notice
        elements.append(Spacer(1, 6))
        elements.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#CBD5E1"), spaceAfter=5))
        elements.append(Paragraph(
            "<b>SCIENTIFIC PROVENANCE & METHODOLOGY NOTICE:</b> This research report presents empirical statistical evaluations computed directly from user-uploaded experimental observations. Replicate statistics are calculated using Student's t-distributions under nominal degrees of freedom. Removal efficiency calculations preserve negative values to accurately identify potential desorption or contamination. Recommended experiments are scientific research proposals aimed at closing uncertainty gaps and do not constitute unsupervised operational protocols. Antigravity/AquaSolve does not fabricate research findings.",
            disclaimer_style
        ))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    def generate_csv_export(self, db: Session, dataset_id: int) -> str:
        """Export clean research observations with computed metrics as CSV."""
        dataset = db.query(ResearchDataset).filter(ResearchDataset.id == dataset_id).first()
        if not dataset:
            raise ValueError(f"Dataset #{dataset_id} not found.")

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["AquaSolve Research Intelligence Lab - Experimental Export"])
        writer.writerow(["Dataset Name", dataset.name])
        writer.writerow(["Generated At", datetime.now(timezone.utc).isoformat()])
        writer.writerow([])

        writer.writerow([
            "observation_id",
            "experiment_id",
            "sample_id",
            "experiment_date",
            "water_source",
            "contaminant",
            "initial_concentration",
            "final_concentration",
            "removal_efficiency_percent",
            "unit",
            "treatment_method",
            "treatment_duration_min",
            "ph",
            "temperature_c",
            "treatment_dose_mg_l",
            "replicate_number",
            "measurement_uncertainty",
            "instrument_method",
            "is_flagged",
            "flag_reason",
            "audit_status",
            "audit_annotation",
            "notes"
        ])

        for o in dataset.observations:
            writer.writerow([
                o.id,
                o.experiment_id,
                o.sample_id or "",
                o.experiment_date or "",
                o.water_source or "",
                o.contaminant,
                o.initial_concentration,
                o.final_concentration,
                o.removal_efficiency if o.removal_efficiency is not None else "",
                o.unit or "",
                o.treatment_method,
                o.treatment_duration if o.treatment_duration is not None else "",
                o.ph if o.ph is not None else "",
                o.temperature if o.temperature is not None else "",
                o.treatment_dose if o.treatment_dose is not None else "",
                o.replicate_number,
                o.measurement_uncertainty if o.measurement_uncertainty is not None else "",
                o.instrument_method or "",
                "YES" if o.is_flagged else "NO",
                o.flag_reason or "",
                o.audit_status,
                o.audit_annotation or "",
                o.notes or ""
            ])

        return output.getvalue()

research_report_service = ResearchReportService()
