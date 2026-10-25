from PIL import Image, ImageDraw

SIZE = 1024
cx = cy = SIZE // 2

# ---- 背景：深靛蓝径向渐变 ----
outer = (13, 13, 26)      # 边缘近黑
inner = (42, 42, 92)      # 中心靛蓝
img = Image.new("RGB", (SIZE, SIZE), outer)
d = ImageDraw.Draw(img)
maxr = SIZE // 2
for r in range(maxr, 0, -1):
    t = r / maxr
    col = tuple(int(outer[i] + (inner[i] - outer[i]) * (1 - t)) for i in range(3))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)

# ---- 颜色 ----
gold = (212, 175, 55)       # #D4AF37
charcoal = (35, 35, 46)     # #23232E
white = (242, 239, 230)     # #F2EFE6

R = 332
ring_w = 16

# 金色圆环（先画外金圆盘，再在上面画太极，露出一圈金边）
d.ellipse([cx - (R + ring_w), cy - (R + ring_w), cx + (R + ring_w), cy + (R + ring_w)], fill=gold)

# ---- 太极（阴阳）----
big = [cx - R, cy - R, cx + R, cy + R]
# 整圆 = 炭黑
d.ellipse(big, fill=charcoal)
# 右半 = 白
d.pieslice(big, 270, 90, fill=white)
# 上半小圆（半径 R/2，中心 (cx, cy-R/2)）的下半 = 炭黑
top = [cx - R // 2, cy - R, cx + R // 2, cy]
d.pieslice(top, 0, 180, fill=charcoal)
# 下半小圆（中心 (cx, cy+R/2)）的上半 = 白
bot = [cx - R // 2, cy, cx + R // 2, cy + R]
d.pieslice(bot, 180, 360, fill=white)

# 鱼眼
rd = R // 9
d.ellipse([cx - rd, cy - R // 2 - rd, cx + rd, cy - R // 2 + rd], fill=white)
d.ellipse([cx - rd, cy + R // 2 - rd, cx + rd, cy + R // 2 + rd], fill=charcoal)

# 细微高光：在金环外再描一圈更亮的金，增强质感
hl = (232, 200, 110)
d.ellipse([cx - (R + ring_w + 4), cy - (R + ring_w + 4),
           cx + (R + ring_w + 4), cy + (R + ring_w + 4)], outline=hl, width=3)

out = r"C:\Users\hao_k\WorkBuddy\2026-06-16-19-48-02\bazi-ui\src-tauri\icons\haoshu_source.png"
img.save(out)
print("saved", out, img.size)
