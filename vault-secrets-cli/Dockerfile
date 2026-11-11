FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

RUN chmod +x /app/src/cli.js \
  && ln -s /app/src/cli.js /usr/local/bin/vault-secrets-cli

ENTRYPOINT ["vault-secrets-cli"]
CMD ["--help"]
