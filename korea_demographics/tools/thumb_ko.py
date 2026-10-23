"""Thumbnail for the 인구절벽 video (no person -> big headline + falling cliff line). 1280x720 JPG."""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
H = '/home/user/ella/korea_demographics/tools/'
out = sys.argv[1]
W, Hh = 1280, 720
im = Image.new('RGB', (W, Hh), (6, 10, 19))
d = ImageDraw.Draw(im)
# subtle vignette / grid
for y in range(0, Hh, 40):
    d.line([(0, y), (W, y)], fill=(12, 18, 32))
for x in range(0, W, 40):
    d.line([(x, 0), (x, Hh)], fill=(12, 18, 32))
# red glow for the cliff
glow = Image.new('RGB', (W, Hh), (0, 0, 0))
gd = ImageDraw.Draw(glow)
pts = [(560, 250), (820, 270), (900, 285), (980, 440), (1060, 560), (1240, 600)]
gd.line(pts, fill=(255, 59, 71), width=34)
glow = glow.filter(ImageFilter.GaussianBlur(28))
im = Image.blend(im, Image.eval(glow, lambda v: v), 0.0)
im.paste(Image.composite(glow, im, glow.convert('L').point(lambda v: min(255, v * 2))), (0, 0))
d = ImageDraw.Draw(im)
d.line(pts, fill=(255, 70, 80), width=16, joint='curve')
# drop marker
d.ellipse([1240 - 16, 600 - 16, 1240 + 16, 600 + 16], fill=(255, 59, 71))
F = lambda w, s: ImageFont.truetype(H + f'Pretendard-{w}.otf', s)
def shadow_text(xy, s, font, fill, anchor='la', stroke=10):
    x, y = xy
    d.text((x + 6, y + 8), s, font=font, fill=(0, 0, 0), anchor=anchor, stroke_width=stroke, stroke_fill=(0, 0, 0))
    d.text((x, y), s, font=font, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=(0, 0, 0))
shadow_text((60, 90), '한국', F('Black', 120), (255, 255, 255))
shadow_text((60, 230), '인구절벽', F('Black', 170), (255, 59, 71), stroke=12)
shadow_text((60, 440), '일할 사람이', F('ExtraBold', 70), (255, 255, 255))
shadow_text((60, 530), '절반으로 줄어든다', F('ExtraBold', 84), (255, 209, 102))
# chips
def chip(x, y, s, font, bg, fg):
    tw = d.textlength(s, font=font); h = font.size * 1.5
    d.rounded_rectangle([x, y, x + tw + 44, y + h], radius=h / 2, fill=bg)
    d.text((x + 22, y + h / 2), s, font=font, fill=fg, anchor='lm')
chip(820, 640, '출산율 0.7', F('Bold', 36), (255, 59, 71), (255, 255, 255))
chip(1040, 640, '초고령사회', F('Bold', 36), (16, 24, 42), (255, 181, 71))
d.text((W - 30, 30), '지식파노라마', font=F('SemiBold', 30), fill=(200, 210, 230), anchor='ra')
im.save(out, quality=92)
print(out)
