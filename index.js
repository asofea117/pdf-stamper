const express = require('express');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
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
    
    // Total quantity string sent from Apps Script (e.g., "548.00 UNIT")
    const totalQty = req.body.totalQty || '';

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const sigImage = await pdfDoc.embedPng(sigBuffer);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width } = lastPage.getSize();

    // Scale image proportionally
    const targetWidth = 523;
    const sigDims = sigImage.scale(targetWidth / sigImage.width);

    // Signature stamp placement
    const xPosition = 36;   
    const yPosition = 15;   

    // --- DRAW LINE AND TOTAL QTY ABOVE STAMP ZONE ---
    // Raised lineY to 270 so it sits ABOVE "Goods Received in Good Condition and Order"
    const lineY = 270; 

    // 1. Draw horizontal line across page margins
    lastPage.drawLine({
      start: { x: 36, y: lineY },
      end: { x: width - 36, y: lineY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // 2. Draw Total Qty text right above the line
    if (totalQty) {
      lastPage.drawText(`Total : ${totalQty}`, {
        x: width - 180,
        y: lineY + 8,
        size: 10,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });
    }
    // ------------------------------------------------

    // Draw the signature/stamp image below the line
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
