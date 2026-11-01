import io
import csv
from datetime import datetime
from typing import Dict, List, Any, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from backend.app.services.chemistry_engine import chemistry_engine
from backend.app.services.water_analyzer import water_analyzer
from backend.app.services.recommendation_engine import recommendation_engine
from backend.app.services.simulation_engine import simulation_engine

class ReportGenerator:
    def __init__(self):
        self.engine = chemistry_engine

    def generate_pdf(
        self,
        source: str,
        intended_use: str,
        standard_id: str,
        baseline_measurements: Dict[str, float],
        treatment_sequence: Optional[List[str]] = None,
        report_title: str = "AquaSolve Water Quality Analysis & Treatment Report"
    ) -> bytes:
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
        
        # Custom styles with AquaSolve branding colors
        primary_color = colors.HexColor("#0B192C")
        secondary_color = colors.HexColor("#0284C7")
        accent_color = colors.HexColor("#0D9488")
        dark_text = colors.HexColor("#1E293B")
        light_bg = colors.HexColor("#F8FAFC")
        alert_red = colors.HexColor("#DC2626")

        title_style = ParagraphStyle(
            'AquaTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=20,
            leading=24,
            textColor=primary_color,
            spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            'AquaSubTitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=secondary_color,
            spaceAfter=12
        )
        section_style = ParagraphStyle(
            'AquaSection',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=primary_color,
            spaceBefore=12,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'AquaBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            leading=12,
            textColor=dark_text
        )
        bold_body_style = ParagraphStyle(
            'AquaBoldBody',
            parent=body_style,
            fontName='Helvetica-Bold'
        )
        disclaimer_style = ParagraphStyle(
            'AquaDisclaimer',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor("#64748B")
        )

        elements = []

        # 1. Header Banner
        report_id = f"AQ-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
        date_str = datetime.utcnow().strftime("%B %d, %Y - %H:%M UTC")

        elements.append(Paragraph("AquaSolve™ Environmental Chemistry Platform", title_style))
        elements.append(Paragraph(f"{report_title} | ID: <b>{report_id}</b> | Generated: {date_str}", subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=secondary_color, spaceAfter=10))

        # 2. Sample Metadata Summary Table
        standard = self.engine.get_standard(standard_id) or self.engine.get_standard("is10500")
        meta_data = [
            [
                Paragraph("<b>Water Source:</b>", body_style), Paragraph(source, body_style),
                Paragraph("<b>Intended Water Use:</b>", body_style), Paragraph(intended_use, body_style)
            ],
            [
                Paragraph("<b>Reference Standard:</b>", body_style), Paragraph(standard["name"], body_style),
                Paragraph("<b>Evaluation Mode:</b>", body_style), Paragraph("Chemistry Equilibrium Simulation", body_style)
            ]
        ]
        meta_table = Table(meta_data, colWidths=[1.3 * inch, 2.2 * inch, 1.4 * inch, 2.3 * inch])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), light_bg),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 8))

        # 3. Water Quality Analysis Engine Output
        analysis = water_analyzer.evaluate_water(baseline_measurements, standard_id, source, intended_use)
        elements.append(Paragraph(f"1. Baseline Water Quality Assessment (Total Parameters: {analysis.summary.total_evaluated}, Outside Benchmark: {analysis.summary.outside_reference_count})", section_style))

        # Baseline Table
        table_rows = [
            [
                Paragraph("<b>Parameter</b>", bold_body_style),
                Paragraph("<b>Measured Value</b>", bold_body_style),
                Paragraph("<b>Unit</b>", bold_body_style),
                Paragraph("<b>Benchmark Limit</b>", bold_body_style),
                Paragraph("<b>Classification</b>", bold_body_style)
            ]
        ]

        for pid, eval_item in analysis.parameters.items():
            status_color = colors.HexColor("#166534") if eval_item.status == "Within selected reference" else alert_red
            p_style = ParagraphStyle(
                f'StatusStyle_{pid}',
                parent=bold_body_style,
                textColor=status_color
            )
            table_rows.append([
                Paragraph(eval_item.name, body_style),
                Paragraph(f"{eval_item.value:.3f}".rstrip('0').rstrip('.'), body_style),
                Paragraph(eval_item.unit, body_style),
                Paragraph(eval_item.reference_range_str, body_style),
                Paragraph(eval_item.status, p_style)
            ])

        b_table = Table(table_rows, colWidths=[1.8 * inch, 1.1 * inch, 1.1 * inch, 1.8 * inch, 1.4 * inch])
        b_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#94A3B8")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))
        elements.append(b_table)
        elements.append(Spacer(1, 10))

        # 4. Treatment Recommendations & Virtual Treatment Simulation
        rec_data = recommendation_engine.generate_recommendations(baseline_measurements, standard_id, source, intended_use)
        active_sequence = treatment_sequence if treatment_sequence else [st.id for st in rec_data.recommended_sequence]

        sim_result = simulation_engine.run_simulation(baseline_measurements, active_sequence, standard_id)

        elements.append(Paragraph("2. Environmental Chemistry Treatment & Simulation Sequence", section_style))
        seq_text = " -> ".join([step.stage_name for step in sim_result.stage_steps]) if sim_result.stage_steps else "No active treatment stages selected."
        elements.append(Paragraph(f"<b>Simulated Sequence Flow:</b> {seq_text}", body_style))
        elements.append(Spacer(1, 6))

        # Before & After Comparison Table
        elements.append(Paragraph("3. Before-and-After Comparison Table", section_style))
        comp_rows = [
            [
                Paragraph("<b>Parameter</b>", bold_body_style),
                Paragraph("<b>Baseline Measured</b>", bold_body_style),
                Paragraph("<b>Simulated Output</b>", bold_body_style),
                Paragraph("<b>Benchmark</b>", bold_body_style),
                Paragraph("<b>Net Change</b>", bold_body_style),
                Paragraph("<b>Post-Treatment Status</b>", bold_body_style)
            ]
        ]

        for pid, base_val in baseline_measurements.items():
            final_val = sim_result.final_measurements.get(pid, base_val)
            p_def = self.engine.get_parameter(pid)
            p_name = p_def["name"] if p_def else pid
            p_unit = p_def["unit"] if p_def else ""

            after_eval = sim_result.parameter_evaluations_after.get(pid)
            status_str = after_eval.status if after_eval else "Evaluated"
            ref_str = after_eval.reference_range_str if after_eval else "-"

            delta = final_val - base_val
            delta_str = f"{delta:+.2f}" if abs(delta) > 0.001 else "0.00"

            status_color = colors.HexColor("#166534") if status_str == "Within selected reference" else alert_red
            res_style = ParagraphStyle(f'ResStyle_{pid}', parent=bold_body_style, textColor=status_color)

            comp_rows.append([
                Paragraph(f"{p_name} ({p_unit})", body_style),
                Paragraph(f"{base_val:.3f}".rstrip('0').rstrip('.'), body_style),
                Paragraph(f"<b>{final_val:.3f}</b>".rstrip('0').rstrip('.'), body_style),
                Paragraph(ref_str, body_style),
                Paragraph(delta_str, body_style),
                Paragraph(status_str, res_style)
            ])

        comp_table = Table(comp_rows, colWidths=[1.8 * inch, 1.0 * inch, 1.0 * inch, 1.4 * inch, 0.9 * inch, 1.1 * inch])
        comp_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E0F2FE")),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#0284C7")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))
        elements.append(comp_table)
        elements.append(Spacer(1, 10))

        # 5. Scientific Limitations & Regulatory Disclaimer
        elements.append(Paragraph("4. Scientific Assumptions & Model Limitations", section_style))
        for step in sim_result.stage_steps:
            if step.applied_effects:
                eff_list = [f"<b>{k}</b>: {v}" for k, v in step.applied_effects.items()]
                elements.append(Paragraph(f"• <b>{step.stage_name} ({step.stage_category}):</b> {'; '.join(eff_list)}", body_style))

        elements.append(Spacer(1, 8))
        elements.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#CBD5E1"), spaceAfter=6))
        elements.append(Paragraph(
            "<b>IMPORTANT REGULATORY AND PUBLIC HEALTH NOTICE:</b> This document is generated for educational and preliminary engineering decision-support purposes only. Simulated treatment values reflect theoretical mathematical models derived from environmental literature (AWWA, WHO, US EPA) under nominal ambient conditions. They do <u>NOT</u> certify water safety or potability. Certified laboratory testing (bacteriological and chemical) of actual post-treatment water is mandatory prior to consumption.",
            disclaimer_style
        ))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    def generate_csv(
        self,
        source: str,
        standard_id: str,
        baseline_measurements: Dict[str, float],
        treatment_sequence: Optional[List[str]] = None
    ) -> str:
        standard = self.engine.get_standard(standard_id) or self.engine.get_standard("is10500")
        analysis = water_analyzer.evaluate_water(baseline_measurements, standard_id)
        
        active_sequence = treatment_sequence or []
        sim_result = simulation_engine.run_simulation(baseline_measurements, active_sequence, standard_id)

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["AquaSolve Water Quality Analysis & Simulation Export"])
        writer.writerow(["Generated At", datetime.utcnow().isoformat()])
        writer.writerow(["Water Source", source])
        writer.writerow(["Reference Standard", standard["name"]])
        writer.writerow(["Simulated Treatment Sequence", " -> ".join(active_sequence) if active_sequence else "None"])
        writer.writerow([])

        writer.writerow([
            "Parameter ID",
            "Parameter Name",
            "Unit",
            "Baseline Measured Value",
            "Baseline Status",
            "Reference Limit",
            "Simulated Output Value",
            "Simulated Status",
            "Net Change"
        ])

        for pid, base_val in baseline_measurements.items():
            p_def = self.engine.get_parameter(pid)
            p_name = p_def["name"] if p_def else pid
            p_unit = p_def["unit"] if p_def else ""

            b_eval = analysis.parameters.get(pid)
            b_status = b_eval.status if b_eval else ""
            b_ref = b_eval.reference_range_str if b_eval else ""

            final_val = sim_result.final_measurements.get(pid, base_val)
            a_eval = sim_result.parameter_evaluations_after.get(pid)
            a_status = a_eval.status if a_eval else ""

            delta = final_val - base_val

            writer.writerow([
                pid,
                p_name,
                p_unit,
                base_val,
                b_status,
                b_ref,
                final_val,
                a_status,
                round(delta, 4)
            ])

        return output.getvalue()

report_generator = ReportGenerator()
