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
        // Turkish characters
        .replace(/İ/g, 'I').replace(/ı/g, 'i')
        .replace(/Ş/g, 'S').replace(/ş/g, 's')
        .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
        .replace(/Ü/g, 'U').replace(/ü/g, 'u')
        .replace(/Ö/g, 'O').replace(/ö/g, 'o')
        .replace(/Ç/g, 'C').replace(/ç/g, 'c')
        // Azerbaijani characters
        .replace(/Ə/g, 'E').replace(/ə/g, 'e')
        // Smart quotes and typography
        .replace(/[""„‚]/g, '"')
        .replace(/[''‚']/g, "'")
        .replace(/[—–−]/g, '-')
        .replace(/[…]/g, '...')
        // Currency and symbols
        .replace(/[€₺£¥¢]/g, '$')
        .replace(/[™®©]/g, '')
        // Mathematical symbols
        .replace(/[×]/g, 'x')
        .replace(/[÷]/g, '/')
        .replace(/[±]/g, '+/-')
        .replace(/[≤]/g, '<=')
        .replace(/[≥]/g, '>=')
        .replace(/[≠]/g, '!=')
        // Common accented characters
        .replace(/[ÀÁÂÃÄÅ]/g, 'A').replace(/[àáâãäå]/g, 'a')
        .replace(/[ÈÉÊË]/g, 'E').replace(/[èéêë]/g, 'e')
        .replace(/[ÌÍÎÏ]/g, 'I').replace(/[ìíîï]/g, 'i')
        .replace(/[ÒÓÔÕÖ]/g, 'O').replace(/[òóôõö]/g, 'o')
        .replace(/[ÙÚÛÜ]/g, 'U').replace(/[ùúûü]/g, 'u')
        .replace(/[ÝŸ]/g, 'Y').replace(/[ýÿ]/g, 'y')
        .replace(/[Ñ]/g, 'N').replace(/[ñ]/g, 'n')
        .replace(/[Ç]/g, 'C').replace(/[ç]/g, 'c')
        // Germanic characters
        .replace(/[ß]/g, 'ss')
        .replace(/[Æ]/g, 'AE').replace(/[æ]/g, 'ae')
        .replace(/[Ø]/g, 'O').replace(/[ø]/g, 'o')
        // Slavic characters
        .replace(/[АÁBCČDÉFGHÍJKLMNÓPQRSŠTÚVWXYŽЗ]/g, function(char) {
          const map: {[key: string]: string} = {
            'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E',
            'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
            'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
            'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
            'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
          };
          return map[char] || char;
        })
        // Final cleanup: remove any character with code > 255
        .split('')
        .map(char => char.charCodeAt(0) > 255 ? '?' : char)
        .join('')
        // Clean up multiple spaces and question marks
        .replace(/\?+/g, '?')
        .replace(/  +/g, ' ')
        .trim();
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