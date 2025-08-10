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
    
    // Function to sanitize text for Helvetica font - must ensure all chars are <= 255
    const sanitizeText = (text: string): string => {
      // First, log problematic characters for debugging
      const problematicChars = [];
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        if (charCode > 255) {
          problematicChars.push({ char: text[i], code: charCode, index: i });
        }
      }
      if (problematicChars.length > 0) {
        console.log('Found problematic characters:', problematicChars.slice(0, 10)); // Log first 10
      }

      // Apply all character replacements
      let result = text
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
        // Germanic characters
        .replace(/[ß]/g, 'ss')
        .replace(/[Æ]/g, 'AE').replace(/[æ]/g, 'ae')
        .replace(/[Ø]/g, 'O').replace(/[ø]/g, 'o')
        // More comprehensive cleanup
        .normalize('NFD') // Decompose combined characters
        .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
        .normalize('NFC'); // Recompose

      // FINAL SAFETY: Replace ANY character > 255 with ASCII equivalent or ?
      result = result
        .split('')
        .map(char => {
          const code = char.charCodeAt(0);
          if (code <= 255) {
            return char;
          }
          // Try to find ASCII equivalent for common characters
          if (code >= 0x0100 && code <= 0x017F) { // Latin Extended-A
            const latinMap: {[key: string]: string} = {
              'Ā': 'A', 'ā': 'a', 'Ă': 'A', 'ă': 'a', 'Ą': 'A', 'ą': 'a',
              'Ć': 'C', 'ć': 'c', 'Ĉ': 'C', 'ĉ': 'c', 'Ċ': 'C', 'ċ': 'c', 'Č': 'C', 'č': 'c',
              'Ď': 'D', 'ď': 'd', 'Đ': 'D', 'đ': 'd',
              'Ē': 'E', 'ē': 'e', 'Ĕ': 'E', 'ĕ': 'e', 'Ė': 'E', 'ė': 'e', 'Ę': 'E', 'ę': 'e', 'Ě': 'E', 'ě': 'e',
              'Ĝ': 'G', 'ĝ': 'g', 'Ğ': 'G', 'ğ': 'g', 'Ġ': 'G', 'ġ': 'g', 'Ģ': 'G', 'ģ': 'g',
              'Ĥ': 'H', 'ĥ': 'h', 'Ħ': 'H', 'ħ': 'h',
              'Ĩ': 'I', 'ĩ': 'i', 'Ī': 'I', 'ī': 'i', 'Ĭ': 'I', 'ĭ': 'i', 'Į': 'I', 'į': 'i', 'İ': 'I', 'ı': 'i',
              'Ĵ': 'J', 'ĵ': 'j',
              'Ķ': 'K', 'ķ': 'k',
              'Ĺ': 'L', 'ĺ': 'l', 'Ļ': 'L', 'ļ': 'l', 'Ľ': 'L', 'ľ': 'l', 'Ŀ': 'L', 'ŀ': 'l', 'Ł': 'L', 'ł': 'l',
              'Ń': 'N', 'ń': 'n', 'Ņ': 'N', 'ņ': 'n', 'Ň': 'N', 'ň': 'n',
              'Ō': 'O', 'ō': 'o', 'Ŏ': 'O', 'ŏ': 'o', 'Ő': 'O', 'ő': 'o',
              'Ŕ': 'R', 'ŕ': 'r', 'Ŗ': 'R', 'ŗ': 'r', 'Ř': 'R', 'ř': 'r',
              'Ś': 'S', 'ś': 's', 'Ŝ': 'S', 'ŝ': 's', 'Ş': 'S', 'ş': 's', 'Š': 'S', 'š': 's',
              'Ţ': 'T', 'ţ': 't', 'Ť': 'T', 'ť': 't', 'Ŧ': 'T', 'ŧ': 't',
              'Ũ': 'U', 'ũ': 'u', 'Ū': 'U', 'ū': 'u', 'Ŭ': 'U', 'ŭ': 'u', 'Ů': 'U', 'ů': 'u', 'Ű': 'U', 'ű': 'u', 'Ų': 'U', 'ų': 'u',
              'Ŵ': 'W', 'ŵ': 'w',
              'Ŷ': 'Y', 'ŷ': 'y', 'Ÿ': 'Y',
              'Ź': 'Z', 'ź': 'z', 'Ż': 'Z', 'ż': 'z', 'Ž': 'Z', 'ž': 'z'
            };
            return latinMap[char] || '?';
          }
          return '?';
        })
        .join('')
        // Clean up
        .replace(/\?+/g, '?')
        .replace(/  +/g, ' ')
        .trim();

      // Final verification - this should never happen but just in case
      for (let i = 0; i < result.length; i++) {
        if (result.charCodeAt(i) > 255) {
          console.warn(`Character still > 255 at index ${i}: ${result[i]} (${result.charCodeAt(i)})`);
          result = result.substring(0, i) + '?' + result.substring(i + 1);
        }
      }

      return result;
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