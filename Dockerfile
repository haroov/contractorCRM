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

# Expose ports
EXPOSE 3001 5173

# Create a script to run both frontend and backend
RUN echo '#!/bin/sh\n\
    echo "Starting Contractor CRM..."\n\
    echo "Starting backend server..."\n\
    npm run server &\n\
    echo "Starting frontend..."\n\
    npm run dev &\n\
    wait' > /app/start.sh && chmod +x /app/start.sh

# Set environment variables
ENV NODE_ENV=production
ENV USE_MEMORY_SERVER=false
ENV MONGODB_URI=mongodb://host.docker.internal:27017/contractor-crm

# Puppeteer environment variables for Linux
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Start the application
CMD ["/app/start.sh"]


