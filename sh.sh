#!/bin/bash

echo "📦 Atualizando Termux..."
pkg update -y && pkg upgrade -y

echo "🔧 Instalando dependências..."
pkg install nodejs -y

echo "📁 Entrando na pasta da IA..."
cd "$(dirname "$0")"

echo "📦 Instalando pacotes do projeto..."
npm install @whiskeysockets/baileys qrcode-terminal

echo "🚀 Iniciando a IA de Vendas..."
node index.js
