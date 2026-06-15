# Use the official Node alpine image for a lightweight container
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files first to leverage Docker's caching layer
# This speeds up future builds if your dependencies haven't changed
COPY package*.json ./

# Install the frontend dependencies (Vite, Babylon.js, etc.)
RUN npm install

# Copy the rest of your game files into the container
COPY . .

# Expose Vite's default development server port
EXPOSE 5173

# Run Vite in development mode, explicitly binding to network interfaces
# The "--host" flag is crucial for accessing the server from your browser outside Docker
CMD ["npm", "run", "dev", "--", "--host"]