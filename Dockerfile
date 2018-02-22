FROM node:8-alpine

RUN apk --update add curl
RUN mkdir -p /app/

HEALTHCHECK CMD curl -fs http://localhost:9455/v1/health || exit 1

WORKDIR /app/

COPY package.json ./
#RUN npm install --quiet --production

COPY doc/ ./doc
COPY src/ ./src
COPY node_modules/ ./node_modules

ENV SESSION_SERVICE_CONTAINERIZED true
ENTRYPOINT ["node", "./src/index.js"]
