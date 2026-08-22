# Multi-stage Dockerfile for Expo Web / Node Environment
FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies required for native node modules and build tools
RUN apk add --no-cache libc6-compat git python3 make g++

# Copy package definition files
COPY package.json package-lock.json ./

# Install project dependencies
RUN npm ci

# Copy full application source code
COPY . .

# Expose Expo Web / Dev server port
EXPOSE 8081

# Set default environment variables
ENV NODE_ENV=development
ENV PORT=8081

# Command to start Expo in web mode
CMD ["npx", "expo", "start", "--web", "--port", "8081"]
