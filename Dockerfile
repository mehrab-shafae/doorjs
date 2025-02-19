FROM archlinux:latest

RUN pacman -Syu --noconfirm && \
    pacman -S --noconfirm \
    base-devel \
    git \
    curl \
    wget \
    nodejs \
    npm \
    && pacman -Scc --noconfirm

RUN useradd -m auruser

USER auruser
WORKDIR /home/auruser

RUN git clone https://aur.archlinux.org/yay-bin.git && \
    cd yay-bin && \
    makepkg -si --noconfirm && \
    rm -rf yay-bin

USER root

RUN yay -S --noconfirm google-chrome

RUN useradd -m chromeuser

USER chromeuser

WORKDIR /home/chromeuser

COPY --chown=chromeuser:chromeuser package*.json ./
COPY --chown=chromeuser:chromeuser .env ./
COPY --chown=chromeuser:chromeuser bin ./bin

ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN npm install

COPY --chown=chromeuser:chromeuser . .

RUN npm run build

RUN chmod +x ./bin/warp-plus

ENTRYPOINT ["node", "dist/main.js", "--debug"]
CMD []
