const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'swagger-https___whatsboost_in_docs.html');
if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf-8');
console.log('File size:', content.length, 'bytes');

// Search for any JSON links or OpenAPI definitions
const openApiUrlRegex = /url\s*:\s*['"]([^'"]+\.json|[^'"]+swagger[^'"]*|[^'"]+openapi[^'"]*)['"]/gi;
let match;
while ((match = openApiUrlRegex.exec(content)) !== null) {
  console.log('OpenAPI URL Reference:', match[1]);
}

// Search for script tags containing JSON data
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let idx = 0;
while ((match = scriptRegex.exec(content)) !== null) {
  const scriptContent = match[1];
  if (scriptContent.includes('openapi') || scriptContent.includes('swagger') || scriptContent.includes('TemplateCreateRequest')) {
    console.log(`Script ${idx} length: ${scriptContent.length} bytes (contains swagger/openapi/templates)`);
    fs.writeFileSync(path.join(__dirname, `script-${idx}.js`), scriptContent, 'utf-8');
  }
  idx++;
}

// Just search for "TemplateCreateRequest" in the text
const keyword = 'TemplateCreateRequest';
const occurrences = content.split(keyword).length - 1;
console.log(`Occurrences of "${keyword}": ${occurrences}`);
