# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

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

# Start the application
CMD ["/app/start.sh"]


