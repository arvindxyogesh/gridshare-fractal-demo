#!/usr/bin/env python3
"""
fractal_worker.py - CPU/GPU Mandelbrot renderer
"""

import argparse
import numpy as np
from PIL import Image
import time
import os

def mandelbrot_cpu(xmin, xmax, ymin, ymax, width, height, max_iter):
    """CPU implementation."""
    x = np.linspace(xmin, xmax, width)
    y = np.linspace(ymin, ymax, height)
    img = np.zeros((height, width), dtype=np.uint16)
    
    for i in range(height):
        for j in range(width):
            c = complex(x[j], y[i])
            z = 0.0j
            iter_count = 0
            while abs(z) <= 2.0 and iter_count < max_iter:
                z = z*z + c
                iter_count += 1
            img[i, j] = iter_count
    return img

def mandelbrot_gpu(xmin, xmax, ymin, ymax, width, height, max_iter):
    """GPU implementation using Numba CUDA."""
    try:
        from numba import cuda
        import math
        
        img = np.zeros((height, width), dtype=np.uint16)
        
        @cuda.jit
        def mandelbrot_kernel(xmin, xmax, ymin, ymax, max_iter, width, height, image):
            i, j = cuda.grid(2)
            if i < height and j < width:
                x = xmin + j * (xmax - xmin) / (width - 1)
                y = ymin + i * (ymax - ymin) / (height - 1)
                c = complex(x, y)
                z = 0.0j
                count = 0
                while (z.real*z.real + z.imag*z.imag) <= 4.0 and count < max_iter:
                    z = z*z + c
                    count += 1
                image[i, j] = count

        threadsperblock = (16, 16)
        blockspergrid_x = math.ceil(width / threadsperblock[0])
        blockspergrid_y = math.ceil(height / threadsperblock[1])
        blockspergrid = (blockspergrid_x, blockspergrid_y)

        d_img = cuda.to_device(img)
        mandelbrot_kernel[blockspergrid, threadsperblock](
            xmin, xmax, ymin, ymax, max_iter, width, height, d_img
        )
        d_img.copy_to_host(img)
        return img
    except ImportError:
        print("CUDA not available, falling back to CPU")
        return mandelbrot_cpu(xmin, xmax, ymin, ymax, width, height, max_iter)

def save_image(img, out_file, max_iter):
    """Map iterations to RGB and save image."""
    img_normalized = np.sqrt(img / max_iter) * 255
    img_normalized = np.clip(img_normalized, 0, 255).astype(np.uint8)
    Image.fromarray(img_normalized, mode='L').save(out_file)

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--x_start", type=float, required=True)
    p.add_argument("--x_end", type=float, required=True)
    p.add_argument("--y_start", type=float, required=True)
    p.add_argument("--y_end", type=float, required=True)
    p.add_argument("--width", type=int, default=512)
    p.add_argument("--height", type=int, default=512)
    p.add_argument("--max_iter", type=int, default=1000)
    p.add_argument("--out_file", type=str, default="tile.png")
    p.add_argument("--use_gpu", action="store_true")
    args = p.parse_args()

    t0 = time.time()
    
    if args.use_gpu:
        print(f"[worker] Rendering on GPU: {args.width}x{args.height} tile")
        img = mandelbrot_gpu(args.x_start, args.x_end, args.y_start, args.y_end,
                           args.width, args.height, args.max_iter)
    else:
        print(f"[worker] Rendering on CPU: {args.width}x{args.height} tile")  
        img = mandelbrot_cpu(args.x_start, args.x_end, args.y_start, args.y_end,
                           args.width, args.height, args.max_iter)
    
    save_image(img, args.out_file, args.max_iter)
    render_time = time.time() - t0
    print(f"[worker] Saved {args.out_file} in {render_time:.2f}s "
          f"({args.width*args.height/render_time:.0f} pixels/sec)")

if __name__ == "__main__":
    main()