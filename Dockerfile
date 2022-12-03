FROM node:16-alpine3.14 as common-build-stage
WORKDIR /opt/music
EXPOSE 8080
ENV NODE_ENV production

FROM common-build-stage as production-build-stage

# Copy dependencies first to improve layer caching

COPY package*.json ./
RUN apt-get update && apt-get install -y ffmpeg
RUN npm install
RUN npm install ytdl-core@latest

COPY . .

CMD [ "npm", "start" ]
