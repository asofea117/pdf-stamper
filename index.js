const express = require('express');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const multer = require('multer');

const app = express();
const upload = multer();

// Using upload.any() ensures multer parses both files and req.body text fields reliably
app.post('/stamp-pdf', upload.any(), async (req, res) => {
  try {
    // Extract files from req.files array
    const pdfFile = req.files.find(f => f.fieldname === 'pdf');
    const sigFile = req.files.find(f => f.fieldname === 'signature');

    if (!pdfFile || !sigFile) {
      return res.status(400).send('Missing required pdf or signature files.');
    }

    const pdfBuffer = pdfFile.buffer;
    const sigBuffer = sigFile.buffer;
    
    // Extract total quantity sent from Apps Script (checks key variations)
    const totalQty = req.body.totalQty || req.body.totalqty || '0.00 UNIT';

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
    const lineY = 270; 

    // 1. Draw horizontal line across page margins
    lastPage.drawLine({
      start: { x: 36, y: lineY },
      end: { x: width - 36, y: lineY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // 2. Draw Total Qty text right below the line
    lastPage.drawText(`Total Qty : ${totalQty}`, {
      x: width - 210, // Shifted left to fit the longer "Total Qty :" label cleanly
      y: lineY - 14, 
      size: 10,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
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
