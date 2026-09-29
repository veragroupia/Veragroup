#!/usr/bin/env sh
# Baixa os dois videos gerados no Higgsfield para dentro do site.
# Com os arquivos em assets/video, o site deixa de depender do CDN do Higgsfield
# (o HTML tenta primeiro o arquivo local e so depois o endereco externo).
set -e
cd "$(dirname "$0")/.."
mkdir -p assets/video
curl -fL -o assets/video/hero-luz.mp4 \
  "https://d8j0ntlcm91z4.cloudfront.net/user_3K02vVuSs7rq9tHmdVvUCOsCh4U/hf_20260929_113405_5ca5796b-1bd2-48dd-988d-ea3503847775.mp4"
curl -fL -o assets/video/voneis-bolo.mp4 \
  "https://d8j0ntlcm91z4.cloudfront.net/user_3K02vVuSs7rq9tHmdVvUCOsCh4U/hf_20260929_113307_7a09c871-82b3-4b6d-a543-1c01b8d0605c.mp4"
echo "Videos salvos em assets/video."
