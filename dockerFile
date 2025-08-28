# Use the latest Node.js LTS version
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files first (for layer caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all project files
COPY . .

# Optional: if using .env locally but Koyeb sets env vars separately
# RUN cp .env.example .env

# Expose the port your Express app runs on
EXPOSE 3000

# Run your server
CMD ["npm","start"]