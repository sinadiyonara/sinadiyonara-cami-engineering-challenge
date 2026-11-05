FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/

RUN npm install --workspace=@cami/api --include-workspace-root=false || npm install

COPY apps/api apps/api

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["sh", "-c", "npm run migration:run && npm run seed && npm run start:dev"]
