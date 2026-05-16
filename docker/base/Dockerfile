# Custom base image for better-npm
# Builds nginx 1.31.0 directly with lua-nginx-module (bypassing OpenResty's patcher)
# Fixes CVE-2026-42945 (heap buffer overflow in nginx < 1.31.0)

FROM debian:bookworm-slim

ARG TARGETPLATFORM=linux/amd64

ENV NGINX_VERSION=1.31.0 \
    NDK_VERSION=0.3.3 \
    LUA_NGINX_VERSION=0.10.27 \
    LUA_RESTY_CORE_VERSION=0.1.29 \
    LUA_RESTY_LRUCACHE_VERSION=0.13 \
    NODE_MAJOR=20

# Build + runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    curl \
    wget \
    git \
    libpcre3-dev \
    libssl-dev \
    zlib1g-dev \
    libgd-dev \
    libgeoip-dev \
    libxml2-dev \
    libxslt1-dev \
    libperl-dev \
    perl \
    gnupg2 \
    lsb-release \
    python3 \
    python3-venv \
    python3-full \
    apache2-utils \
    cron \
    logrotate \
    jq \
    openssl \
    libpcre3 \
    libssl3 \
    zlib1g \
    libgeoip1 \
    libxml2 \
    libxslt1.1 \
    && rm -rf /var/lib/apt/lists/*

# Build LuaJIT from GitHub (luajit.org is unreachable)
RUN git clone --depth=1 --branch v2.1 https://github.com/LuaJIT/LuaJIT.git /tmp/luajit \
    && cd /tmp/luajit \
    && make -j"$(nproc)" \
    && make install PREFIX=/usr/local/luajit \
    && echo "/usr/local/luajit/lib" > /etc/ld.so.conf.d/luajit.conf \
    && ldconfig \
    && rm -rf /tmp/luajit

ENV LUAJIT_LIB=/usr/local/luajit/lib \
    LUAJIT_INC=/usr/local/luajit/include/luajit-2.1

# Download nginx + Lua modules
RUN cd /tmp \
    && wget -q "https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz" \
    && wget -q "https://github.com/simplresty/ngx_devel_kit/archive/refs/tags/v${NDK_VERSION}.tar.gz" -O ndk.tar.gz \
    && wget -q "https://github.com/openresty/lua-nginx-module/archive/refs/tags/v${LUA_NGINX_VERSION}.tar.gz" -O lua-nginx.tar.gz \
    && tar xf "nginx-${NGINX_VERSION}.tar.gz" \
    && tar xf ndk.tar.gz \
    && tar xf lua-nginx.tar.gz

# Build nginx 1.31.0 with Lua support
RUN cd /tmp/nginx-${NGINX_VERSION} \
    && ./configure \
        --prefix=/usr/local/nginx \
        --sbin-path=/usr/sbin/nginx \
        --modules-path=/usr/lib/nginx/modules \
        --conf-path=/etc/nginx/nginx.conf \
        --error-log-path=/var/log/nginx/error.log \
        --http-log-path=/var/log/nginx/access.log \
        --pid-path=/run/nginx/nginx.pid \
        --lock-path=/var/lock/nginx.lock \
        --http-client-body-temp-path=/tmp/nginx/body \
        --http-fastcgi-temp-path=/tmp/nginx/fastcgi \
        --http-proxy-temp-path=/tmp/nginx/proxy \
        --http-scgi-temp-path=/tmp/nginx/scgi \
        --http-uwsgi-temp-path=/tmp/nginx/uwsgi \
        --with-http_ssl_module \
        --with-http_v2_module \
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
        --with-http_slice_module \
        --with-http_stub_status_module \
        --with-mail=dynamic \
        --with-mail_ssl_module \
        --with-stream \
        --with-stream_ssl_module \
        --with-stream_realip_module \
        --with-stream_ssl_preread_module \
        --with-compat \
        --with-pcre-jit \
        --with-threads \
        --with-file-aio \
        --add-module=/tmp/ngx_devel_kit-${NDK_VERSION} \
        --add-module=/tmp/lua-nginx-module-${LUA_NGINX_VERSION} \
    && make -j"$(nproc)" \
    && make install \
    && rm -rf /tmp/nginx-${NGINX_VERSION} /tmp/ngx_devel_kit-* /tmp/lua-nginx-module-* /tmp/*.tar.gz

# Install lua-resty-core + lua-resty-lrucache
RUN cd /tmp \
    && wget -q "https://github.com/openresty/lua-resty-core/archive/refs/tags/v${LUA_RESTY_CORE_VERSION}.tar.gz" -O lrc.tar.gz \
    && wget -q "https://github.com/openresty/lua-resty-lrucache/archive/refs/tags/v${LUA_RESTY_LRUCACHE_VERSION}.tar.gz" -O lrl.tar.gz \
    && tar xf lrc.tar.gz \
    && tar xf lrl.tar.gz \
    && cd lua-resty-core-${LUA_RESTY_CORE_VERSION} \
    && make install PREFIX=/usr/local/nginx \
    && cd /tmp/lua-resty-lrucache-${LUA_RESTY_LRUCACHE_VERSION} \
    && make install PREFIX=/usr/local/nginx \
    && rm -rf /tmp/lrc.tar.gz /tmp/lrl.tar.gz /tmp/lua-resty-*

# Directory structure expected by NPM
RUN mkdir -p \
    /tmp/nginx/body \
    /tmp/nginx/fastcgi \
    /tmp/nginx/proxy \
    /tmp/nginx/scgi \
    /tmp/nginx/uwsgi \
    /run/nginx \
    /etc/nginx/conf.d/include \
    /etc/nginx/conf.d/stream \
    /var/lib/nginx/cache/public \
    /var/lib/nginx/cache/private \
    /var/log/nginx \
    /data/nginx/default_host \
    /data/nginx/proxy_host \
    /data/nginx/redirection_host \
    /data/nginx/dead_host \
    /data/nginx/stream \
    /data/nginx/temp \
    /data/nginx/custom \
    /data/logs \
    /data/ssl-confs

# Symlinks NPM expects
RUN ln -sf /usr/lib/nginx/modules /etc/nginx/modules \
    && mkdir -p /etc/nginx/modules-enabled

# npm user (uid/gid 1000)
RUN groupadd -g 1000 npm \
    && useradd -u 1000 -g 1000 -s /bin/false -d /var/www/html -M npm

# certbot via venv
RUN python3 -m venv /opt/certbot \
    && /opt/certbot/bin/pip install --upgrade pip \
    && /opt/certbot/bin/pip install \
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
        certbot-dns-sakuracloud \
    && ln -sf /opt/certbot/bin/certbot /usr/bin/certbot

# Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g yarn \
    && rm -rf /var/lib/apt/lists/*

ENV PATH=/usr/sbin:$PATH \
    LUA_PATH="/usr/local/nginx/lualib/?.lua;/usr/local/nginx/lualib/?/init.lua;;" \
    LUA_CPATH="/usr/local/nginx/lualib/?.so;;"

# Validate nginx binary version
RUN nginx -V 2>&1 | grep "nginx/${NGINX_VERSION}" \
    && echo "==> nginx ${NGINX_VERSION} OK, CVE-2026-42945 patched"

LABEL org.opencontainers.image.source="https://github.com/snxRCS/better-npm" \
      org.label-schema.description="better-npm base: nginx ${NGINX_VERSION} + Lua (CVE-2026-42945 fix)"
