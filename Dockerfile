FROM debian:bullseye

RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    lsb-release \
    xdg-utils \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs google-chrome-stable \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN groupadd -r chromeuser && useradd -r -g chromeuser chromeuser

USER chromeuser

WORKDIR /home/chromeuser

COPY --chown=chromeuser:chromeuser package*.json ./
COPY --chown=chromeuser:chromeuser .env ./
COPY --chown=chromeuser:chromeuser bin ./bin

RUN npm install

COPY --chown=chromeuser:chromeuser . .

RUN npm run build

RUN chmod +x ./bin/warp-plus

ENV PUPPETEER_SKIP_DOWNLOAD=true

ENTRYPOINT ["node", "dist/main.js", "--debug"]
CMD []
