# Disposable MinIO test server, pinned to upstream RELEASE.2025-09-07T16-13-09Z.
# Build from source because the published MinIO binary/image downloads are unavailable.
FROM golang:1.24.7-bookworm AS build
WORKDIR /src
RUN git init . \
    && git remote add origin https://github.com/minio/minio.git \
    && git fetch --depth=1 origin 07c3a429bfed433e49018cb0f78a52145d4bedeb \
    && git checkout --detach FETCH_HEAD
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /minio .

FROM node:24.22.2-bookworm-slim
COPY --from=build /minio /usr/local/bin/minio
COPY --from=build /src/LICENSE /usr/share/doc/minio/LICENSE
USER node
EXPOSE 9000
HEALTHCHECK --interval=2s --timeout=2s --start-period=30s --retries=30 CMD ["node", "-e", "fetch('http://127.0.0.1:9000/minio/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
ENTRYPOINT ["minio"]
