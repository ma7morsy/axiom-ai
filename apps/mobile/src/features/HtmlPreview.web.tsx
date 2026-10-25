import React from 'react';

/** Web: iframe with an empty sandbox (no scripts, no same-origin access to the app or its token). */
export default function HtmlPreview({ html }: { html: string }) {
  return React.createElement('iframe', { srcDoc: html, sandbox: '', title: 'Artifact preview', style: { border: 0, width: '100%', height: '100%', minHeight: 360, background: '#fff', borderRadius: 8 } });
}
