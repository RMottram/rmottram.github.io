# App landing pages

`index.html` is the portfolio home page. Each app is a **flat HTML file at the
site root**, matching `umbriel.html`, so it gets a clean URL:

```
index.html      →   ryanmottram.github.io/          (portfolio home)
apps.html       →   ryanmottram.github.io/apps.html (apps directory)
umbriel.html    →   ryanmottram.github.io/umbriel.html
juicebox.html   →   ryanmottram.github.io/juicebox.html
```

All app pages share:

- `css/app.css`    — the modern dark (Monokai) landing styling
- `scripts/app.js` — FAQ accordion, scroll animations, footer year

Because the pages sit at the root, all paths are root-relative — `css/app.css`,
`assets/...`, `index.html` — with no `../`.

## Add a new app in 4 steps

1. **Copy the template to the root:**

   ```
   cp templates/app-template.html <appname>.html
   ```

2. **Fill in the placeholders.** Find & replace every `{{PLACEHOLDER}}` in the new
   file. Key ones:

   | Placeholder | What to put |
   |---|---|
   | `{{APP_NAME}}` | App name, e.g. `Juicebox` |
   | `{{APP_TAGLINE}}` | One-line pitch |
   | `{{APP_CATEGORY}}` | Small label above the title, e.g. `iOS · Productivity` |
   | `{{APP_SLUG}}` | Lowercase name used for the theme class, e.g. `juicebox` |
   | `{{ICON_IMG}}` | App icon file in `/assets` |
   | `{{SCREEN_1..3}}` | Screenshot files in `/assets` |
   | `{{DEMO_VIDEO}}` | Optional demo `.mp4` in `/assets` |
   | `{{APP_STORE_URL}}` | App Store link |
   | `{{FEATURE_x_*}}` | Feature card icon (FontAwesome name), title, text |
   | `{{FAQ_x_Q/A}}` | FAQ questions & answers |

   Add or remove `.feature-card`, `.shots img`, and `.faq-item` blocks freely —
   the layout adapts.

3. **Add the images** to `/assets`.

4. **List it** on the apps index: add a `.app-card` block in `apps.html`.

## Theming

All styling lives in `css/app.css` — no inline styles or `<style>` blocks.
Each app's accent is a theme class near the bottom of `app.css`:

```css
.theme-juicebox { --accent: #ff9f1c; --accent-2: #f92672; }
```

Add a matching rule for your app, then put the class on `<body>`:

```html
<body class="app-page theme-juicebox">
```

Everything else (backgrounds, borders, text) is shared, so all apps stay
visually consistent while each keeps its own accent.

> `juicebox.html` is a live worked example — copy it if you prefer starting from
> filled-in content rather than raw placeholders.
