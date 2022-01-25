FROM node:16-alpine

ADD . ./

RUN npm install

CMD npm test
