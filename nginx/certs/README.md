# TLS certificates for nginx-api-gateway

Place **`fullchain.pem`** and **`privkey.pem`** here before building or starting the gateway (Docker mounts this directory read-only at `/etc/nginx/certs`).

Generate a **local self-signed** pair from the repository root (see `../README.md` or use **PowerShell** in the parent `nginx/README.md`).

Do not commit private keys; `*.pem` is gitignored.
