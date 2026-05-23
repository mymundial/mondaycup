#!/usr/bin/env bash
set -euo pipefail

mkdir -p public/fonts/intodotmatrix public/fonts/sumpfdeutschensportschriftsdin

if [ ! -f webfontkit-intodotmatrix.zip ]; then
  echo "Missing webfontkit-intodotmatrix.zip in project root" >&2
  exit 1
fi
if [ ! -f webfontkit-sumpfdeutschensportschriftsdin.zip ]; then
  echo "Missing webfontkit-sumpfdeutschensportschriftsdin.zip in project root" >&2
  exit 1
fi

tmpdir=".font-extract-tmp"
rm -rf "$tmpdir"
mkdir -p "$tmpdir/intodotmatrix" "$tmpdir/sportsdin"

unzip -q webfontkit-intodotmatrix.zip -d "$tmpdir/intodotmatrix"
unzip -q webfontkit-sumpfdeutschensportschriftsdin.zip -d "$tmpdir/sportsdin"

find "$tmpdir/intodotmatrix" -type f \( -name 'intodotmatrix-webfont.woff2' -o -name 'intodotmatrix-webfont.woff' \) -exec cp {} public/fonts/intodotmatrix/ \;
find "$tmpdir/sportsdin" -type f \( \
  -name 'sumpfdeutschensportschriftsdin-light-webfont.woff2' -o \
  -name 'sumpfdeutschensportschriftsdin-light-webfont.woff' -o \
  -name 'sumpfdeutschensportschriftsdin-regular-webfont.woff2' -o \
  -name 'sumpfdeutschensportschriftsdin-regular-webfont.woff' -o \
  -name 'sumpfdeutschensportschriftsdin-bold-webfont.woff2' -o \
  -name 'sumpfdeutschensportschriftsdin-bold-webfont.woff' \
\) -exec cp {} public/fonts/sumpfdeutschensportschriftsdin/ \;

rm -rf "$tmpdir"

missing=0
for file in \
  public/fonts/intodotmatrix/intodotmatrix-webfont.woff2 \
  public/fonts/intodotmatrix/intodotmatrix-webfont.woff \
  public/fonts/sumpfdeutschensportschriftsdin/sumpfdeutschensportschriftsdin-light-webfont.woff2 \
  public/fonts/sumpfdeutschensportschriftsdin/sumpfdeutschensportschriftsdin-light-webfont.woff \
  public/fonts/sumpfdeutschensportschriftsdin/sumpfdeutschensportschriftsdin-regular-webfont.woff2 \
  public/fonts/sumpfdeutschensportschriftsdin/sumpfdeutschensportschriftsdin-regular-webfont.woff \
  public/fonts/sumpfdeutschensportschriftsdin/sumpfdeutschensportschriftsdin-bold-webfont.woff2 \
  public/fonts/sumpfdeutschensportschriftsdin/sumpfdeutschensportschriftsdin-bold-webfont.woff
  do
  if [ ! -f "$file" ]; then
    echo "Missing expected font: $file" >&2
    missing=1
  fi
done

if [ "$missing" -eq 1 ]; then
  exit 1
fi

echo "Fonts installed successfully."
