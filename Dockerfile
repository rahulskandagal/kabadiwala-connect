# Static PWA served by nginx. Build: docker build -t kabadiwala-connect .   Run: docker run -p 8090:80 kabadiwala-connect
FROM nginx:1.27-alpine
COPY . /usr/share/nginx/html
RUN rm -f /usr/share/nginx/html/Dockerfile /usr/share/nginx/html/run.* && \
    printf 'server { listen 80; root /usr/share/nginx/html; index start.html index.html; \
      location ~* \\.(webmanifest)$ { types { application/manifest+json webmanifest; } } \
      add_header Cache-Control "no-cache"; }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
