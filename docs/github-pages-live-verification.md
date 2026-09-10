# GitHub Pages live verification

The GitHub Pages deployment initially loaded the JavaScript bundle from root-relative `/assets/...` paths, causing a blank page under `/bluelegacy-social/`. Vite now emits `/bluelegacy-social/assets/...` paths, and wouter is configured with the same base path.

The live deployment workflow completed successfully. A cache-busted browser visit to `https://lts4all.github.io/bluelegacy-social/?v=3a480cd` rendered the BlueLegacy registration screen with username, password, and age fields. The plain URL may temporarily show the previously cached 404 view in an existing browser tab; a hard refresh or opening the versioned URL loads the corrected deployment. Curl confirmed the current plain URL HTML references the corrected `/bluelegacy-social/assets/` paths and the JavaScript asset returns HTTP 200.

A fresh navigation and hard refresh of the normal URL in the connected browser still displayed the stale 404 bundle, while the cache-busted URL rendered Home. This indicates a GitHub/CDN/browser cache layer retaining the older index or bundle. The current server response from curl is already corrected; the reliable immediate workaround is the versioned URL, and the iOS app should append a deployment version query when opening GitHub Pages.
