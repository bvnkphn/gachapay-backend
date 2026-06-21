# # Stage 1: Build
# FROM node:24.17-alpine AS builder
# WORKDIR /usr/src/app

# # ติดตั้ง dependencies
# COPY package*.json ./
# RUN npm install

# # ก๊อปปี้ source code ทั้งหมด
# COPY . .

# # รัน build (ขั้นตอนนี้จะสร้างโฟลเดอร์ dist ใน Container)
# RUN npx prisma generate
# RUN npm run build

# # Stage 2: Production
# FROM node:24.17-alpine
# WORKDIR /usr/src/app

# # ก๊อปปี้เฉพาะไฟล์ที่จำเป็นจาก Stage 1
# COPY --from=builder /usr/src/app/package*.json ./
# COPY --from=builder /usr/src/app/node_modules ./node_modules
# COPY --from=builder /usr/src/app/dist ./dist

# EXPOSE 8000
# CMD ["node", "dist/main.js"]

# Use the official Node.js image as the base image
FROM node:24.17-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the application dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Generate Prisma
RUN npx prisma generate

# Build the NestJS application
RUN npm run build
RUN echo "--- โครงสร้างโฟลเดอร์ dist ---" && \
    ls -R dist

# Expose the application port
EXPOSE 8000

# Command to run the application
RUN apk update && \
    apk add --no-cache postgresql-client
RUN chmod +x start.sh
CMD ["./start.sh"]
