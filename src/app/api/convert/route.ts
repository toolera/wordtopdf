import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.includes('officedocument.wordprocessingml.document') && !file.type.includes('msword')) {
      return NextResponse.json({ error: 'Invalid file type. Please upload a Word document.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    const fontSize = 12;
    const margin = 50;
    const lineHeight = fontSize * 1.2;
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const maxWidth = width - 2 * margin;
    
    let yPosition = height - margin;
    
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (yPosition < margin + lineHeight) {
        page = pdfDoc.addPage();
        yPosition = height - margin;
      }
      
      const words = line.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);
        
        if (textWidth > maxWidth && currentLine) {
          page.drawText(currentLine, {
            x: margin,
            y: yPosition,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          
          yPosition -= lineHeight;
          currentLine = word;
          
          if (yPosition < margin + lineHeight) {
            page = pdfDoc.addPage();
            yPosition = height - margin;
          }
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        page.drawText(currentLine, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
        
        yPosition -= lineHeight;
      }
    }

    const pdfBytes = await pdfDoc.save();
    
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.(docx?|doc)$/i, '.pdf')}"`,
      },
    });
  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json({ error: 'Failed to convert document' }, { status: 500 });
  }
}