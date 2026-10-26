"""Deterministic capture of the Speak City demo to MP4 (1080x1920, 30 fps), no screen recording needed.
usage:  python3 capture.py "mode=cta-score&lang=es" out.mp4 [max_seconds]
        python3 capture.py "mode=cta-drill" snaps/ 1.0,2.5,4.0      -> JPEG stills at those seconds
Needs: pip install playwright && playwright install chromium ; ffmpeg on PATH.
"""
import sys, os, base64, subprocess, http.server, threading, functools
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); FPS = 30
q, out = sys.argv[1], sys.argv[2]; arg3 = sys.argv[3] if len(sys.argv) > 3 else '40'
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT); H.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 540, 'height': 960})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{port}/index.html?capture=1&{q}'); pg.wait_for_function('window.__ready===true', timeout=60000)
    grab = lambda: base64.b64decode(pg.evaluate('grab(.92)').split(',')[1])
    if out.endswith('/'):
        os.makedirs(out, exist_ok=True); times = [float(x) for x in arg3.split(',')]; t = 0.0; i = 0
        for ts in times:
            while t < ts - 1e-6: pg.evaluate('stepFrame(1/30)'); t += 1 / FPS
            open(os.path.join(out, f"{q.replace('&','_').replace('=','-')}_{ts:05.2f}.jpg"), 'wb').write(grab())
    else:
        f = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', str(FPS), '-c:v', 'mjpeg', '-i', '-',
                              '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', out], stdin=subprocess.PIPE)
        for i in range(int(float(arg3) * FPS)):
            pg.evaluate('stepFrame(1/30)'); f.stdin.write(grab())
            if pg.evaluate('window.__done===true'): break
        for _ in range(6): pg.evaluate('stepFrame(1/30)'); f.stdin.write(grab())
        f.stdin.close(); f.wait()
    if errs: print('PAGE ERRORS:', errs)
    b.close()
srv.shutdown()
