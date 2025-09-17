import * as fs from 'fs';
import * as path from 'path';
import { convert } from 'pdf-poppler';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

export type ThumbOptions = {
  pdfPath: string;       // input PDF absolute or relative path
  outDir?: string;       // default: "./thumbnails"
  outName?: string;      // default: base name + "-p{page}"
  page?: number;         // default: 1
  width?: number;        // default: 800
  format?: "png"|"jpeg"; // default: "png"
  overwrite?: boolean;   // default: true
};

export type ThumbResult = { 
  outPath: string; 
  width: number; 
  height: number; 
  page: number; 
  format: string 
};

export class PDFThumbnailError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'PDFThumbnailError';
  }
}

export async function generateThumbnail(options: ThumbOptions): Promise<ThumbResult> {
  const startTime = Date.now();
  
  try {
    // Validate inputs
    if (!options.pdfPath) {
      throw new PDFThumbnailError('PDF path is required', 'MISSING_PDF_PATH');
    }

    if (!fs.existsSync(options.pdfPath)) {
      throw new PDFThumbnailError(`PDF file not found: ${options.pdfPath}`, 'PDF_NOT_FOUND');
    }

    const page = options.page || 1;
    if (page < 1) {
      throw new PDFThumbnailError('Page number must be >= 1', 'INVALID_PAGE');
    }

    const width = options.width || 800;
    if (width < 100 || width > 4000) {
      throw new PDFThumbnailError('Width must be between 100 and 4000 pixels', 'INVALID_WIDTH');
    }

    const format = options.format || 'png';
    if (!['png', 'jpeg'].includes(format)) {
      throw new PDFThumbnailError('Format must be png or jpeg', 'INVALID_FORMAT');
    }

    // Setup output directory and filename
    const outDir = options.outDir || './thumbnails';
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const pdfBaseName = path.basename(options.pdfPath, '.pdf');
    const outName = options.outName || `${pdfBaseName}-p${page}`;
    const outPath = path.join(outDir, `${outName}.${format}`);

    // Check if file exists and overwrite is false
    if (!options.overwrite && fs.existsSync(outPath)) {
      logger.info(`Thumbnail already exists: ${outPath}`);
      return {
        outPath,
        width: 0, // We don't know the dimensions without reading the file
        height: 0,
        page,
        format
      };
    }

    logger.info(`Generating thumbnail for ${options.pdfPath}, page ${page}, width ${width}px`);

    // Convert PDF to image using pdf-poppler
    const convertOptions = {
      format: format,
      out_dir: outDir,
      out_prefix: outName,
      page: page,
      scale: width / 72, // Convert pixels to points (72 DPI)
      single_file: true
    };

    await convert(options.pdfPath, convertOptions);

    // Verify the output file was created
    if (!fs.existsSync(outPath)) {
      throw new PDFThumbnailError(`Thumbnail generation failed - output file not created: ${outPath}`, 'GENERATION_FAILED');
    }

    // Get file stats for dimensions (we'll need to read the image for actual dimensions)
    const stats = fs.statSync(outPath);
    logger.info(`Thumbnail generated successfully: ${outPath} (${stats.size} bytes)`);

    const duration = Date.now() - startTime;
    logger.info(`Thumbnail generation completed in ${duration}ms`);

    return {
      outPath,
      width: width, // We return the requested width
      height: 0, // We don't calculate actual height without image processing
      page,
      format
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Thumbnail generation failed after ${duration}ms:`, error);
    
    if (error instanceof PDFThumbnailError) {
      throw error;
    }
    
    // Handle pdf-poppler specific errors
    if (error instanceof Error) {
      if (error.message.includes('poppler')) {
        throw new PDFThumbnailError(
          'Poppler not found. Please install Poppler:\n' +
          'macOS: brew install poppler\n' +
          'Ubuntu/Debian: sudo apt-get update && sudo apt-get install -y poppler-utils\n' +
          'Windows: choco install poppler',
          'POPPLER_NOT_FOUND'
        );
      }
      throw new PDFThumbnailError(`PDF conversion failed: ${error.message}`, 'CONVERSION_FAILED');
    }
    
    throw new PDFThumbnailError('Unknown error during thumbnail generation', 'UNKNOWN_ERROR');
  }
}

// Helper function to check if Poppler is available
export async function checkPopplerAvailable(): Promise<boolean> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    await execAsync('pdftoppm -h');
    return true;
  } catch {
    return false;
  }
}
