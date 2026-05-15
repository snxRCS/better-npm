# Custom base image for better-npm
# Builds OpenResty with nginx 1.31.0 to address CVE-2026-42945
# (heap buffer overflow in nginx < 1.31.0, fixed in 1.31.0)
#
# Replaces: nginxproxymanager/nginx-full:certbot-node

FROM debian:bookworm-slim

ARG TARGETPLATFORM=linux/amd64

ENV NGINX_VERSION=1.31.0 \
    OPENRESTY_VERSION=1.27.1.2 \
    LUAJIT_VERSION=2.1.0-beta3 \
    NODE_MAJOR=20

# ─── Build dependencies ────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    curl \
    wget \
    libpcre3-dev \
    libssl-dev \
    zlib1g-dev \
    libgd-dev \
    libgeoip-dev \
    libxml2-dev \
    libxslt1-dev \
    libmaxminddb-dev \
    perl \
    git \
    gnupg2 \
    lsb-release \
    # Runtime deps
    libpcre3 \
    libssl3 \
    zlib1g \
    libgeoip1 \
    libxml2 \
    libxslt1.1 \
    # Certbot and tooling
    python3 \
    python3-pip \
    python3-venv \
    python3-full \
    # General utilities expected by NPM
    apache2-utils \
    cron \
    logrotate \
    jq \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# ─── Build LuaJIT (required by OpenResty) ─────────────────────────────────────
RUN cd /tmp && \
    wget -q "https://luajit.org/download/LuaJIT-${LUAJIT_VERSION}.tar.gz" && \
    tar xf "LuaJIT-${LUAJIT_VERSION}.tar.gz" && \
    cd "LuaJIT-${LUAJIT_VERSION}" && \
    make -j"$(nproc)" && \
    make install && \
    ln -sf luajit-2.1.0-beta3 /usr/local/bin/luajit && \
    rm -rf /tmp/LuaJIT*

ENV LUAJIT_LIB=/usr/local/lib \
    LUAJIT_INC=/usr/local/include/luajit-2.1

# ─── Download & build OpenResty with nginx 1.31.0 ─────────────────────────────
RUN cd /tmp && \
    wget -q "https://openresty.org/download/openresty-${OPENRESTY_VERSION}.tar.gz" && \
    wget -q "https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz" && \
    tar xf "openresty-${OPENRESTY_VERSION}.tar.gz" && \
    tar xf "nginx-${NGINX_VERSION}.tar.gz" && \
    cd "openresty-${OPENRESTY_VERSION}" && \
    # Replace OpenResty's bundled nginx with nginx 1.31.0
    rm -rf bundle/nginx-* && \
    cp -r "/tmp/nginx-${NGINX_VERSION}" "bundle/nginx-${NGINX_VERSION}" && \
    ./configure \
        --prefix=/usr/local/openresty \
        --with-luajit \
        --with-http_ssl_module \
        --with-http_v2_module \
        --with-http_v3_module \
        --with-http_realip_module \
        --with-http_addition_module \
        --with-http_xslt_module=dynamic \
        --with-http_image_filter_module=dynamic \
        --with-http_geoip_module=dynamic \
        --with-http_sub_module \
        --with-http_dav_module \
        --with-http_flv_module \
        --with-http_mp4_module \
        --with-http_gunzip_module \
        --with-http_gzip_static_module \
        --with-http_auth_request_module \
        --with-http_random_index_module \
        --with-http_secure_link_module \
        --with-http_degradation_module \
        --with-http_slice_module \
        --with-http_stub_status_module \
        --with-http_perl_module=dynamic \
        --with-mail=dynamic \
        --with-mail_ssl_module \
        --with-stream \
        --with-stream_ssl_module \
        --with-stream_realip_module \
        --with-stream_geoip_module=dynamic \
        --with-stream_ssl_preread_module \
        --with-compat \
        --with-pcre-jit \
        --with-threads \
        --with-file-aio \
        -j"$(nproc)" && \
    make -j"$(nproc)" && \
    make install && \
    # Create nginx symlinks matching the paths NPM expects
    ln -sf /usr/local/openresty/nginx/sbin/nginx /usr/sbin/nginx && \
    ln -sf /usr/local/openresty/nginx/conf /etc/nginx && \
    mkdir -p /etc/nginx/conf.d /etc/nginx/modules && \
    # Modules symlink so NPM's nginx.conf include works
    ln -sf /usr/local/openresty/nginx/modules /etc/nginx/modules-available && \
    rm -rf /tmp/openresty* /tmp/nginx*

# ─── Nginx directory structure expected by NPM ────────────────────────────────
RUN mkdir -p \
    /etc/nginx/conf.d/include \
    /etc/nginx/conf.d/stream \
    /var/lib/nginx/cache/public \
    /var/lib/nginx/cache/private \
    /var/log/nginx \
    /run/nginx \
    /tmp/nginx/body \
    /data/nginx/default_host \
    /data/nginx/proxy_host \
    /data/nginx/redirection_host \
    /data/nginx/dead_host \
    /data/nginx/stream \
    /data/nginx/temp \
    /data/nginx/custom \
    /data/logs \
    /data/ssl-confs

# ─── npm user (matches what NPM expects: uid/gid 1000) ────────────────────────
RUN groupadd -g 1000 npm && \
    useradd -u 1000 -g 1000 -s /bin/false -d /var/www/html -M npm

# ─── certbot via pipx/venv (system pip restricted in bookworm) ─────────────────
RUN python3 -m venv /opt/certbot && \
    /opt/certbot/bin/pip install --upgrade pip && \
    /opt/certbot/bin/pip install \
        certbot \
        certbot-dns-cloudflare \
        certbot-dns-route53 \
        certbot-dns-digitalocean \
        certbot-dns-dnsimple \
        certbot-dns-gehirn \
        certbot-dns-google \
        certbot-dns-linode \
        certbot-dns-luadns \
        certbot-dns-nsone \
        certbot-dns-ovh \
        certbot-dns-rfc2136 \
        certbot-dns-sakuracloud && \
    ln -sf /opt/certbot/bin/certbot /usr/bin/certbot

# ─── Node.js 20.x via NodeSource ──────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    npm install -g yarn && \
    rm -rf /var/lib/apt/lists/*

# ─── OpenResty Lua path environment ───────────────────────────────────────────
ENV PATH=/usr/local/openresty/bin:/usr/local/openresty/nginx/sbin:$PATH \
    LUA_PATH="/usr/local/openresty/site/lualib/?.lua;/usr/local/openresty/lualib/?.lua;;" \
    LUA_CPATH="/usr/local/openresty/site/lualib/?.so;/usr/local/openresty/lualib/?.so;;"

# ─── Validate nginx binary ─────────────────────────────────────────────────────
RUN nginx -V 2>&1 | grep -q "nginx/${NGINX_VERSION}" || \
    (echo "ERROR: nginx version mismatch! Expected ${NGINX_VERSION}" && nginx -V && exit 1)

LABEL org.label-schema.schema-version="1.0" \
    org.label-schema.name="better-npm-base" \
    org.label-schema.description="Custom base image: OpenResty with nginx ${NGINX_VERSION} (CVE-2026-42945 fix)" \
    org.label-schema.url="https://github.com/snxRCS/better-npm" \
    org.opencontainers.image.source="https://github.com/snxRCS/better-npm"
