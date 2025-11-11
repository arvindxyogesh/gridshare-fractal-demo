#!/usr/bin/env python3
"""
worker_server.py - GridShare Fractal Worker HTTP API
"""

from flask import Flask, request, jsonify
import base64, os, subprocess, uuid, time, logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route("/health", methods=["GET"])
def health():
    gpu_id = os.getenv("GPU_ID", "cpu-worker")
    return jsonify({
        "status": "healthy", 
        "gpu": gpu_id,
        "service": "gridshare-fractal-worker"
    })

@app.route("/render", methods=["POST"])
def render():
    job = request.get_json()
    job_id = str(uuid.uuid4())[:8]
    
    # Extract parameters
    x_start = float(job["x_start"])
    x_end = float(job["x_end"])
    y_start = float(job["y_start"])
    y_end = float(job["y_end"])
    width = int(job.get("width", 512))
    height = int(job.get("height", 512))
    max_iter = int(job.get("max_iter", 1000))
    use_gpu = bool(job.get("use_gpu", False))
    
    out_file = f"/tmp/fractal_tile_{job_id}.png"
    
    # Build command
    gpu_flag = "--use_gpu" if use_gpu else ""
    cmd = (
        f"python3 fractal_worker.py "
        f"--x_start {x_start} --x_end {x_end} "
        f"--y_start {y_start} --y_end {y_end} "
        f"--width {width} --height {height} "
        f"--max_iter {max_iter} {gpu_flag} --out_file {out_file}"
    )

    logger.info(f"Job {job_id}: Rendering {width}x{height} tile "
                f"({x_start:.3f},{y_start:.3f}) to ({x_end:.3f},{y_end:.3f})")
    
    t0 = time.time()
    
    try:
        # Execute rendering
        result = subprocess.run(cmd, shell=True, check=True, 
                              capture_output=True, text=True)
        
        # Read and encode image
        with open(out_file, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode()
        
        # Cleanup
        os.remove(out_file)
        
        runtime = time.time() - t0
        logger.info(f"Job {job_id}: Completed in {runtime:.2f}s")
        
        return jsonify({
            "job_id": job_id,
            "runtime_s": round(runtime, 2),
            "image_b64": img_b64,
            "tile_size": f"{width}x{height}",
            "iterations": max_iter
        })
        
    except subprocess.CalledProcessError as e:
        logger.error(f"Job {job_id}: Render failed - {e}")
        return jsonify({"error": "Render failed", "details": str(e)}), 500
    except Exception as e:
        logger.error(f"Job {job_id}: Unexpected error - {e}")
        return jsonify({"error": "Unexpected error", "details": str(e)}), 500

if __name__ == "__main__":
    logger.info("Starting GridShare Fractal Worker")
    app.run(host="0.0.0.0", port=8000, debug=False)