FROM node:20-alpine

WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN npm run build

RUN apk add --no-cache dumb-init

USER app

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]