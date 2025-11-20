# Node.js LTS バージョンをベースイメージとして使用
FROM node:20

# 必要なパッケージをインストール
# git: DevContainer/VSCodeが内部で使用するために必要
# make, g++: ネイティブモジュール (e.g. node-gyp) のコンパイルに必要な場合がある
RUN apt-get update && \
    apt-get install -y git make g++ python3 && \
    rm -rf /var/lib/apt/lists/*

# グローバルに必要なツール (Firebase CLI) をインストール
# このプロジェクトがFirestoreやFirebaseと密接に関わるため
RUN npm install -g firebase-tools

# コンテナ起動時に実行される作業ディレクトリを設定
WORKDIR /usr/src/app

# デフォルトユーザーは 'node' (非rootユーザー) を使用
USER node

# 必要に応じてポートを開放する場合のヒント (CLIツールでは必須ではないが、テスト用エミュレータのために開放することがある)
# EXPOSE 3000
