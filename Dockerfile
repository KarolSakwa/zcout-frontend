FROM node:20

WORKDIR /app

RUN groupadd -r app && useradd -r -g app app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

USER app

CMD ["npm", "start"]