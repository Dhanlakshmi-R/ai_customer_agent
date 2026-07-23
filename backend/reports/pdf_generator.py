import os
import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_pdf_report(
    session_id: str,
    output_path: str,
    summary_text: str,
    resolution_score: float,
    sentiment_journey: list,
    strengths: list,
    weaknesses: list,
    coaching_tips: list
) -> str:
    """Generates a professional PDF coaching & post-interaction summary report using ReportLab."""
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=22,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=6
    )
    
    h2_style = ParagraphStyle(
        'Heading2',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=12,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor("#334155"),
        leading=14
    )

    elements = []

    # Title & Header
    elements.append(Paragraph("AI Customer Support Coaching Report", title_style))
    elements.append(Paragraph(f"Session ID: {session_id} | Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}", body_style))
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#6366f1"), spaceAfter=15))

    # Resolution Quality Score Box
    score_color = colors.HexColor("#10b981") if resolution_score >= 80 else colors.HexColor("#f59e0b")
    elements.append(Paragraph(f"<b>Overall Resolution Score: <font color='{score_color.hexval()}'>{resolution_score}/100</font></b>", h2_style))
    elements.append(Paragraph(summary_text, body_style))
    elements.append(Spacer(1, 15))

    # Strengths & Weaknesses Table
    elements.append(Paragraph("Performance Breakdown", h2_style))
    
    strengths_str = "<br/>".join([f"• {s}" for s in strengths]) if strengths else "• Consistent polite greeting"
    weaknesses_str = "<br/>".join([f"• {w}" for w in weaknesses]) if weaknesses else "• Could provide step-by-step documentation links sooner"

    table_data = [
        [Paragraph("<b>Key Strengths</b>", body_style), Paragraph("<b>Areas for Improvement</b>", body_style)],
        [Paragraph(strengths_str, body_style), Paragraph(weaknesses_str, body_style)]
    ]

    t = Table(table_data, colWidths=[260, 260])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), colors.HexColor("#f1f5f9")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 15))

    # Coaching Recommendations
    elements.append(Paragraph("Personalized Coaching Recommendations", h2_style))
    for idx, tip in enumerate(coaching_tips, 1):
        elements.append(Paragraph(f"<b>{idx}.</b> {tip}", body_style))
        elements.append(Spacer(1, 4))

    doc.build(elements)
    return output_path
