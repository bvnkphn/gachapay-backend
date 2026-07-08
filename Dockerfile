# Use the official Node.js image as the base image
FROM node:24.17-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the application dependencies
RUN npm ci --ignore-scripts

# Copy the rest of the application files
COPY . .

# Generate Prisma
RUN npx --no-install prisma generate

# Build the NestJS application
RUN npm run build

# Expose the application port
EXPOSE 8000

# Command to run the application
RUN apk update && \
    apk add --no-cache postgresql-client
# RUN chmod +x start.sh
COPY start.sh ./start.sh
RUN dos2unix start.sh && chmod +x start.sh
CMD ["./start.sh"]
