#!/usr/bin/env python3
"""
Standalone coordinator for headless operation
"""

import argparse
import requests
import numpy as np
from PIL import Image
import base64, time, io
from concurrent.futures import ThreadPoolExecutor

def decode_image(b64str):
    img = Image.open(io.BytesIO(base64.b64decode(b64str)))
    return np.array(img)

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--workers", required=True, help="File with worker URLs")
    p.add_argument("--width", type=int, default=1024)
    p.add_argument("--height", type=int, default=1024)
    p.add_argument("--tiles", type=int, default=4)
    p.add_argument("--max_iter", type=int, default=1000)
    p.add_argument("--use_gpu", action="store_true")
    args = p.parse_args()

    with open(args.workers) as f:
        workers = [l.strip() for l in f if l.strip()]
    
    print(f"Using {len(workers)} workers: {workers}")

    xmin, xmax = -2.0, 1.0
    ymin, ymax = -1.5, 1.5
    dx = (xmax - xmin) / args.tiles
    dy = (ymax - ymin) / args.tiles
    tile_w = args.width // args.tiles
    tile_h = args.height // args.tiles

    t0 = time.time()
    images = np.zeros((args.height, args.width), dtype=np.uint8)

    tiles = []
    for i in range(args.tiles):
        for j in range(args.tiles):
            x0 = xmin + j * dx
            x1 = x0 + dx
            y0 = ymin + i * dy
            y1 = y0 + dy
            tiles.append((i, j, x0, x1, y0, y1))

    def render_tile(worker, i, j, x0, x1, y0, y1):
        payload = {
            "x_start": x0, "x_end": x1, "y_start": y0, "y_end": y1,
            "width": tile_w, "height": tile_h,
            "max_iter": args.max_iter, "use_gpu": args.use_gpu
        }
        r = requests.post(f"{worker}/render", json=payload, timeout=600)
        r.raise_for_status()
        data = r.json()
        img = decode_image(data["image_b64"])
        print(f"Tile ({i},{j}) completed in {data['runtime_s']}s")
        return i, j, img

    results = []
    with ThreadPoolExecutor(max_workers=len(workers)) as ex:
        futs = []
        for idx, tile in enumerate(tiles):
            worker = workers[idx % len(workers)]
            futs.append(ex.submit(render_tile, worker, *tile))
        for f in futs:
            results.append(f.result())

    for i, j, img in results:
        y0, y1 = i * tile_h, (i + 1) * tile_h
        x0, x1 = j * tile_w, (j + 1) * tile_w
        images[y0:y1, x0:x1] = img

    Image.fromarray(images).save("fractal_result.png")
    total_time = time.time() - t0
    print(f"Saved fractal_result.png in {total_time:.2f}s")
    print(f"Performance: {args.width * args.height / total_time:.0f} pixels/sec")

if __name__ == "__main__":
    main()