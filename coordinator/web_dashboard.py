from flask import Flask, send_from_directory, jsonify
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# SUPER SIMPLE ROUTING - This will definitely work

# Landing page at root
@app.route('/')
def landing():
    logger.info("Serving landing page")
    return send_from_directory('/app/frontend', 'landing.html')

# Demo page at /demo  
@app.route('/demo')
def demo():
    logger.info("Serving demo page")
    return send_from_directory('/app/frontend', 'index.html')

# Serve ALL static files from frontend directory
@app.route('/<path:filename>')
def static_files(filename):
    logger.info(f"Serving: {filename}")
    return send_from_directory('/app/frontend', filename)

# Simple API
@app.route('/api/health')
def health():
    return jsonify({"status": "healthy"})

@app.route('/api/status')
def status():
    return jsonify({"workers": ["worker1", "worker2", "worker3", "worker4"], "status": "ready"})

if __name__ == '__main__':
    logger.info("✅ GridShare Coordinator Starting")
    logger.info("📍 Landing: http://localhost:5000/")
    logger.info("🎮 Demo: http://localhost:5000/demo")
    
    # Debug: list available files
    if os.path.exists('/app/frontend'):
        files = os.listdir('/app/frontend')
        logger.info(f"📂 Frontend files: {files}")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
