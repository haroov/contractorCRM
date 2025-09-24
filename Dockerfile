# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Install system dependencies for PDF processing
RUN apk add --no-cache \
    poppler-utils \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV USE_MEMORY_SERVER=false
ENV MONGODB_URI=mongodb://host.docker.internal:27017/contractor-crm

# Puppeteer environment variables for Linux
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Expose port
EXPOSE 10000

# Start the application
CMD ["node", "server/index.js"]


