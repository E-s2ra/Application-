const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\Users\\esra9\\.gemini\\antigravity-ide\\brain\\9e8baa32-8907-422b-a35c-e90eafda388d\\.system_generated\\logs\\transcript_full.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let latestIndexTsxContent = '';

  for await (const line of rl) {
    try {
      const parsed = JSON.parse(line);
      // look for any output containing code from index.tsx
      if (parsed.type === 'TOOL_RESPONSE' && parsed.content && parsed.content.includes('index.tsx')) {
        latestIndexTsxContent += parsed.content + '\n---\n';
      }
    } catch (e) {}
  }

  fs.writeFileSync('c:\\app\\recovered_index.txt', latestIndexTsxContent);
  console.log('Done recovering');
}

processLineByLine();
