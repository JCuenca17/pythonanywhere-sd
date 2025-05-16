import os
from flask import Flask, render_template, request, send_file, redirect, url_for
import cv2

app = Flask(__name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload-image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return 'No se envió archivo', 400

    image = request.files['image']
    if image.filename == '':
        return 'Archivo vacío', 400

    image_path = os.path.join(app.config['UPLOAD_FOLDER'], 'uploaded.jpg')
    image.save(image_path)

    # Leer la imagen en escala de grises para Otsu
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return 'Error al leer la imagen', 500

    # Aplicar umbralización Otsu
    _, otsu_img = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    otsu_path = os.path.join(app.config['UPLOAD_FOLDER'], 'otsu.jpg')
    cv2.imwrite(otsu_path, otsu_img)

    # Redirigir a la página principal para mostrar imágenes
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)
