/**
 * Combined compat layer for XML and PNG writer
 */

import { DOMParser } from '@xmldom/xmldom';
// Combined compat layer for XML and PNG writer
export const ET = DOMParser;

let PNGWriter;
try {
  // Try to load pngjs PNG
  const { PNG } = await import('pngjs');
  PNGWriter = PNG;
} catch {
  PNGWriter = null;
}
