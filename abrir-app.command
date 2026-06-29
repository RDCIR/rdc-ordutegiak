#!/bin/zsh
set -e

cd "$(dirname "$0")"

if ! command -v npm >/dev/null 2>&1; then
  echo "No se ha encontrado npm."
  echo "Instala Node.js desde https://nodejs.org/ y vuelve a abrir este archivo."
  echo
  read "reply?Pulsa Enter para cerrar..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Instalando dependencias..."
  npm install
fi

echo "Abriendo Iraurgi Ordu..."
echo "Si el navegador no se abre solo, usa la URL que aparezca abajo."
npm run dev -- --open
