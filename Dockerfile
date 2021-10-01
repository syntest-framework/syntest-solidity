FROM node:15.12
ARG REGISTRY_TOKEN

# Install truffle
RUN npm install -g truffle

WORKDIR /app/syntest-solidity
COPY . .

RUN npm install
RUN npm run build
RUN npm install -g .

WORKDIR /app/benchmark
COPY docker/templates/.syntest.js .
COPY docker/templates/truffle-config.js .
RUN mkdir contracts

COPY docker/run.sh /scripts/run.sh
RUN ["chmod", "+x", "/scripts/run.sh"]
ENTRYPOINT ["/scripts/run.sh"]
