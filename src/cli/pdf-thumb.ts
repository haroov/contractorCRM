#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { generateThumbnail, checkPopplerAvailable, PDFThumbnailError } from '../lib/pdfThumb.js';
import * as path from 'path';

const argv = await yargs(hideBin(process.argv))
  .option('in', {
    type: 'string',
    demandOption: true,
    describe: 'Input PDF file path'
  })
  .option('page', {
    type: 'number',
    default: 1,
    describe: 'Page number to convert (default: 1)'
  })
  .option('width', {
    type: 'number',
    default: 800,
    describe: 'Output width in pixels (default: 800)'
  })
  .option('format', {
    type: 'string',
    choices: ['png', 'jpeg'],
    default: 'png',
    describe: 'Output format (default: png)'
  })
  .option('outDir', {
    type: 'string',
    default: './thumbnails',
    describe: 'Output directory (default: ./thumbnails)'
  })
  .option('outName', {
    type: 'string',
    describe: 'Output filename (without extension)'
  })
  .option('overwrite', {
    type: 'boolean',
    default: true,
    describe: 'Overwrite existing files (default: true)'
  })
  .help()
  .argv;

async function main() {
  try {
    // Check if Poppler is available
    const popplerAvailable = await checkPopplerAvailable();
    if (!popplerAvailable) {
      console.error('❌ Poppler is not installed or not available in PATH');
      console.error('\nPlease install Poppler:');
      console.error('  macOS: brew install poppler');
      console.error('  Ubuntu/Debian: sudo apt-get update && sudo apt-get install -y poppler-utils');
      console.error('  Windows: choco install poppler');
      process.exit(1);
    }

    console.log('✅ Poppler is available');

    // Resolve input path
    const inputPath = path.resolve(argv.in);
    console.log(`📄 Input PDF: ${inputPath}`);

    // Generate thumbnail
    const result = await generateThumbnail({
      pdfPath: inputPath,
      page: argv.page,
      width: argv.width,
      format: argv.format as 'png' | 'jpeg',
      outDir: argv.outDir,
      outName: argv.outName,
      overwrite: argv.overwrite
    });

    console.log('✅ Thumbnail generated successfully!');
    console.log(`📁 Output: ${result.outPath}`);
    console.log(`📏 Dimensions: ${result.width}x${result.height}px`);
    console.log(`📄 Page: ${result.page}`);
    console.log(`🎨 Format: ${result.format}`);

  } catch (error) {
    if (error instanceof PDFThumbnailError) {
      console.error(`❌ ${error.message}`);
      if (error.code) {
        console.error(`   Error code: ${error.code}`);
      }
    } else {
      console.error('❌ Unexpected error:', error);
    }
    process.exit(1);
  }
}

main();
