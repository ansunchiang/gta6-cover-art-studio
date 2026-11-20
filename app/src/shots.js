// Capture uses the studio's PNG export. JPEG encoding and scaling only adapt it
// to the bounty's byte and dimension limits.
export async function prepareShot(mode, exportPNG) {
  if (mode === 'cover') {
    document.body.classList.add('shot-cover');
    window.captureCover = async (maxSide = 1280, quality = .86) => {
      const image = await createImageBitmap(await exportPNG());
      try {
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const print = Object.assign(document.createElement('canvas'), {
          width: Math.round(image.width * scale),
          height: Math.round(image.height * scale),
        });
        const ctx = print.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, print.width, print.height);
        return print.toDataURL('image/jpeg', quality);
      } finally {
        image.close();
      }
    };
  }
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
