let pyodide = null;
let originalImageData = null;
let uploadedFile = null;

async function loadPyodideAndPackages() {
  pyodide = await loadPyodide();
  await pyodide.loadPackage('numpy');
  console.log("Pyodide y numpy cargados");
  document.getElementById("clientBtn").disabled = !uploadedFile;
}

loadPyodideAndPackages();

const inputImage = document.getElementById('inputImage');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const serverResult = document.getElementById('serverResult');

const clientBtn = document.getElementById('clientBtn');
const serverBtn = document.getElementById('serverBtn');

const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');

inputImage.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  uploadedFile = file;
  clientBtn.disabled = false;
  serverBtn.disabled = false;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      originalCanvas.width = img.width;
      originalCanvas.height = img.height;
      resultCanvas.width = img.width;
      resultCanvas.height = img.height;

      originalCtx.drawImage(img, 0, 0);
      originalImageData = originalCtx.getImageData(0, 0, img.width, img.height);

      // Ocultar resultados previos
      resultCanvas.style.display = 'none';
      serverResult.style.display = 'none';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

async function runOtsuThresholding(imageData) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  let gray = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  const pyCode = `
import numpy as np

def otsu_threshold(image):
    pixel_counts, bin_edges = np.histogram(image, bins=256, range=(0,255))
    total = image.size
    current_max, threshold = 0, 0
    sum_total = np.dot(np.arange(256), pixel_counts)
    sum_b, weight_b = 0, 0

    for i in range(256):
        weight_b += pixel_counts[i]
        if weight_b == 0:
            continue
        weight_f = total - weight_b
        if weight_f == 0:
            break
        sum_b += i * pixel_counts[i]
        mean_b = sum_b / weight_b
        mean_f = (sum_total - sum_b) / weight_f
        between_var = weight_b * weight_f * (mean_b - mean_f) ** 2
        if between_var > current_max:
            current_max = between_var
            threshold = i
    return threshold

gray = np.array(${JSON.stringify(Array.from(gray))}, dtype=np.uint8)
threshold = otsu_threshold(gray)
result = (gray > threshold) * 255
result.tolist()
`;

  const resultFlat = await pyodide.runPythonAsync(pyCode);

  const resultArray = new Uint8ClampedArray(resultFlat);

  let resultImageData = new ImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    const val = resultArray[i];
    resultImageData.data[i * 4] = val;
    resultImageData.data[i * 4 + 1] = val;
    resultImageData.data[i * 4 + 2] = val;
    resultImageData.data[i * 4 + 3] = 255;
  }

  return resultImageData;
}

// Procesar en cliente
clientBtn.addEventListener('click', async () => {
  if (!originalImageData) {
    alert("Sube una imagen primero");
    return;
  }
  clientBtn.disabled = true;
  serverBtn.disabled = true;
  clientBtn.textContent = "Procesando...";
  const thresholded = await runOtsuThresholding(originalImageData);
  resultCtx.putImageData(thresholded, 0, 0);

  resultCanvas.style.display = 'block';
  serverResult.style.display = 'none';

  clientBtn.textContent = "Procesar Otsu (Python cliente)";
  clientBtn.disabled = false;
  serverBtn.disabled = false;
});

// Procesar en servidor
serverBtn.addEventListener('click', async () => {
  if (!uploadedFile) {
    alert("Sube una imagen primero");
    return;
  }
  clientBtn.disabled = true;
  serverBtn.disabled = true;
  serverBtn.textContent = "Procesando...";

  const formData = new FormData();
  formData.append('image', uploadedFile);

  const response = await fetch('/process_server', {
    method: 'POST',
    body: formData
  });

  if (response.ok) {
    const data = await response.json();
    serverResult.src = 'data:image/png;base64,' + data.result_img;
    serverResult.style.display = 'block';
    resultCanvas.style.display = 'none';
  } else {
    alert('Error al procesar imagen en servidor');
  }

  serverBtn.textContent = "Procesar Otsu (Servidor)";
  clientBtn.disabled = false;
  serverBtn.disabled = false;
});
