FROM node:16-alpine

COPY . ./

RUN npm install

CMD npm test
