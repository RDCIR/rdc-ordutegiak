#!/bin/zsh
set -e

# Crea un archivo HTML unico y autonomo (dist/iraurgi-ordu.html) que se puede
# abrir con doble clic, sin servidor ni Node una vez creado.

cd "$(dirname "$0")"

if ! command -v npm >/dev/null 2>&1; then
  echo "No se ha encontrado npm."
  echo "Instala Node.js desde https://nodejs.org/ y vuelve a abrir este archivo."
  echo
  read "reply?Pulsa Enter para cerrar..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Instalando dependencias (solo la primera vez)..."
  npm install
fi

echo "Creando el archivo unico..."
npm run build:app

echo
echo "Listo. Se ha creado: dist/iraurgi-ordu.html"
echo "Haz doble clic en ese archivo para usar la app (no necesita internet ni servidor)."
echo "Abriendo la carpeta para que lo veas..."
open -R dist/iraurgi-ordu.html
