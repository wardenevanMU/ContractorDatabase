FROM node:latest

# Set the working directory in the container
WORKDIR /usr/src/app

# Install build essentials, Python, and update package lists
RUN apt-get update && \
    apt-get install -y build-essential python-is-python3

# Import the public key used by the package management system for MongoDB
RUN apt-get install -y gnupg && \
    wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | apt-key add -

# Add the MongoDB repository details to the sources list
RUN echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | \
    tee /etc/apt/sources.list.d/mongodb-org-5.0.list

# Update and install MongoDB tools
RUN apt-get update && \
    apt-get install -y mongodb-org-tools

# Copy package.json and package-lock.json to the container
COPY package*.json ./


# Install dependencies
RUN npm install

# Copy the rest of the application files to the container
COPY . .


EXPOSE 3000


CMD ["node", "server.js"]










