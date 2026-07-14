# === Build Stage ===
FROM node:24.17-alpine AS builder

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the application dependencies
RUN npm ci --ignore-scripts

# Copy the rest of the application files
COPY src ./src
COPY prisma ./prisma
COPY nest-cli.json tsconfig.json ./

# Generate Prisma
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
ENV DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"
RUN npx --no-install prisma generate

# Build the NestJS application
RUN npm run build

# Remove devDependencies for production
RUN npm prune --production --ignore-scripts

# === Production Stage ===
FROM node:24.17-alpine

RUN apk update && \
    apk add --no-cache postgresql-client && \
    rm -rf /var/cache/apk/*

WORKDIR /usr/src/app

# Copy built application from builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/prisma ./prisma

# Copy and fix start script (use sed instead of dos2unix to reduce image size)
COPY start.sh ./start.sh
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

# Set ownership to node user
RUN chown -R node:node /usr/src/app

# Expose the application port
EXPOSE 8000

# Run as non-root user
USER node

CMD ["./start.sh"]
