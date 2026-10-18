"""Motion graphics for the demo video, drawn with the product's tokens and its zigzag ticket edge."""
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONTS = Path(__file__).resolve().parent.parent / "the-montage" / "sources" / "fonts"
SIZE = (1920, 1080)
FPS = 30

SURFACE = (255, 255, 255)
SURFACE_SUNKEN = (243, 246, 245)
INK = (0, 0, 0)
INK_MUTED = (77, 95, 91)
LINE = (220, 228, 226)
ACCENT = (0, 188, 168)
ACCENT_INK = (0, 133, 119)
ACCENT_WASH = (227, 248, 245)
SHADOW = (11, 31, 28)
TOOTH = 26


def display_font(size: int) -> ImageFont.FreeTypeFont:
    font = ImageFont.truetype(str(FONTS / "Syne.ttf"), size)
    font.set_variation_by_axes([700])
    return font


def body_font(size: int, medium: bool = False) -> ImageFont.FreeTypeFont:
    name = "CooperHewitt-Medium.ttf" if medium else "CooperHewitt-Book.ttf"
    return ImageFont.truetype(str(FONTS / name), size)


def ease_out(progress: float) -> float:
    progress = min(max(progress, 0.0), 1.0)
    return 1 - (1 - progress) ** 3


def ease_in_out(progress: float) -> float:
    progress = min(max(progress, 0.0), 1.0)
    return 3 * progress**2 - 2 * progress**3


def money(cents: float) -> str:
    return f"${cents / 100:,.2f}"


@dataclass(frozen=True)
class Box:
    left: float
    top: float
    right: float
    bottom: float

    def shifted(self, dx: float = 0, dy: float = 0) -> "Box":
        return Box(self.left + dx, self.top + dy, self.right + dx, self.bottom + dy)


