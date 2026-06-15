#!/usr/bin/env python3
"""Generate topic-themed header icons with brand panda badge."""
from __future__ import annotations

import math
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "icons"
AVATAR = ROOT / "public" / "brand-avatar.png"
SIZE = 200


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_pin(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: str) -> None:
    r = 22
    draw.ellipse((cx - r, cy - r - 8, cx + r, cy + r - 8), fill=color)
    draw.polygon([(cx, cy + 30), (cx - 14, cy + 4), (cx + 14, cy + 4)], fill=color)
    draw.ellipse((cx - 8, cy - 8 - 8, cx + 8, cy + 8 - 8), fill="#FFFFFF")


def draw_clock(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: str) -> None:
    r = 28
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill="#FFFFFF", outline=color, width=4)
    draw.line((cx, cy, cx, cy - 16), fill=color, width=4)
    draw.line((cx, cy, cx + 14, cy + 6), fill=color, width=4)


def draw_calendar(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: str) -> None:
    w, h = 52, 48
    x0, y0 = cx - w // 2, cy - h // 2
    draw.rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=8, fill="#FFFFFF", outline=color, width=4)
    draw.rectangle((x0, y0, x0 + w, y0 + 14), fill=color)
    for i, dx in enumerate((12, 26, 40)):
        draw.ellipse((x0 + dx - 3, y0 + 22 + (i % 2) * 12, x0 + dx + 3, y0 + 28 + (i % 2) * 12), fill=color)


def draw_document(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: str) -> None:
    w, h = 44, 56
    x0, y0 = cx - w // 2, cy - h // 2
    draw.rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=6, fill="#FFFFFF", outline=color, width=4)
    for i in range(4):
        draw.line((x0 + 10, y0 + 18 + i * 10, x0 + w - 10, y0 + 18 + i * 10), fill=color, width=3)


def draw_megaphone(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: str) -> None:
    draw.polygon([(cx - 26, cy - 8), (cx + 8, cy - 18), (cx + 8, cy + 18), (cx - 26, cy + 8)], fill=color)
    draw.rectangle((cx + 8, cy - 10, cx + 22, cy + 10), fill=color)
    for i in range(3):
        draw.arc((cx + 18, cy - 22 - i * 6, cx + 42 + i * 8, cy + 22 + i * 6), 300, 60, fill=color, width=3)


def draw_bullhorn(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: str) -> None:
    draw.rounded_rectangle((cx - 30, cy - 18, cx + 10, cy + 18), radius=6, fill=color)
    draw.polygon([(cx + 10, cy - 22), (cx + 34, cy - 8), (cx + 34, cy + 8), (cx + 10, cy + 22)], fill=color)
    draw.ellipse((cx - 38, cy - 10, cx - 22, cy + 10), fill="#FFFFFF", outline=color, width=3)


def draw_headset(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: str) -> None:
    draw.arc((cx - 30, cy - 26, cx + 30, cy + 20), 200, 340, fill=color, width=8)
    draw.rounded_rectangle((cx - 34, cy - 4, cx - 18, cy + 18), radius=6, fill=color)
    draw.rounded_rectangle((cx + 18, cy - 4, cx + 34, cy + 18), radius=6, fill=color)
    draw.rounded_rectangle((cx - 8, cy + 14, cx + 8, cy + 26), radius=4, fill=color)


def draw_check(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: str) -> None:
    draw.ellipse((cx - 30, cy - 30, cx + 30, cy + 30), fill="#FFFFFF", outline=color, width=5)
    draw.line((cx - 12, cy, cx - 2, cy + 14), fill=color, width=6)
    draw.line((cx - 2, cy + 14, cx + 18, cy - 14), fill=color, width=6)


def draw_warning(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: str) -> None:
    draw.polygon([(cx, cy - 32), (cx + 30, cy + 24), (cx - 30, cy + 24)], fill="#FFFFFF", outline=color, width=4)
    draw.line((cx, cy - 10, cx, cy + 6), fill=color, width=5)
    draw.ellipse((cx - 4, cy + 14, cx + 4, cy + 22), fill=color)


def draw_flag(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: str) -> None:
    draw.line((cx - 20, cy - 28, cx - 20, cy + 28), fill=color, width=5)
    draw.polygon([(cx - 20, cy - 28), (cx + 24, cy - 16), (cx - 20, cy - 4)], fill=color)


def draw_wave(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: str) -> None:
    draw.ellipse((cx - 30, cy - 30, cx + 30, cy + 30), fill="#FFFFFF", outline=color, width=4)
    font = load_font(42, bold=True)
    draw.text((cx - 10, cy - 22), "Hi", fill=color, font=font)


