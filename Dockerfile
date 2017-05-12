FROM node:7-alpine
RUN mkdir -p /app/
WORKDIR /app/
COPY package.json ./
COPY node_modules/ ./node_modules
COPY src/ ./src
COPY doc/ ./doc
EXPOSE "9455"
CMD ["npm", "start", "--silent"]
