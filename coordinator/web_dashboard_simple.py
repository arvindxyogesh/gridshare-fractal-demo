from flask import Flask, send_from_directory
import os

app = Flask(__name__)

@app.route('/')
def landing():
    frontend_path = '/app/frontend'
    if os.path.exists(frontend_path):
        files = os.listdir(frontend_path)
        return f"""
        <h1>Debug Info</h1>
        <p>Frontend path exists: {os.path.exists(frontend_path)}</p>
        <p>Files in frontend: {files}</p>
        <p><a href="/landing.html">Try landing.html directly</a></p>
        <p><a href="/index.html">Try index.html directly</a></p>
        """
    return "Frontend not found"

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('/app/frontend', path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
