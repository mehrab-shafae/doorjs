FROM node:22-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN npm ci --omit=dev

COPY . .

RUN npm run build

FROM debian:bullseye-slim

RUN apt-get update && apt-get install -y \
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
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    --no-install-recommends

RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system chromeuser && \
    useradd --system --gid chromeuser --home-dir /home/chromeuser chromeuser

WORKDIR /home/chromeuser/app

USER chromeuser

COPY --chown=chromeuser:chromeuser --from=builder /app/package*.json ./
COPY --chown=chromeuser:chromeuser --from=builder /app/dist ./dist
COPY --chown=chromeuser:chromeuser --from=builder /app/.env ./
COPY --chown=chromeuser:chromeuser --from=builder /app/bin ./bin

ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci --omit=dev --ignore-scripts

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

ENTRYPOINT ["node", "dist/main.js", "--debug"]
CMD ["--fast"]
