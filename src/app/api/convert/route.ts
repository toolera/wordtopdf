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
    const buffer = Buffer.from(arrayBuffer);
    
    const result = await mammoth.extractRawText({ buffer });
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
    
    // Function to sanitize text for Helvetica font
    const sanitizeText = (text: string): string => {
      return text
        .replace(/İ/g, 'I')  // Turkish capital I with dot
        .replace(/ı/g, 'i')  // Turkish lowercase i without dot
        .replace(/Ş/g, 'S')  // Turkish S with cedilla
        .replace(/ş/g, 's')  // Turkish s with cedilla
        .replace(/Ğ/g, 'G')  // Turkish G with breve
        .replace(/ğ/g, 'g')  // Turkish g with breve
        .replace(/Ü/g, 'U')  // Turkish U with diaeresis
        .replace(/ü/g, 'u')  // Turkish u with diaeresis
        .replace(/Ö/g, 'O')  // Turkish O with diaeresis
        .replace(/ö/g, 'o')  // Turkish o with diaeresis
        .replace(/Ç/g, 'C')  // Turkish C with cedilla
        .replace(/ç/g, 'c')  // Turkish c with cedilla
        // Replace other common problematic Unicode characters
        .replace(/[""]/g, '"')  // Smart quotes
        .replace(/['']/g, "'")  // Smart apostrophes
        .replace(/[—–]/g, '-')  // Em dash and en dash
        .replace(/[…]/g, '...')  // Ellipsis
        .replace(/[™®©]/g, '')  // Trademark, registered, copyright symbols
        // Remove any other characters that can't be encoded
        .replace(/[^\x00-\x7F\u00A0-\u00FF]/g, '?');
    };
    
    const lines = sanitizeText(text).split('\n');
    
    for (const line of lines) {
      if (yPosition < margin + lineHeight) {
        page = pdfDoc.addPage();
        yPosition = height - margin;
      }
      
      const words = line.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        
        try {
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
        } catch (encodingError) {
          // If there's still an encoding error, skip this word
          console.warn('Encoding error for word:', word, encodingError instanceof Error ? encodingError.message : 'Unknown encoding error');
          continue;
        }
      }
      
      if (currentLine) {
        try {
          page.drawText(currentLine, {
            x: margin,
            y: yPosition,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          
          yPosition -= lineHeight;
        } catch (encodingError) {
          console.warn('Encoding error for line:', currentLine, encodingError instanceof Error ? encodingError.message : 'Unknown encoding error');
        }
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