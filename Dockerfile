FROM debian:bullseye AS build

RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN npm install

COPY . .

RUN npm run build

FROM debian:bullseye AS production

RUN apt-get update && apt-get install -y \
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
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list && \
    apt-get update && apt-get install -y google-chrome-stable && apt-get clean

RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN groupadd -r chromeuser && useradd -r -g chromeuser chromeuser

USER chromeuser

WORKDIR /home/chromeuser

COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/.env ./
COPY --from=build /app/warp* ./

RUN rm -f package-lock.json

COPY --chown=chromeuser:chromeuser . .

ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN npm install --only=production

# For test add : , "--test", "--fast"
CMD ["node", "dist/main.js", "--debug"]
