import React from 'react';
import { WebView } from 'react-native-webview';

/** Native: sandboxed WebView with JavaScript disabled. */
export default function HtmlPreview({ html }: { html: string }) {
  return <WebView originWhitelist={['about:*']} source={{ html }} javaScriptEnabled={false} domStorageEnabled={false} style={{ flex: 1, minHeight: 360 }} />;
}
