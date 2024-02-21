# https://github.com/mermaid-js/mermaid-cli/blob/master/Dockerfile
FROM node:alpine

# Set environment variables for Puppeteer
ENV CHROME_BIN="/usr/bin/chromium-browser" \
	PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"

# Install Chromium and fonts
RUN apk add chromium font-noto-cjk font-noto-emoji \
	terminus-font ttf-dejavu ttf-freefont ttf-font-awesome \
	ttf-inconsolata ttf-linux-libertine \
	&& fc-cache -f

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

RUN npm install

# Copy the application source code
COPY . .

# Run npm build
RUN npm run build

# Expose the port the app runs on
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
