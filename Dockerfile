FROM nginx:1.27-alpine

COPY dist/ /usr/share/nginx/html/
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

ENV BACKEND_HOST=host.docker.internal
ENV BACKEND_PORT=8080

EXPOSE 80
