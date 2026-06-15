#!/usr/bin/env python3
"""Generate full Employee LINE OA user manual PDF with real project images."""

from __future__ import annotations

import os
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT.parent
OUT_DIR = ROOT / "output" / "pdf"
ASSETS = OUT_DIR / "assets"
PDF_PATH = OUT_DIR / "LINE_OA_Employee_Manual_TH.pdf"

FONT_REG = "Thonburi"
FONT_BOLD = "ThonburiBold"

IMAGE_PATHS = {
    "mascot": PROJECT / "pic" / "HR.png",
    "logo": PROJECT / "pic" / "zhongguomingtang_transparent.png",
    "qr_register": PROJECT / "pic" / "QR-Register.png",
    "register_guide": PROJECT / "pic" / "register_guide_1024x1024.jpg",
    "rich_menu": ROOT / "public" / "rich-menu.png",
    "login_real": ASSETS / "login-page-real.png",
    "icon_checkin": ROOT / "public" / "icons" / "checkin_in.png",
    "icon_checkout": ROOT / "public" / "icons" / "checkout_success.png",
    "icon_leave": ROOT / "public" / "icons" / "leave.png",
    "icon_document": ROOT / "public" / "icons" / "document.png",
    "icon_complaint": ROOT / "public" / "icons" / "complaint.png",
    "icon_contact": ROOT / "public" / "icons" / "contact_hr.png",
    "icon_welcome": ROOT / "public" / "icons" / "welcome.png",
    "leave_form": ROOT / "_agent" / "archive" / "T16" / "T16_leave_form.png",
    "liff_leave_gate": ASSETS / "liff-leave-real.png",
    "liff_overtime": ASSETS / "overtime-real.png",
    "liff_documents": ASSETS / "documents-real.png",
    "liff_complaint": ASSETS / "complaint-real.png",
}


def register_fonts() -> None:
    thonburi = "/System/Library/Fonts/Supplemental/Thonburi.ttc"
    if not os.path.exists(thonburi):
        raise SystemExit("Thonburi font not found — required for Thai text")
    pdfmetrics.registerFont(TTFont(FONT_REG, thonburi, subfontIndex=0))
    pdfmetrics.registerFont(TTFont(FONT_BOLD, thonburi, subfontIndex=1))


def build_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title",
            parent=base["Title"],
            fontName=FONT_BOLD,
            fontSize=22,
            leading=28,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#B71C1C"),
            spaceAfter=12,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            parent=base["Normal"],
            fontName=FONT_REG,
            fontSize=12,
            leading=16,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#4B5563"),
            spaceAfter=18,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName=FONT_BOLD,
            fontSize=16,
            leading=22,
            textColor=colors.HexColor("#B71C1C"),
            spaceBefore=10,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName=FONT_BOLD,
            fontSize=13,
            leading=18,
            textColor=colors.HexColor("#111827"),
            spaceBefore=8,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName=FONT_REG,
            fontSize=11,
            leading=16,
            alignment=TA_LEFT,
            spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=base["Normal"],
            fontName=FONT_REG,
            fontSize=11,
            leading=16,
            leftIndent=14,
            bulletIndent=0,
            spaceAfter=4,
        ),
        "caption": ParagraphStyle(
            "caption",
            parent=base["Normal"],
            fontName=FONT_REG,
            fontSize=9,
            leading=12,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#6B7280"),
            spaceAfter=10,
        ),
        "footer": ParagraphStyle(
            "footer",
            parent=base["Normal"],
            fontName=FONT_REG,
            fontSize=8,
            textColor=colors.HexColor("#9CA3AF"),
            alignment=TA_CENTER,
        ),
    }


def img(path: Path, max_w: float, max_h: float | None = None) -> Image:
    if not path.exists():
        raise FileNotFoundError(path)
    im = Image(str(path))
    ratio = im.imageWidth / im.imageHeight
    w = min(max_w, im.imageWidth)
    h = w / ratio
    if max_h and h > max_h:
        h = max_h
        w = h * ratio
    im.drawWidth = w
    im.drawHeight = h
    im.hAlign = "CENTER"
    return im


