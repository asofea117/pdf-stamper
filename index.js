const express = require('express');
const { PDFDocument } = require('pdf-lib');
const multer = require('multer');

const app = express();
const upload = multer();

app.post('/stamp-pdf', upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'signature', maxCount: 1 }
]), async (req, res) => {
  try {
    const pdfBuffer = req.files['pdf'][0].buffer;
    const sigBuffer = req.files['signature'][0].buffer;

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const sigImage = await pdfDoc.embedPng(sigBuffer);

    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];

    // Scale image proportionally to fit target width while keeping true aspect ratio
    const targetWidth = 523; // Max width on page
    const sigDims = sigImage.scale(targetWidth / sigImage.width);

    // Position coordinates (in points, 72 points = 1 inch)
    const xPosition = 36;   
    const yPosition = 15;   

    lastPage.drawImage(sigImage, {
      x: xPosition,
      y: yPosition,
      width: sigDims.width,
      height: sigDims.height,
    });

    const modifiedPdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(modifiedPdfBytes));

  } catch (error) {
    console.error('Stamping Error:', error);
    res.status(500).send('Error processing PDF signature stamping.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
