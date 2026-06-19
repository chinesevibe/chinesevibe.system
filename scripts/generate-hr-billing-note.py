#!/usr/bin/env python3
"""Generate billing note PDF for HR System sale."""

from __future__ import annotations

import os
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "pdf"
OUT_DIR.mkdir(parents=True, exist_ok=True)

FONT_REG = "Thonburi"
FONT_BOLD = "ThonburiBold"
THONBURI = "/System/Library/Fonts/Supplemental/Thonburi.ttc"

DOC_NO = f"BL-{date.today():%Y%m%d}-001"
ISSUE_DATE = date.today().strftime("%d/%m/%Y")

BUYER = "บริษัท ไชนีส ไวซ์ จำกัด"
BUYER_ROLE = "ผู้จัดซื้อ/จัดจ้าง"

SELLER = "นาย จักริน โรจนพุทธิ"
TAX_ID = "1909800044221"
SELLER_ADDR = "บ้านเลขที่ 1/15 หมู่ 6 แขวงหนองจอก เขตหนองจอก จังหวัดกรุงเทพมหานคร"

ITEM_DESC = "ระบบบริหารทัพยากรบุคคล (HR System)"
AMOUNT = 10_000.00


def register_fonts() -> None:
    if not os.path.exists(THONBURI):
        raise SystemExit("Thonburi font not found")
    pdfmetrics.registerFont(TTFont(FONT_REG, THONBURI, subfontIndex=0))
    pdfmetrics.registerFont(TTFont(FONT_BOLD, THONBURI, subfontIndex=1))


def pstyle(name: str, **kwargs) -> ParagraphStyle:
    kwargs.setdefault("fontName", FONT_REG)
    return ParagraphStyle(name, **kwargs)


def build_pdf(path: Path) -> None:
    register_fonts()

    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
        title="ใบวางบิล HR System",
    )

    title = pstyle(
        "title",
        fontName=FONT_BOLD,
        fontSize=20,
        leading=26,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#1a1a1a"),
        spaceAfter=4,
    )
    subtitle = pstyle(
        "subtitle",
        fontSize=11,
        leading=15,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#555555"),
        spaceAfter=16,
    )
    label = pstyle("label", fontName=FONT_BOLD, fontSize=11, leading=15)
    body = pstyle("body", fontSize=11, leading=16)
    small = pstyle("small", fontSize=10, leading=14, textColor=colors.HexColor("#444444"))
    right = pstyle("right", fontSize=11, leading=15, alignment=TA_RIGHT)

    story = [
        Paragraph("ใบวางบิล", title),
        Paragraph("BILLING NOTE", subtitle),
        Spacer(1, 4 * mm),
    ]

    meta = Table(
        [
            [
                Paragraph(f"<b>เลขที่เอกสาร:</b> {DOC_NO}", body),
                Paragraph(f"<b>วันที่:</b> {ISSUE_DATE}", right),
            ],
        ],
        colWidths=[9.5 * cm, 7.5 * cm],
    )
    meta.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story += [meta, Spacer(1, 8 * mm)]

    parties = Table(
        [
            [
                Paragraph("<b>ลูกค้า / ผู้ซื้อ</b>", label),
                Paragraph("<b>ผู้ขายสินค้า/ให้บริการ</b>", label),
            ],
            [
                Paragraph(
                    f"{BUYER}<br/>{BUYER_ROLE}",
                    body,
                ),
                Paragraph(
                    f"{SELLER}<br/>"
                    f"เลขประจำตัวผู้เสียภาษี {TAX_ID}<br/>"
                    f"{SELLER_ADDR}",
                    body,
                ),
            ],
        ],
        colWidths=[8.5 * cm, 8.5 * cm],
    )
    parties.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#cccccc")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e5e5")),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f7f7f7")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story += [parties, Spacer(1, 10 * mm)]

    amount_fmt = f"{AMOUNT:,.2f}"
    lines = Table(
        [
            [
                Paragraph("<b>ลำดับ</b>", label),
                Paragraph("<b>รายการ</b>", label),
                Paragraph("<b>จำนวน</b>", label),
                Paragraph("<b>หน่วย</b>", label),
                Paragraph("<b>ราคาต่อหน่วย (บาท)</b>", label),
                Paragraph("<b>จำนวนเงิน (บาท)</b>", label),
            ],
            [
                Paragraph("1", body),
                Paragraph(ITEM_DESC, body),
                Paragraph("1", body),
                Paragraph("ระบบ", body),
                Paragraph(amount_fmt, right),
                Paragraph(amount_fmt, right),
            ],
            [
                "",
                "",
                "",
                "",
                Paragraph("<b>รวมเป็นเงิน</b>", label),
                Paragraph(f"<b>{amount_fmt}</b>", right),
            ],
        ],
        colWidths=[1.2 * cm, 7.2 * cm, 1.4 * cm, 1.6 * cm, 3.2 * cm, 2.6 * cm],
    )
    lines.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#cccccc")),
                ("INNERGRID", (0, 0), (-1, -2), 0.5, colors.HexColor("#e5e5e5")),
                ("LINEABOVE", (4, 2), (-1, 2), 0.75, colors.HexColor("#999999")),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f7f7f7")),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("ALIGN", (2, 0), (3, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story += [
        lines,
        Spacer(1, 6 * mm),
        Paragraph("<b>จำนวนเงิน (ตัวอักษร):</b> หนึ่งหมื่นบาทถ้วน", body),
        Spacer(1, 14 * mm),
        Paragraph(
            "<b>หมายเหตุ:</b> กรุณาชำระเงินตามที่ตกลงไว้ "
            "เอกสารฉบับนี้ออกเพื่อแจ้งยอดค่าบริการก่อนออกใบเสร็จรับเงิน/ใบกำกับภาษี (ถ้ามี)",
            small,
        ),
        Spacer(1, 18 * mm),
    ]

    sign = Table(
        [
            [
                Paragraph(
                    "........................................<br/>"
                    "ลงชื่อผู้รับบิล<br/>"
                    f"({BUYER})<br/>"
                    "วันที่ ....../....../......",
                    body,
                ),
                Paragraph(
                    "........................................<br/>"
                    "ลงชื่อผู้วางบิล<br/>"
                    f"({SELLER})<br/>"
                    f"วันที่ {ISSUE_DATE}",
                    body,
                ),
            ],
        ],
        colWidths=[8.5 * cm, 8.5 * cm],
    )
    sign.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(sign)

    doc.build(story)


def main() -> None:
    out = OUT_DIR / "ใบวางบิล_HR_System_ไชนีสไวซ์.pdf"
    build_pdf(out)
    print(out)


if __name__ == "__main__":
    main()
