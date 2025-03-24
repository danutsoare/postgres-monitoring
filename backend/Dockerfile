FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose API port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
