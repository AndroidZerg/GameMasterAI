# Sprint 3 — Frontend Log

## A1: Fix Game Card Display Bugs
- **Fixed**: Removed duplicate title — title now only appears BELOW the card image
- **Fixed**: Long titles truncated with ellipsis (text-overflow: ellipsis, white-space: nowrap)
- **Fixed**: Card layout restructured — image area (cover art or clean colored fallback) on top, text info below
- **Fixed**: Added shimmer loading state while cover art images load
- **Files**: `GameSelector.jsx`

## A2: Real QR Code Generation
- **Added**: `qrcode` npm package for scannable QR codes
- **Replaced**: Fake SVG placeholder with real canvas-based QR rendering
- **Added**: Error correction level M for reliable scanning
- **Improved**: Print CSS — page margins, card borders, page-break-inside: avoid
- **Files**: `QRGeneratorPage.jsx`, `index.css`, `package.json`
