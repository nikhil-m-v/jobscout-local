# Glass material and responsive layout

Use Apple's material language as inspiration while retaining JobScout's identity. This is a CSS glass treatment inside the Windows webview, not Apple's native Liquid Glass renderer.

## Material rules

- Navigation, the top bar, and the hero use translucent fills, static background color washes, a bright rim, and restrained blur when supported.
- Content panels stay more opaque. Text, status messages, and actions retain the semantic theme colors.
- Shared light/dark material tokens live in `apps/desktop/src/styles/glass.css`. Base layout and typography remain in `styles.css`.
- Controls have distinct hover, selected, keyboard-focus, disabled, and pressed states. Native appearance selection remains keyboard accessible.
- Blur applies to only three surfaces. Do not animate filters, add continuous reflection animations, or update the layout on pointer movement. Actual GPU performance requires measurement on target Windows hardware.

## Window sizes and accessibility

- Wide windows use labeled navigation and three starting cards.
- Compact windows use named icon navigation and vertically arranged cards. The illustration is removed when it would compete with content.
- Settings rows wrap and controls retain useful touch/click targets. The header stays available while scrolling.
- Unsupported blur uses opaque theme surfaces. Reduced-transparency and increased-contrast preferences disable the glass effect where the webview exposes those preferences. Forced-color mode uses system colors and visible borders.
- Existing reduced-motion preferences continue to disable transitions and animations.
- Keep model-download progress, file pickers, and future search/results screens consistent with these materials as they are implemented.

## Release boundary

Browser preview screenshots demonstrate the interface. Native Windows rendering, OS preference propagation, installer behavior, and performance remain separate release checks.
