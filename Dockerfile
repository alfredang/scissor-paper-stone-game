# Use a lightweight Nginx image to serve static files
FROM nginx:stable-alpine

# Copy the static files to the Nginx html directory
COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY game.js /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

# Nginx starts automatically by default