TOPICS: dict[str, dict] = {
    "welcome": {"bg": "#D32F2F", "ring": "#FFCDD2", "draw": None, "label": "HR"},
    "attendance": {"bg": "#D32F2F", "ring": "#FFCDD2", "draw": "clock", "label": "TIME"},
    "checkin_in": {"bg": "#06C755", "ring": "#B9F6CA", "draw": "pin", "label": "IN"},
    "checkout": {"bg": "#1E6FD9", "ring": "#BBDEFB", "draw": "flag", "label": "OUT"},
    "already_checked_in": {"bg": "#059669", "ring": "#A7F3D0", "draw": "check", "label": "OK"},
    "not_checked_in": {"bg": "#F59E0B", "ring": "#FDE68A", "draw": "warning", "label": "!"},
    "already_checked_out": {"bg": "#6366F1", "ring": "#C7D2FE", "draw": "flag", "label": "END"},
    "leave": {"bg": "#1E6FD9", "ring": "#BBDEFB", "draw": "calendar", "label": "LEAVE"},
    "document": {"bg": "#7B1FA2", "ring": "#E1BEE7", "draw": "document", "label": "DOC"},
    "complaint": {"bg": "#F57C00", "ring": "#FFE0B2", "draw": "megaphone", "label": "TALK"},
    "announcement": {"bg": "#00897B", "ring": "#B2DFDB", "draw": "bullhorn", "label": "NEWS"},
    "contact_hr": {"bg": "#5C6BC0", "ring": "#C5CAE9", "draw": "headset", "label": "HR"},
    "not_registered": {"bg": "#EF4444", "ring": "#FECACA", "draw": "warning", "label": "!"},
    "menu_hint": {"bg": "#D32F2F", "ring": "#FFCDD2", "draw": "wave", "label": "Hi"},
    "checkin_success": {"bg": "#06C755", "ring": "#B9F6CA", "draw": "check", "label": "IN"},
    "checkout_success": {"bg": "#1E6FD9", "ring": "#BBDEFB", "draw": "flag", "label": "OUT"},
}


def render_icon(topic: str, spec: dict) -> Image.Image:
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    bg = hex_rgb(spec["bg"])
    ring = hex_rgb(spec["ring"])

    # outer ring
    draw.ellipse((8, 8, SIZE - 8, SIZE - 8), fill=ring)
    draw.ellipse((18, 18, SIZE - 18, SIZE - 18), fill=bg)

    cx, cy = SIZE // 2, SIZE // 2 - 6
    kind = spec.get("draw")
    color = "#FFFFFF"
    if kind == "pin":
        draw_pin(draw, cx, cy, color)
    elif kind == "clock":
        draw_clock(draw, cx, cy, color)
    elif kind == "calendar":
        draw_calendar(draw, cx, cy, color)
    elif kind == "document":
        draw_document(draw, cx, cy, color)
    elif kind == "megaphone":
        draw_megaphone(draw, cx, cy, color)
    elif kind == "bullhorn":
        draw_bullhorn(draw, cx, cy, color)
    elif kind == "headset":
        draw_headset(draw, cx, cy, color)
    elif kind == "check":
        draw_check(draw, cx, cy, color)
    elif kind == "warning":
        draw_warning(draw, cx, cy, color)
    elif kind == "flag":
        draw_flag(draw, cx, cy, color)
    elif kind == "wave":
        draw_wave(draw, cx, cy, color)
    elif topic == "welcome":
        logo = Image.open(AVATAR).convert("RGBA").resize((96, 96), Image.Resampling.LANCZOS)
        img.paste(logo, (52, 44), logo)
    else:
        font = load_font(28, bold=True)
        label = spec.get("label", "")
        bbox = draw.textbbox((0, 0), label, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((cx - tw // 2, cy - th // 2), label, fill=color, font=font)

    # brand panda badge
    if AVATAR.exists() and topic != "welcome":
        badge = Image.open(AVATAR).convert("RGBA").resize((52, 52), Image.Resampling.LANCZOS)
        mask = Image.new("L", (52, 52), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, 52, 52), fill=255)
        badge.putalpha(mask)
        badge_bg = Image.new("RGBA", (58, 58), (255, 255, 255, 255))
        badge_bg_draw = ImageDraw.Draw(badge_bg)
        badge_bg_draw.ellipse((0, 0, 58, 58), fill=(255, 255, 255, 255))
        img.paste(badge_bg, (SIZE - 64, SIZE - 64), badge_bg)
        img.paste(badge, (SIZE - 61, SIZE - 61), badge)

    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for topic, spec in TOPICS.items():
        out = OUT / f"{topic}.png"
        icon = render_icon(topic, spec)
        icon.save(out, optimize=True)
        print(f"saved {out.name} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
