# Runtime image for the self-hosted Avela website. Built by deploy/deploy-web.sh
# from a standalone Next.js build made on the Mac; nothing is compiled here.
FROM node:22-slim
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --chown=node:node app/ ./
USER node
EXPOSE 3000
CMD ["node", "server.js"]
