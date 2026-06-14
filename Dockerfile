FROM node:20-alpine

# Use production environment
ENV NODE_ENV=production

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source code, excluding dev files
COPY server.js database.js ./
COPY public/ ./public/

# Ensure necessary directories exist with proper permissions
RUN mkdir -p data uploads && \
    chmod 777 data uploads

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "server.js"]
