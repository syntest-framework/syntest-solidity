FROM node:15.12

# Install truffle
RUN npm install -g truffle


WORKDIR /app/syntest-framework
RUN git clone
#COPY ./syntest-framework .
RUN npm install
RUN npm run build

#WORKDIR /app/syntest-solidity
#COPY ./syntest-solidity .
#RUN npm install
#RUN npm run build

WORKDIR /app/syntest-solidity-benchmark
COPY ./syntest-solidity-benchmark .
RUN npm install

ENTRYPOINT [ "truffle", "run", "syntest-solidity" ]
