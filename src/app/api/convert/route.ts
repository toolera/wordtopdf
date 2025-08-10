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
    
    // Try using TimesRoman which might handle characters better
    let font;
    try {
      font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    } catch (error) {
      console.warn('TimesRoman failed, falling back to Helvetica');
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }
    
    const fontSize = 12;
    const margin = 50;
    const lineHeight = fontSize * 1.2;
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const maxWidth = width - 2 * margin;
    
    let yPosition = height - margin;
    
    // Function to sanitize text for Helvetica font - must ensure all chars are <= 255
    const sanitizeText = (text: string): string => {
      console.log('Input text length:', text.length);
      
      // DEBUG: Check original text around index 23
      console.log('Original text around index 23:');
      for (let i = 15; i < 35 && i < text.length; i++) {
        const code = text.charCodeAt(i);
        console.log(`Original index ${i}: '${text[i]}' (${code})`);
      }
      
      // First, log ALL problematic characters for debugging
      const problematicChars = [];
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        if (charCode > 255) {
          problematicChars.push({ char: text[i], code: charCode, index: i });
        }
      }
      if (problematicChars.length > 0) {
        console.log('Found problematic characters:', problematicChars.slice(0, 20)); // Log first 20
        console.log('Total problematic characters:', problematicChars.length);
      }

      // BRUTE FORCE: Convert every character individually to ensure no >255 chars pass
      let result = '';
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const code = char.charCodeAt(0);
        
        if (code <= 255) {
          result += char;
          continue;
        }
        
        // Direct character mapping - covers all problem characters we've seen
        switch (char) {
          // Turkish
          case 'İ': result += 'I'; break;
          case 'ı': result += 'i'; break;
          case 'Ş': result += 'S'; break;
          case 'ş': result += 's'; break;
          case 'Ğ': result += 'G'; break;
          case 'ğ': result += 'g'; break;
          case 'Ü': result += 'U'; break;
          case 'ü': result += 'u'; break;
          case 'Ö': result += 'O'; break;
          case 'ö': result += 'o'; break;
          case 'Ç': result += 'C'; break;
          case 'ç': result += 'c'; break;
          // Azerbaijani
          case 'Ə': result += 'E'; break;
          case 'ə': result += 'e'; break;
          // Common accented
          case 'À': case 'Á': case 'Â': case 'Ã': case 'Ä': case 'Å': result += 'A'; break;
          case 'à': case 'á': case 'â': case 'ã': case 'ä': case 'å': result += 'a'; break;
          case 'È': case 'É': case 'Ê': case 'Ë': result += 'E'; break;
          case 'è': case 'é': case 'ê': case 'ë': result += 'e'; break;
          case 'Ì': case 'Í': case 'Î': case 'Ï': result += 'I'; break;
          case 'ì': case 'í': case 'î': case 'ï': result += 'i'; break;
          case 'Ò': case 'Ó': case 'Ô': case 'Õ': result += 'O'; break;
          case 'ò': case 'ó': case 'ô': case 'õ': result += 'o'; break;
          case 'Ù': case 'Ú': case 'Û': result += 'U'; break;
          case 'ù': case 'ú': case 'û': result += 'u'; break;
          case 'Ý': case 'Ÿ': result += 'Y'; break;
          case 'ý': case 'ÿ': result += 'y'; break;
          case 'Ñ': result += 'N'; break;
          case 'ñ': result += 'n'; break;
          // Smart quotes
          case '\u201C': case '\u201D': case '\u201E': case '\u201A': result += '"'; break;
          case '\u2018': case '\u2019': case '\u201A': case '\u2019': result += "'"; break;
          // Dashes
          case '\u2014': case '\u2013': case '\u2212': result += '-'; break;
          case '\u2026': result += '...'; break;
          // Math symbols
          case '\u00D7': result += 'x'; break;
          case '\u00F7': result += '/'; break;
          case '\u00B1': result += '+/-'; break;
          case '\u2264': result += '<='; break;
          case '\u2265': result += '>='; break;
          case '\u2260': result += '!='; break;
          // Currency
          case '\u20AC': case '\u20BA': case '\u00A3': case '\u00A5': case '\u00A2': result += '$'; break;
          // Symbols to remove
          case '\u2122': case '\u00AE': case '\u00A9': result += ''; break;
          // Germanic
          case 'ß': result += 'ss'; break;
          case 'Æ': result += 'AE'; break;
          case 'æ': result += 'ae'; break;
          case 'Ø': result += 'O'; break;
          case 'ø': result += 'o'; break;
          default: 
            // Handle the mysterious 775 character and others
            if (code === 775) {
              console.warn(`Found the mysterious 775 character: ${char}`);
              result += '?';
            } else {
              // Log unknown character for debugging
              console.warn(`Unknown character: ${char} (code: ${code})`);
              result += '?';
            }
            break;
        }
      }
      
      // Clean up
      result = result
        .replace(/\?+/g, '?')
        .replace(/  +/g, ' ')
        .trim();

      // Final verification and logging
      console.log('Result length after processing:', result.length);
      let finalProblems = 0;
      for (let i = 0; i < result.length; i++) {
        const code = result.charCodeAt(i);
        if (code > 255) {
          console.warn(`Character still > 255 at index ${i}: ${result[i]} (${code})`);
          result = result.substring(0, i) + '?' + result.substring(i + 1);
          finalProblems++;
        }
      }
      
      if (finalProblems > 0) {
        console.log('Fixed', finalProblems, 'remaining problematic characters');
      }
      
      console.log('Final result length:', result.length);
      
      // EXTRA SAFETY: Convert to byte array and back to ensure compatibility
      const bytes = new Uint8Array(result.length);
      for (let i = 0; i < result.length; i++) {
        const code = result.charCodeAt(i);
        bytes[i] = code > 255 ? 63 : code; // 63 is ASCII '?'
      }
      
      result = String.fromCharCode(...bytes);
      console.log('Final sanitized text length:', result.length);

      return result;
    };
    
    const sanitizedText = sanitizeText(text);
    
    // EXTRA DEBUG: Check the sanitized text for any remaining issues
    console.log('Checking sanitized text for issues...');
    const foundIssues = [];
    for (let i = 0; i < sanitizedText.length; i++) {
      const code = sanitizedText.charCodeAt(i);
      if (code > 255) {
        foundIssues.push({ char: sanitizedText[i], code, index: i });
      }
    }
    
    if (foundIssues.length > 0) {
      console.error('FOUND REMAINING ISSUES:', foundIssues.slice(0, 10));
      console.error('Total remaining issues:', foundIssues.length);
    } else {
      console.log('No remaining issues found in sanitized text');
    }
    
    // Look specifically around index 23 where the error occurs
    console.log('Characters around index 23:');
    for (let i = 15; i < 35 && i < sanitizedText.length; i++) {
      const code = sanitizedText.charCodeAt(i);
      console.log(`Index ${i}: '${sanitizedText[i]}' (${code})`);
    }
    
    const lines = sanitizedText.split('\n');
    console.log('Processing', lines.length, 'lines');
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      
      // DEBUG: Check each line for issues
      for (let i = 0; i < line.length; i++) {
        const code = line.charCodeAt(i);
        if (code > 255) {
          console.error(`Line ${lineIndex} has problematic char at index ${i}: '${line[i]}' (${code})`);
        }
      }
      
      if (yPosition < margin + lineHeight) {
        page = pdfDoc.addPage();
        yPosition = height - margin;
      }
      
      const words = line.split(' ');
      let currentLine = '';
      
      for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
        const word = words[wordIndex];
        
        // DEBUG: Check each word for issues
        for (let i = 0; i < word.length; i++) {
          const code = word.charCodeAt(i);
          if (code > 255) {
            console.error(`Word ${wordIndex} has problematic char at index ${i}: '${word[i]}' (${code})`);
          }
        }
        
        // Extra sanitization right before use
        const cleanWord = word.split('').map(c => c.charCodeAt(0) > 255 ? '?' : c).join('');
        const testLine = currentLine + (currentLine ? ' ' : '') + cleanWord;
        
        // DEBUG: Check testLine before font operations
        for (let i = 0; i < testLine.length; i++) {
          const code = testLine.charCodeAt(i);
          if (code > 255) {
            console.error(`TestLine has problematic char at index ${i}: '${testLine[i]}' (${code})`);
          }
        }
        
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
            currentLine = cleanWord;
            
            if (yPosition < margin + lineHeight) {
              page = pdfDoc.addPage();
              yPosition = height - margin;
            }
          } else {
            currentLine = testLine;
          }
        } catch (encodingError) {
          // If there's still an encoding error, skip this word
          console.warn('Encoding error for word:', cleanWord, encodingError instanceof Error ? encodingError.message : 'Unknown encoding error');
          continue;
        }
      }
      
      if (currentLine) {
        // Final sanitization before drawing
        const finalLine = currentLine.split('').map(c => c.charCodeAt(0) > 255 ? '?' : c).join('');
        try {
          page.drawText(finalLine, {
            x: margin,
            y: yPosition,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          
          yPosition -= lineHeight;
        } catch (encodingError) {
          console.warn('Encoding error for line:', finalLine, encodingError instanceof Error ? encodingError.message : 'Unknown encoding error');
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