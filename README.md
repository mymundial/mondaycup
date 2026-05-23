# Monday Cup home fonts + UI update

Drop these folders into your project root:

- `src/components/selection/SelectionScreens.jsx`
- `src/index.css`
- `scripts/install-fonts.sh`
- `public/fonts/` folder structure

Then place your two uploaded fontkit zip files in the project root:

- `webfontkit-intodotmatrix.zip`
- `webfontkit-sumpfdeutschensportschriftsdin.zip`

Run:

```bash
bash scripts/install-fonts.sh
npm run build
```

Expected final font paths:

```txt
public/fonts/intodotmatrix/intodotmatrix-webfont.woff2
public/fonts/intodotmatrix/intodotmatrix-webfont.woff
public/fonts/sumpfdeutschensportschriftsdin/sumpfdeutschensportschriftsdin-light-webfont.woff2
public/fonts/sumpfdeutschensportschriftsdin/sumpfdeutschensportschriftsdin-light-webfont.woff
public/fonts/sumpfdeutschensportschriftsdin/sumpfdeutschensportschriftsdin-regular-webfont.woff2
public/fonts/sumpfdeutschensportschriftsdin/sumpfdeutschensportschriftsdin-regular-webfont.woff
public/fonts/sumpfdeutschensportschriftsdin/sumpfdeutschensportschriftsdin-bold-webfont.woff2
public/fonts/sumpfdeutschensportschriftsdin/sumpfdeutschensportschriftsdin-bold-webfont.woff
```