def section_title(text: str, styles) -> list:
    return [Paragraph(text, styles["h1"]), Spacer(1, 4)]


def bullets(items: list[str], styles) -> list:
    return [Paragraph(f"• {item}", styles["bullet"]) for item in items]


def step_block(num: int, title: str, detail: str, styles) -> list:
    return [
        Paragraph(f"<b>ขั้นที่ {num}:</b> {title}", styles["h2"]),
        Paragraph(detail, styles["body"]),
        Spacer(1, 4),
    ]


def feature_row(icon_path: Path, title: str, desc: str, styles, col_w: float) -> Table:
    icon = img(icon_path, 36, 36)
    text = Paragraph(f"<b>{title}</b><br/>{desc}", styles["body"])
    t = Table([[icon, text]], colWidths=[col_w * 0.15, col_w * 0.85])
    t.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return t


def build_story(styles) -> list:
    content_w = A4[0] - 4 * cm
    story: list = []

    # Cover
    story.append(Spacer(1, 1.2 * cm))
    if IMAGE_PATHS["mascot"].exists():
        story.append(img(IMAGE_PATHS["mascot"], 4.5 * cm))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("คู่มือการใช้งาน LINE OA", styles["title"]))
    story.append(Paragraph("สำหรับพนักงาน (Employee)", styles["title"]))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph("中国名堂 · Zhongguo Mingtang", styles["subtitle"]))
    story.append(Paragraph("ระบบ HR & Payroll — ฝั่งพนักงาน", styles["subtitle"]))
    story.append(Spacer(1, 0.6 * cm))
    story.append(
        Paragraph(
            f"Production: https://hr-app-two-iota.vercel.app<br/>"
            f"จัดทำ: {date.today().strftime('%d/%m/%Y')}",
            styles["subtitle"],
        )
    )
    story.append(PageBreak())

    # TOC
    story.extend(section_title("สารบัญ", styles))
    toc = [
        "1. ภาพรวมระบบ",
        "2. เริ่มต้นใช้งาน — ลงทะเบียนและ Login",
        "3. เมนู Rich Menu หลัก",
        "4. เช็คอิน / เช็คเอาท์",
        "5. ขอลา",
        "6. ขอทำ OT",
        "7. ขอเอกสาร",
        "8. แจ้งเรื่องร้องเรียน",
        "9. ติดต่อ HR",
        "10. Portal พนักงาน (Web)",
        "11. เปลี่ยนภาษา / Language",
        "12. คำสั่งพิมพ์ในแชท (/stock ฯลฯ)",
        "13. ประกาศจาก HR",
        "ภาคผนวก — URL สำคัญ",
    ]
    story.extend(bullets(toc, styles))
    story.append(PageBreak())

    # 1 Overview
    story.extend(section_title("1. ภาพรวมระบบ", styles))
    story.append(
        Paragraph(
            "พนักงานใช้งาน HR ผ่าน <b>LINE Official Account (OA)</b> เป็นหลัก "
            "และสามารถเข้า <b>Portal พนักงาน</b> บนเว็บได้เมื่อ HR อนุมัติบัญชีแล้ว "
            "ระบบรองรับภาษาไทย English 中文 และ မြန်မာ ในข้อความพนักงาน",
            styles["body"],
        )
    )
    story.append(Spacer(1, 6))
    story.extend(
        bullets(
            [
                "เช็คอิน/เช็คเอาท์ด้วยตำแหน่ง GPS หรือ QR Code — บันทึกทันที",
                "ยื่นขอลา ขอ OT ขอเอกสาร และร้องเรียนผ่าน LIFF",
                "รับประกาศทางแชท LINE · รับผลอนุมัติ (ลา/OT/เอกสาร) ทาง LINE",
                "ดูสลิป สต็อก (ถ้า HR เปิด) และสแกนรับเข้าผ่าน Portal",
            ],
            styles,
        )
    )
    if IMAGE_PATHS["icon_welcome"].exists():
        story.append(Spacer(1, 8))
        story.append(img(IMAGE_PATHS["icon_welcome"], content_w * 0.55, 8 * cm))
        story.append(Paragraph("หน้าต้อนรับเมื่อเพิ่มเพื่อน LINE OA", styles["caption"]))
    story.append(PageBreak())

    # 2 Registration
    story.extend(section_title("2. เริ่มต้นใช้งาน — ลงทะเบียนและ Login", styles))
    story.extend(
        step_block(
            1,
            "เพิ่มเพื่อน LINE OA",
            "สแกน QR Code ด้านล่าง หรือค้นหา Official Account ของบริษัท แล้วกด Add Friend",
            styles,
        )
    )
    if IMAGE_PATHS["qr_register"].exists():
        story.append(img(IMAGE_PATHS["qr_register"], 5 * cm))
        story.append(Paragraph("QR Code ลงทะเบียน / เพิ่มเพื่อน", styles["caption"]))

    story.extend(
        step_block(
            2,
            "เปิดหน้า Login จริง",
            "เปิดเบราว์เซอร์ไปที่ "
            "<b>https://hr-app-two-iota.vercel.app/login</b> "
            "แล้วกดปุ่มสีเขียว <b>เข้าสู่ระบบด้วย LINE</b>",
            styles,
        )
    )
    story.append(img(IMAGE_PATHS["login_real"], content_w * 0.62, 10 * cm))
    story.append(
        Paragraph(
            "ภาพหน้า Login จริงจาก Production (ถ่ายเมื่อจัดทำคู่มือ)",
            styles["caption"],
        )
    )

    story.extend(
        step_block(
            3,
            "กรอกข้อมูลลงทะเบียน (พนักงานใหม่)",
            "หลัง Login ครั้งแรก ระบบพาไปหน้า /register กรอกชื่อ เบอร์ สาขา แผนก "
            "แล้วกดส่ง — สถานะจะเป็น <b>รอ HR อนุมัติ</b> จนกว่า HR จะเปิดใช้งาน",
            styles,
        )
    )
    story.append(img(IMAGE_PATHS["register_guide"], content_w, 16 * cm))
    story.append(
        Paragraph(
            "Infographic ขั้นตอน Register ที่อัปโหลดไว้ในโปรเจกต์ (pic/register_guide_1024x1024.jpg)",
            styles["caption"],
        )
    )
    story.extend(
        bullets(
            [
                "ระหว่างรออนุมัติ: ใช้เมนู HR ใน LINE ไม่ได้ (ยกเว้นติดต่อ HR / ลงทะเบียน)",
                "หลังอนุมัติ: ใช้ Rich Menu ได้ครบ + เข้า Portal ที่ /portal",
            ],
            styles,
        )
    )
    story.append(PageBreak())

    # 3 Rich Menu
    story.extend(section_title("3. เมนู Rich Menu หลัก", styles))
    story.append(
        Paragraph(
            "กดปุ่ม <b>เมนู HR</b> ด้านล่างแชท LINE เพื่อเปิดเมนู 6 ปุ่ม (2 แถว x 3 คอลัมน์):",
            styles["body"],
        )
    )
    story.append(img(IMAGE_PATHS["rich_menu"], content_w, 11 * cm))
    story.append(
        Paragraph(
            "Rich Menu ที่อัปโหลดและใช้งานจริง (public/rich-menu.png)",
            styles["caption"],
        )
    )
    menu_rows = [
        ("1", "เช็คอิน-เช็คเอาท์", "บันทึกเวลาเข้า-ออกงาน"),
        ("2", "ขอทำงานล่วงเวลา", "ยื่นคำขอ OT"),
        ("3", "ขอเอกสารสำคัญ", "หนังสือรับรอง / เอกสาร HR"),
        ("4", "ขอลา", "ลาป่วย ลากิจ ลาพักร้อน"),
        ("5", "แจ้งเรื่องร้องเรียน", "ร้องเรียนหรือข้อเสนอแนะ"),
        ("6", "ติดต่อ HR", "สอบถามหรือแจ้งทีม HR"),
    ]
    table_data = [["#", "ปุ่ม", "หน้าที่"]] + menu_rows
    t = Table(table_data, colWidths=[1.2 * cm, 5.5 * cm, 8.5 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#FEE2E2")),
                ("FONTNAME", (0, 0), (-1, -1), FONT_REG),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(t)
    story.append(PageBreak())

    # 4 Check-in
    story.extend(section_title("4. เช็คอิน / เช็คเอาท์", styles))
    story.append(
        Paragraph(
            "การบันทึกเวลาเข้า-ออกงาน <b>มีผลทันที</b> ในระบบ — "
            "ไม่มีขั้นตอนรอหัวหน้างานหรือ HR อนุมัติ",
            styles["body"],
        )
    )
    story.extend(
        bullets(
            [
                "กด Rich Menu → เช็คอิน-เช็คเอาท์",
                "เลือก เข้างาน หรือ เลิกงาน ตามการ์ดที่ระบบส่ง",
                "แชร์ตำแหน่ง (Location) ในแชท LINE — ระบบตรวจ Geofence สาขา",
                "ทางเลือก: สแกน QR Code จากหน้า Portal → โปรไฟล์",
                "วันละ 1 ครั้งต่อประเภท (เข้า / ออก) — ระบบยืนยันเวลาให้ทันที",
            ],
            styles,
        )
    )
    story.append(Spacer(1, 6))
    if IMAGE_PATHS["icon_checkin"].exists():
        story.append(feature_row(IMAGE_PATHS["icon_checkin"], "เข้างาน", "แชร์ตำแหน่งเมื่อถึงสาขา — บันทึกเวลาเข้าทันที", styles, content_w))
    if IMAGE_PATHS["icon_checkout"].exists():
        story.append(feature_row(IMAGE_PATHS["icon_checkout"], "เลิกงาน", "แชร์ตำแหน่งเมื่อออกจากงาน — ระบบสรุปชั่วโมงทำงานทันที", styles, content_w))
    story.append(PageBreak())

    # 5 Leave
    story.extend(section_title("5. ขอลา", styles))
    story.extend(
        bullets(
            [
                "กด Rich Menu → ขอลา → เปิดแบบฟอร์ม LIFF",
                "เลือกประเภทลา วันที่ เหตุผล แนบใบรับรองแพทย์ (ถ้ามี)",
                "กดส่งคำขอ — รอ HR อนุมัติผ่านระบบ",
                "รับผลอนุมัติ/ปฏิเสธทาง LINE",
            ],
            styles,
        )
    )
    story.append(Spacer(1, 6))
    story.append(img(IMAGE_PATHS["liff_leave_gate"], content_w * 0.62, 6 * cm))
    story.append(Paragraph("หน้า LIFF ขอลา — ต้อง Login LINE ก่อนใช้งาน", styles["caption"]))
    if IMAGE_PATHS["leave_form"].exists():
        story.append(img(IMAGE_PATHS["leave_form"], content_w, 12 * cm))
        story.append(Paragraph("ตัวอย่างแบบฟอร์มขอลา (หลัง Login)", styles["caption"]))
    story.append(PageBreak())

    # 6 OT
    story.extend(section_title("6. ขอทำ OT (Overtime)", styles))
    story.extend(
        bullets(
            [
                "กด Rich Menu → ขอทำงานล่วงเวลา",
                "กรอกวันที่ ช่วงเวลา และเหตุผล",
                "ส่งคำขอ → รอ HR อนุมัติ",
                "รับแจ้งผลทาง LINE",
            ],
            styles,
        )
    )
    story.append(img(IMAGE_PATHS["liff_overtime"], content_w * 0.62, 6 * cm))
    story.append(Paragraph("หน้า LIFF ขอ OT (/liff/overtime)", styles["caption"]))
    story.append(PageBreak())

    # 7 Documents
    story.extend(section_title("7. ขอเอกสารสำคัญ", styles))
    story.extend(
        bullets(
            [
                "กด Rich Menu → ขอเอกสารสำคัญ",
                "เลือกประเภทเอกสาร จำนวนชุด วัตถุประสงค์",
                "HR ดำเนินการและแจ้งเมื่อเอกสารพร้อม",
                "ติดตามสถานะได้ที่ Portal → เอกสาร",
            ],
            styles,
        )
    )
    story.append(img(IMAGE_PATHS["liff_documents"], content_w * 0.62, 6 * cm))
    story.append(PageBreak())

    # 8 Complaint
    story.extend(section_title("8. แจ้งเรื่องร้องเรียน", styles))
    story.extend(
        bullets(
            [
                "กด Rich Menu → แจ้งเรื่องร้องเรียน",
                "กรอกหัวข้อและรายละเอียด — เลือกเปิดเผยตัวตนหรือไม่",
                "เก็บเลข Ticket ที่ระบบให้เพื่อติดตาม",
                "HR ตอบกลับทาง LINE (กรณีไม่เลือกนิรนาม)",
            ],
            styles,
        )
    )
    story.append(img(IMAGE_PATHS["liff_complaint"], content_w * 0.62, 6 * cm))
    story.append(PageBreak())

    # 9 Contact HR
    story.extend(section_title("9. ติดต่อ HR", styles))
    story.extend(
        bullets(
            [
                "กด Rich Menu → ติดต่อ HR",
                "กด แจ้งทีม HR — ระบบส่งแจ้งเตือนไปกลุ่ม HR",
                "พนักงานใหม่: กด ลงทะเบียนพนักงาน จากการ์ดเดียวกัน",
                "เวลาทำการ จ-ศ 09:00-18:00 น.",
            ],
            styles,
        )
    )
    if IMAGE_PATHS["icon_contact"].exists():
        story.append(Spacer(1, 8))
        story.append(img(IMAGE_PATHS["icon_contact"], content_w * 0.55, 7 * cm))
    story.append(PageBreak())

    # 10 Portal
    story.extend(section_title("10. Portal พนักงาน (Web)", styles))
    story.append(
        Paragraph(
            "หลัง HR อนุมัติแล้ว Login ที่ /login จะเข้า "
            "<b>https://hr-app-two-iota.vercel.app/portal</b> ได้",
            styles["body"],
        )
    )
    story.extend(
        bullets(
            [
                "หน้าหลัก — สรุปเช็คอินวันนี้ วันลาคงเหลือ ประกาศ",
                "โปรไฟล์ — QR เช็คอิน ข้อมูลส่วนตัว",
                "ประวัติการเข้างาน (ดูย้อนหลัง) / ขอลา / เอกสาร / สลิปเงินเดือน",
                "รับเข้า / เช็คสต็อก (แผนกคลัง)",
            ],
            styles,
        )
    )
    story.append(img(IMAGE_PATHS["login_real"], content_w * 0.55, 8 * cm))
    story.append(Paragraph("Login ด้วย LINE แล้วเข้า Portal (ปุ่มเข้าสู่ Dashboard)", styles["caption"]))
    story.append(PageBreak())

    # 11 Language switch
    story.extend(section_title("11. เปลี่ยนภาษา / Language", styles))
    story.extend(
        bullets(
            [
                "พิมพ์ /th เพื่อใช้ภาษาไทย",
                "พิมพ์ /en เพื่อใช้ English",
                "พิมพ์ /zh (หรือ /ch) เพื่อใช้ 中文",
                "พิมพ์ /my เพื่อใช้ မြန်မာ",
                "หลังเปลี่ยนภาษาแล้ว ให้กดเมนูอีกครั้งเพื่อ refresh card และ LIFF",
                "ข้อจำกัดปัจจุบัน: ปุ่ม Rich Menu ด้านล่างยังเป็นภาษาไทยจนกว่าจะทำ locale menu task ถัดไป",
            ],
            styles,
        )
    )
    story.append(
        Paragraph(
            "หมายเหตุ: ข้อความยืนยัน เมนูแนะนำ และ LIFF form จะเปลี่ยนตามภาษาใหม่ "
            "แต่ภาพ/label บน Rich Menu ใน LINE ด้านล่างยังคงเป็นภาษาไทยในเวอร์ชันนี้",
            styles["body"],
        )
    )
    story.append(PageBreak())

    # 12 Slash commands
    story.extend(section_title("12. คำสั่งพิมพ์ในแชท", styles))
    story.append(
        Paragraph(
            "พิมพ์ในแชท 1:1 กับ OA ได้ (ไม่ต้องเปิดโหมดแชท) — ใช้เมื่อต้องการทางลัด:",
            styles["body"],
        )
    )
    cmds = [
        ("/leave, /ลา", "ขอลา"),
        ("/ot, /overtime", "ขอ OT"),
        ("/doc, /เอกสาร", "ขอเอกสาร"),
        ("/complaint, /ร้องเรียน", "ร้องเรียน"),
        ("/announce, /ประกาศ", "ดูประกาศล่าสุด"),
        ("/stock, /สต็อก", "ดูสต็อก (ถ้า HR เปิด)"),
        ("/inbound, /รับเข้า", "สแกนรับเข้าสินค้า"),
    ]
    cmd_table = [["คำสั่ง", "หน้าที่"]] + cmds
    ct = Table(cmd_table, colWidths=[5.5 * cm, 9.5 * cm])
    ct.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF2FF")),
                ("FONTNAME", (0, 0), (-1, -1), FONT_REG),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(ct)
    story.append(PageBreak())

    # 13 Announcements
    story.extend(section_title("13. ประกาศจาก HR", styles))
    story.extend(
        bullets(
            [
                "HR ส่งประกาศจาก Admin → พนักงานได้รับ Flex Message ในแชท LINE",
                "พิมพ์ /ประกาศ หรือดูย้อนหลังที่ Portal → ประกาศ",
                "ไม่มีปุ่มประกาศใน Rich Menu — HR เป็นผู้ push",
            ],
            styles,
        )
    )
    story.append(PageBreak())

    # Appendix
    story.extend(section_title("ภาคผนวก — URL สำคัญ", styles))
    urls = [
        ("Login", "https://hr-app-two-iota.vercel.app/login"),
        ("ลงทะเบียน", "https://hr-app-two-iota.vercel.app/register"),
        ("Portal", "https://hr-app-two-iota.vercel.app/portal"),
        ("LIFF ขอลา", "https://hr-app-two-iota.vercel.app/liff/leave"),
        ("LIFF OT", "https://hr-app-two-iota.vercel.app/liff/overtime"),
        ("LIFF เอกสาร", "https://hr-app-two-iota.vercel.app/liff/documents"),
        ("LIFF ร้องเรียน", "https://hr-app-two-iota.vercel.app/liff/complaint"),
    ]
    url_table = [["หน้า", "URL"]] + urls
    ut = Table(url_table, colWidths=[3.5 * cm, 11.5 * cm])
    ut.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), FONT_REG),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(ut)
    story.append(Spacer(1, 12))
    story.append(
        Paragraph(
            "หากมีปัญหา: กด ติดต่อ HR ใน LINE หรือแจ้งหัวหน้างานโดยตรง",
            styles["body"],
        )
    )

    return story


def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont(FONT_REG, 8)
    canvas.setFillColor(colors.HexColor("#9CA3AF"))
    canvas.drawCentredString(A4[0] / 2, 12 * mm, f"หน้า {canvas.getPageNumber()}")
    canvas.drawString(2 * cm, 12 * mm, "LINE OA Employee Manual — 中国名堂")
    canvas.restoreState()


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ASSETS.mkdir(parents=True, exist_ok=True)
    register_fonts()
    styles = build_styles()
    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2.2 * cm,
        title="LINE OA Employee Manual",
        author="Zhongguo Mingtang HR",
    )
    doc.build(build_story(styles), onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"Generated: {PDF_PATH} ({PDF_PATH.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
