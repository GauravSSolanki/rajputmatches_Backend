const fs = require("fs-extra");
const { createCanvas, loadImage } = require("canvas");

const convertImageToBase64 = async (imagePath, { maxWidth = 800, maxHeight = 800, quality = 0.8 } = {}) => {
  const image = await loadImage(imagePath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, image.width, image.height);

  let width = image.width;
  let height = image.height;

  if (width > maxWidth || height > maxHeight) {
    const aspectRatio = width / height;
    if (width > height) {
      width = maxWidth;
      height = Math.round(maxWidth / aspectRatio);
    } else {
      height = maxHeight;
      width = Math.round(maxHeight * aspectRatio);
    }
  }

  const resizedCanvas = createCanvas(width, height);
  const resizedCtx = resizedCanvas.getContext("2d");
  resizedCtx.drawImage(canvas, 0, 0, width, height);

  return resizedCanvas.toDataURL("image/jpeg", quality);
};

const convertUploadedFilesToBase64 = async (uploadedFiles) => {
  const results = [];
  for (const file of uploadedFiles) {
    const base64 = await convertImageToBase64(file.path);
    fs.unlinkSync(file.path);
    results.push(base64);
  }
  return results;
};

module.exports = { convertImageToBase64, convertUploadedFilesToBase64 };
