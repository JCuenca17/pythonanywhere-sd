from flask import Flask, render_template, request, jsonify
import numpy as np
import cv2
import io
import base64
from PIL import Image

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process_server', methods=['POST'])
def process_server():
    file = request.files.get('image')
    if not file:
        return jsonify({'error': 'No image uploaded'}), 400

    file_bytes = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if img is None:
        return jsonify({'error': 'Invalid image'}), 400

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, otsu_img = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    pil_img = Image.fromarray(otsu_img)
    buffered = io.BytesIO()
    pil_img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()

    return jsonify({'result_img': img_str})

if __name__ == "__main__":
    app.run()
