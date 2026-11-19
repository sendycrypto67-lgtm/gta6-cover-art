# Poster Cover Studio

![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)
![rank](https://make.fun/badge/gta6-cover-art-01/sendycrypto67-lgtm/gta6-cover-art/rank.svg)
![reward](https://make.fun/badge/gta6-cover-art-01/sendycrypto67-lgtm/gta6-cover-art/reward.svg)

Turn your photos into GTA 6-style multi-panel cover art, free and offline.

Entry for [gta6-cover-art-01 on make.fun](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Four poster layouts**: single hero, diagonal split, hero plus two, and a
  four-panel grid, the multi-panel look of the GTA 6 cover.
- **Any photo, any panel**: upload your own photo per panel or use the two
  bundled samples. Drag a photo to move it inside its panel, zoom with the
  slider.
- **Colour grades per panel**: Sunset (orange-purple Vice City), Neon
  (magenta-cyan), Noir, and Natural, applied with canvas filters and gradient
  overlays.
- **Editable caption**: big bold lettering with outline and shadow, top or
  bottom. The lettering is DejaVu Sans Bold, a freely licensed font bundled
  in `app/fonts/` (see `app/fonts/LICENSE-DejaVu.txt`).
- **Export PNG** in the common post sizes: 1080 x 1080, 1080 x 1350, and
  1920 x 1080, one button each.

## Privacy

Everything runs in your browser. Photos are read locally and never uploaded,
there is no network request at all, and nothing is stored on a server.

## Try it

```sh
node serve.ts
```

Then open http://localhost:8080.

## Screenshots

- `screenshots/1-cover.jpg`: a four-panel grid cover, 1080 x 1080.
- `screenshots/2-editor.jpg`: the editor with a photo loaded.
- `screenshots/3-cover.jpg`: a diagonal split cover, 1080 x 1080.
- `screenshots/4-cover.jpg`: a single hero cover, 1080 x 1350.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Notes

A fan-made tool, not affiliated with Rockstar Games. No Rockstar logo,
official artwork, or Rockstar font is used. The two sample photos were made
for make.fun with an image model and are free to use.
