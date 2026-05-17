FROM nginx:1.27-alpine

# Stock image ships default.conf (often shows up in `nginx -T`); we use a single main config only.
RUN rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/nginx.conf
COPY snippets/ /etc/nginx/snippets/

EXPOSE 80 443
