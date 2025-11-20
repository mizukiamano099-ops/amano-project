# ベースとなる DevContainer Node イメージ
FROM mcr.microsoft.com/devcontainers/javascript-node:18

# Firebase CLI / その他必要ツールを追加
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && npm install -g firebase-tools

# 作業ディレクトリ
WORKDIR /workspace
