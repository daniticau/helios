/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'HeliosWidget',
  displayName: 'Helios',
  bundleIdentifier: '.widget',
  deploymentTarget: '17.0',
  frameworks: ['SwiftUI', 'WidgetKit'],
  colors: {
    $accent: '#f5d76e',
    $widgetBackground: '#0f0f0f',
    actionGreen: '#4ade80',
    actionYellow: '#fbbf24',
    actionBlue: '#60a5fa',
    actionGray: '#6b7280',
    textPrimary: '#ffffff',
    textMuted: '#aaaaaa',
    textDim: '#666666',
  },
  entitlements: {
    'com.apple.security.application-groups':
      config.ios?.entitlements?.['com.apple.security.application-groups'] ?? [
        'group.com.helios.app',
      ],
  },
});
