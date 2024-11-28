# Use official Node.js image as base
FROM node:14

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose port 8080 to the outside world
EXPOSE 8080

# Start the app
CMD ["node", "index.js"]
