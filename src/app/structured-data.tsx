export default function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Word to PDF Converter",
    "description": "Convert Word documents (.doc, .docx) to PDF format instantly. Fast, secure, and completely free online tool.",
    "url": "https://wordtopdf.vercel.app",
    "applicationCategory": "UtilityApplication",
    "operatingSystem": "All",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Convert .doc files to PDF",
      "Convert .docx files to PDF", 
      "Drag and drop file upload",
      "Instant download",
      "No registration required",
      "Free to use"
    ],
    "softwareRequirements": "Web Browser",
    "author": {
      "@type": "Organization",
      "name": "Word to PDF Converter"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}