# Use node:18-alpine as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install git since some packages fetch dependencies from github
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Expose port 3000
EXPOSE 3000

# Set start command to build and start the application at runtime
CMD ["sh", "-c", "npm run build && npm start"]
