const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const config = getDefaultConfig(__dirname)

config.resolver.alias = {
  '@core': path.resolve(__dirname, 'core'),
  '@modules': path.resolve(__dirname, 'modules'),
}

// Allow .wasm files to be served as static assets on web
config.resolver.assetExts = [...(config.resolver.assetExts ?? []), 'wasm']

module.exports = withNativeWind(config, { input: './global.css' })
