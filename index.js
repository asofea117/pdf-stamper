const express = require('express');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const multer = require('multer');

const app = express();
const upload = multer();

app.post('/stamp-pdf', upload.any(), async (req, res) => {
  try {
    const pdfFile = req.files ? req.files.find(f => f.fieldname === 'pdf') : null;
    const sigFile = req.files ? req.files.find(f => f.fieldname === 'signature') : null;

    if (!pdfFile || !sigFile) {
      console.error('Missing files:', { pdfReceived: !!pdfFile, sigReceived: !!sigFile });
      return res.status(400).send('Missing required pdf or signature files.');
    }

    const pdfBuffer = pdfFile.buffer;
    const sigBuffer = sigFile.buffer;
    
    const totalQty = req.body.totalQty || req.body.totalqty || '0.00 UNIT';

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // --- TRY PNG EMBED FIRST, FALLBACK TO JPG ---
    let sigImage;
    try {
      sigImage = await pdfDoc.embedPng(sigBuffer);
    } catch (pngErr) {
      try {
        sigImage = await pdfDoc.embedJpg(sigBuffer);
      } catch (jpgErr) {
        throw new Error('Signature image must be a valid PNG or JPG file.');
      }
    }

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width } = lastPage.getSize();

    const targetWidth = 523;
    const sigDims = sigImage.scale(targetWidth / sigImage.width);

    const xPosition = 36;   
    const yPosition = 81;

    const lineY = 270; 

    lastPage.drawLine({
      start: { x: 36, y: lineY },
      end: { x: width - 36, y: lineY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    lastPage.drawText(`Total Qty : ${totalQty}`, {
      x: width - 210, 
      y: lineY - 14, 
      size: 10,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

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
    // LOG THE ACTUAL ERROR TO RENDER CONSOLE
    console.error('Detailed Stamping Error:', error.stack || error);
    res.status(500).send(`Error processing PDF signature stamping: ${error.message}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