def zigzag_polygon(box: Box, top_teeth: bool = True, bottom_teeth: bool = True) -> list[tuple[float, float]]:
    count = max(1, int((box.right - box.left) // TOOTH))
    step = (box.right - box.left) / count
    top = [(box.left + i * step / 2, box.top + (TOOTH / 2 if i % 2 and top_teeth else 0)) for i in range(count * 2 + 1)]
    bottom = [
        (box.left + i * step / 2, box.bottom - (TOOTH / 2 if i % 2 and bottom_teeth else 0))
        for i in range(count * 2, -1, -1)
    ]
    return top + bottom


def draw_shadowed_polygon(frame: Image.Image, polygon: list[tuple[float, float]], fill: tuple, alpha: float = 1.0) -> None:
    shadow = Image.new("L", frame.size, 0)
    ImageDraw.Draw(shadow).polygon([(x, y + 16) for x, y in polygon], fill=int(46 * alpha))
    frame.paste(SHADOW, mask=shadow.filter(ImageFilter.GaussianBlur(22)))
    layer = Image.new("L", frame.size, 0)
    ImageDraw.Draw(layer).polygon(polygon, fill=int(255 * alpha))
    frame.paste(fill, mask=layer)


def fee_ticket(duration: float, tear_at: float, price_cents: int, fee_cents: int, fee_label: str) -> Iterator[Image.Image]:
    """A receipt slides up. At tear_at the fee strip tears off its bottom and the total ticks down."""
    body = Box(660, 250, 1260, 760)
    strip = Box(660, 760, 1260, 880)
    for index in range(round(duration * FPS)):
        seconds = index / FPS
        arrive = ease_out(seconds / 0.45)
        tear = ease_in_out((seconds - tear_at) / 0.55)
        frame = Image.new("RGB", SIZE, SURFACE_SUNKEN)
        lift = (1 - arrive) * 120
        draw_ticket_body(frame, body.shifted(dy=lift), price_cents - fee_cents * tear)
        draw_fee_strip(frame, strip.shifted(dy=lift + tear * 260), fee_label, fee_cents, alpha=(1 - tear) * arrive)
        yield frame


def draw_ticket_body(frame: Image.Image, box: Box, total_cents: float) -> None:
    draw_shadowed_polygon(frame, zigzag_polygon(box, bottom_teeth=False), SURFACE)
    draw = ImageDraw.Draw(frame)
    draw.text((box.left + 56, box.top + 70), "One drink, ordered online", font=body_font(44, medium=True), fill=INK)
    draw.text((box.left + 56, box.top + 200), "The shop keeps", font=body_font(38), fill=INK_MUTED)
    draw.text((box.left + 56, box.top + 400), money(total_cents), font=display_font(150), fill=INK, anchor="ls")


def draw_fee_strip(frame: Image.Image, box: Box, label: str, fee_cents: int, alpha: float) -> None:
    if alpha <= 0.01:
        return
    draw_shadowed_polygon(frame, zigzag_polygon(box, top_teeth=True), SURFACE, alpha)
    text_layer = Image.new("L", SIZE, 0)
    text_draw = ImageDraw.Draw(text_layer)
    text_draw.text((box.left + 56, box.top + 76), label, font=body_font(40, medium=True), fill=255, anchor="ls")
    text_draw.text((box.right - 56, box.top + 76), f"−{fee_cents}¢", font=body_font(40, medium=True), fill=255, anchor="rs")
    frame.paste(INK, mask=text_layer.point(lambda value: int(value * alpha)))


def big_number(duration: float, target: int, prefix: str, suffix: str, label: str) -> Iterator[Image.Image]:
    """A large figure counts up from zero, with one line under it saying what it is."""
    for index in range(round(duration * FPS)):
        progress = ease_out(index / FPS / 1.2)
        frame = Image.new("RGB", SIZE, SURFACE)
        draw = ImageDraw.Draw(frame)
        value = round(target * progress)
        draw.text((960, 560), f"{prefix}{value:,}{suffix}", font=display_font(260), fill=INK, anchor="ms")
        draw.text((960, 680), label, font=body_font(52), fill=INK_MUTED, anchor="ms")
        yield frame


def payoff_tickets(duration: float, price_cents: int, fee_cents: int, extra_cents: int) -> Iterator[Image.Image]:
    """Card ticket on the left, agent ticket on the right; the agent ticket's +extra badge lands last."""
    card_box, agent_box = Box(300, 260, 900, 820), Box(1020, 260, 1620, 820)
    for index in range(round(duration * FPS)):
        seconds = index / FPS
        frame = Image.new("RGB", SIZE, SURFACE_SUNKEN)
        card_in, agent_in = ease_out(seconds / 0.45), ease_out((seconds - 0.5) / 0.45)
        draw_payoff_ticket(frame, card_box.shifted(dy=(1 - card_in) * 100), "Paid by card", price_cents - fee_cents, SURFACE)
        if agent_in > 0:
            box = agent_box.shifted(dy=(1 - agent_in) * 100)
            draw_payoff_ticket(frame, box, "Paid by an agent", price_cents - fee_cents + extra_cents, ACCENT_WASH)
            draw_badge(frame, box, f"+{extra_cents}¢", ease_out((seconds - 1.4) / 0.35))
        yield frame


def draw_payoff_ticket(frame: Image.Image, box: Box, title: str, kept_cents: int, fill: tuple) -> None:
    draw_shadowed_polygon(frame, zigzag_polygon(box), fill)
    draw = ImageDraw.Draw(frame)
    draw.text((box.left + 56, box.top + 90), title, font=body_font(44, medium=True), fill=INK)
    draw.text((box.left + 56, box.top + 230), "The shop keeps", font=body_font(36), fill=INK_MUTED)
    draw.text((box.left + 56, box.top + 400), money(kept_cents), font=display_font(130), fill=INK, anchor="ls")


def draw_badge(frame: Image.Image, box: Box, text: str, progress: float) -> None:
    if progress <= 0:
        return
    font = display_font(round(64 * (0.6 + 0.4 * progress)))
    draw = ImageDraw.Draw(frame)
    center = (box.right - 110, box.top + 236)
    left, top, right, bottom = draw.textbbox(center, text, font=font, anchor="mm")
    draw.rounded_rectangle([left - 30, top - 22, right + 30, bottom + 22], radius=40, fill=ACCENT)
    draw.text(center, text, font=font, fill=INK, anchor="mm")


DANGER = (180, 35, 24)
BAR_GREY = (196, 206, 203)
BAR_WIDTH = 260
BASELINE = 700
FLOOR_CENTS = 500
PIXELS_PER_CENT = 5.6


@dataclass(frozen=True)
class BarStages:
    savings_at: float
    shop_at: float
    fee_at: float


def level(cents: float, grow: float = 1.0) -> float:
    return BASELINE - (cents - FLOOR_CENTS) * PIXELS_PER_CENT * grow


def fade_text(frame: Image.Image, position: tuple, text: str, font, fill: tuple, alpha: float, anchor: str) -> None:
    if alpha <= 0:
        return
    mask = Image.new("L", frame.size, 0)
    ImageDraw.Draw(mask).text(position, text, font=font, fill=255, anchor=anchor)
    frame.paste(fill, mask=mask.point(lambda value: int(value * min(alpha, 1.0))))


def draw_bar_body(frame: Image.Image, x: float, top_cents: float, grow: float) -> None:
    """The grey base, cut off at the bottom with the ticket's zigzag because the scale starts at $5."""
    box = Box(x - BAR_WIDTH / 2, level(top_cents, grow), x + BAR_WIDTH / 2, BASELINE + TOOTH / 2)
    ImageDraw.Draw(frame).polygon(zigzag_polygon(box, top_teeth=False), fill=BAR_GREY)


def draw_card_bar(frame: Image.Image, x: float, kept: int, fee: int, grow: float) -> None:
    draw_bar_body(frame, x, kept, grow)
    ImageDraw.Draw(frame).rectangle([x - BAR_WIDTH / 2, level(kept + fee, grow), x + BAR_WIDTH / 2, level(kept, grow)], fill=DANGER)
    label_y = (level(kept + fee) + level(kept)) / 2
    fade_text(frame, (x - BAR_WIDTH / 2 - 28, label_y), f"−{fee}¢", display_font(60), DANGER, (grow - 0.85) * 7, "rm")


def draw_agent_bar(frame: Image.Image, x: float, card_kept: int, extra: int, grow: float, shop: float, fee: float) -> None:
    total = card_kept + extra
    draw_bar_body(frame, x, card_kept, grow)
    draw = ImageDraw.Draw(frame)
    draw.rectangle([x - BAR_WIDTH / 2, level(total, grow), x + BAR_WIDTH / 2, level(card_kept, grow)], fill=ACCENT)
    if fee > 0:
        top = level(total)
        draw.rectangle([x - BAR_WIDTH / 2, top - 4, x + BAR_WIDTH / 2, top], fill=DANGER)
        fade_text(frame, (x + BAR_WIDTH / 2 + 28, top - 14), "0.001¢", body_font(42, medium=True), DANGER, fee, "lm")
    label_y = (level(total) + level(card_kept)) / 2 + 12
    fade_text(frame, (x + BAR_WIDTH / 2 + 28, label_y), f"+{extra}¢", display_font(60), ACCENT_INK, shop, "lm")


def draw_savings(frame: Image.Image, x: float, card_total: int, agent_total: int, alpha: float) -> None:
    if alpha <= 0:
        return
    top, bottom = level(card_total), level(agent_total)
    wash = tuple(int(255 - (255 - c) * alpha) for c in ACCENT_WASH)
    draw = ImageDraw.Draw(frame)
    draw.rectangle([x - BAR_WIDTH / 2, top, x + BAR_WIDTH / 2, bottom], fill=wash)
    for dash_x in range(int(x - BAR_WIDTH / 2 - 140), int(x + BAR_WIDTH / 2), 20):
        draw.line([(dash_x, top), (dash_x + 10, top)], fill=tuple(int(255 - (255 - c) * alpha) for c in INK_MUTED), width=3)
    fade_text(frame, (x, (top + bottom) / 2), f"−{card_total - agent_total}¢", display_font(60), INK, alpha, "mm")


def draw_bar_labels(frame: Image.Image, x: float, name: str, total_cents: int, alpha: float) -> None:
    fade_text(frame, (x, BASELINE + 90), name, body_font(44, medium=True), INK_MUTED, alpha, "ms")
    fade_text(frame, (x, BASELINE + 160), money(total_cents), display_font(60), INK, alpha, "ms")


def price_bars(duration: float, stages: BarStages, price: int = 600, fee: int = 46, extra: int = 18) -> Iterator[Image.Image]:
    """Card bar against agent bar. The gap on top is what the customer saves, the teal slice is what the shop gains."""
    card_x, agent_x = 780, 1140
    kept = price - fee
    for index in range(round(duration * FPS)):
        seconds = index / FPS
        frame = Image.new("RGB", SIZE, SURFACE)
        card_grow, agent_grow = ease_out(seconds / 0.8), ease_out((seconds - 0.35) / 0.8)
        draw_savings(frame, agent_x, price, kept + extra, ease_out((seconds - stages.savings_at) / 0.5))
        draw_card_bar(frame, card_x, kept, fee, card_grow)
        shop, fee_alpha = ease_out((seconds - stages.shop_at) / 0.4), ease_out((seconds - stages.fee_at) / 0.4)
        draw_agent_bar(frame, agent_x, kept, extra, agent_grow, shop, fee_alpha)
        draw_bar_labels(frame, card_x, "Card", price, card_grow)
        draw_bar_labels(frame, agent_x, "Agent", kept + extra, agent_grow)
        yield frame
