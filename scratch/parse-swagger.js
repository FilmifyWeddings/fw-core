const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'swagger-init.js');
if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf-8');
console.log('swagger-init.js size:', content.length, 'bytes');

// Let's find "swaggerDoc" or the JSON specification object definition in the file
// Usually it is initialized like: let options = { ... }; swaggerDoc: { ... }
// Let's write a regex to find where the json starts or look for paths keys
const searchTerms = ['/api/v1/templates', 'TemplateCreateRequest', 'TemplateEntity'];

searchTerms.forEach(term => {
  console.log(`\n--- Searching for "${term}" ---`);
  let index = 0;
  while ((index = content.indexOf(term, index)) !== -1) {
    console.log(`Found occurrence at index ${index}. Context:`);
    console.log(content.slice(Math.max(0, index - 200), Math.min(content.length, index + 800)));
    index += term.length;
  }
});
