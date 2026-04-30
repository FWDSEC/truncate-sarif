#!/usr/bin/env node

const fs = require("fs");
const { chain } = require("stream-chain");
const { parser } = require("stream-json");
const { streamValues } = require("stream-json/streamers/stream-values.js");

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
  console.error("Usage: node truncate-sarif-snippets.js input.sarif output.sarif");
  process.exit(1);
}

const MAX_BYTES = 512;

function truncateUtf8(str, maxBytes) {
  if (typeof str !== "string") return str;

  const buf = Buffer.from(str, "utf8");
  if (buf.length <= maxBytes) return str;

  return buf.subarray(0, maxBytes).toString("utf8").replace(/\uFFFD$/, "");
}

function truncateSnippets(sarif) {
  let count = 0;

  for (const run of sarif.runs || []) {
    for (const result of run.results || []) {
      for (const location of result.locations || []) {
        const snippet = location?.physicalLocation?.region?.snippet;

        if (snippet && typeof snippet.text === "string") {
          const oldText = snippet.text;
          snippet.text = truncateUtf8(oldText, MAX_BYTES);

          if (snippet.text !== oldText) count++;
        }
      }
    }
  }

  return count;
}

async function main() {
  const totalBytes = fs.statSync(inputFile).size;
  let readBytes = 0;

  const input = fs.createReadStream(inputFile);

  input.on("data", chunk => {
    readBytes += chunk.length;
    const pct = ((readBytes / totalBytes) * 100).toFixed(1);
    process.stderr.write(`\rReading: ${pct}%`);
  });

  const pipeline = chain([
    input,
    parser(),
    streamValues(),
  ]);

  let wrote = false;

  for await (const { value } of pipeline) {
    process.stderr.write("\nTruncating snippets...\n");

    const truncated = truncateSnippets(value);

    process.stderr.write(`Writing output... truncated ${truncated} snippets\n`);

    fs.writeFileSync(outputFile, JSON.stringify(value));

    wrote = true;
  }

  if (!wrote) {
    throw new Error("No JSON value found in input file");
  }

  process.stderr.write("Done.\n");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});