"""Synthetic tracking test clips with exact truth.
   python3 tracking_clips.py <photo.jpg> <out-dir>
   Writes push.webm / push.json (hand-held push-in: similarity + shake) and plane.webm / plane.json
   (perspective orbit). Each .json holds the 3x3 source->frame homography of every frame (960x540, 30 fps).
   The photo is resized to 2400x1350; the push-in heads for source point (1817, 772) - change `obj` for another photo."""
import json, math, os, subprocess, sys, numpy as np
from PIL import Image
D = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else 'dev-out')
os.makedirs(D, exist_ok=True)
src = Image.open(sys.argv[1]).convert('RGB').resize((2400, 1350))
SW, SH = src.size; W, H = 960, 540; N = 90
rng = np.random.default_rng(3)
def noise(n, freqs):
    out = np.zeros(n)
    for f, a in freqs:
        ph = rng.uniform(0, 2*math.pi); out += a*np.sin(2*math.pi*f*np.arange(n)/30 + ph)
    return out
def solveH(s, d):
    A = []; b = []
    for (x, y), (u, v) in zip(s, d):
        A.append([x, y, 1, 0, 0, 0, -u*x, -u*y]); b.append(u)
        A.append([0, 0, 0, x, y, 1, -v*x, -v*y]); b.append(v)
    h = np.linalg.solve(np.array(A, float), np.array(b, float))
    return np.append(h, 1).reshape(3, 3)
def render(name, Hs):
    fr = D + '/' + name; os.makedirs(fr, exist_ok=True)
    for k, Hk in enumerate(Hs):
        Hi = np.linalg.inv(Hk); Hi = Hi / Hi[2, 2]
        im = src.transform((W, H), Image.PERSPECTIVE, tuple(Hi.flatten()[:8]), Image.BICUBIC)
        im.save(f'{fr}/{k:03d}.png')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', f'{fr}/%03d.png', '-c:v', 'libvpx-vp9', '-b:v', '6M', '-pix_fmt', 'yuv420p', f'{D}/{name}.webm'], check=True)
    json.dump([h.tolist() for h in Hs], open(f'{D}/{name}.json', 'w'))
# A: handheld push-in toward the round sticker on the tram (similarity + shake)
obj = np.array([1817., 772.])
sx, sy = noise(N, [(0.7, 9), (2.3, 4), (6.1, 1.5)]), noise(N, [(0.5, 7), (1.9, 4), (5.3, 1.5)])
rot = noise(N, [(0.6, 0.8), (2.7, 0.35)])
Hs = []
for k in range(N):
    t = k/(N-1); e = t*t*(3-2*t)
    z = 0.42*(1 + 1.6*e)
    c = (1-e)*np.array([1200., 675.]) + e*(obj + [0, -60])
    a = math.radians(rot[k]); ca, sa = math.cos(a), math.sin(a)
    Hs.append(np.array([[z*ca, -z*sa, W/2 + sx[k] - z*(ca*c[0] - sa*c[1])],
                        [z*sa,  z*ca, H/2 + sy[k] - z*(sa*c[0] + ca*c[1])], [0, 0, 1]]))
render('push', Hs)
# B: perspective plane (orbit around the tram side), image corners -> moving quad
Hs = []
for k in range(N):
    t = k/(N-1); e = math.sin(math.pi*(t - 0.5))
    dy = 70*e; dx = 60*e
    q = [(-200 + dx, -110 - dy), (1160 + dx, -110 + dy), (1160 + dx, 650 - dy), (-200 + dx, 650 + dy)]
    q = [(x + 4*math.sin(k*0.9), y + 3*math.cos(k*1.3)) for x, y in q]
    Hs.append(solveH([(0, 0), (SW, 0), (SW, SH), (0, SH)], q))
render('plane', Hs)
