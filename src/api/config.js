// Config parsing helper for QR code API
export function parseConfig(type, body) {
  if (!body.text) throw new Error('Missing text field');
  if (type === 'png') {
    return {
      text: body.text,
      width: body.width || 256,
      height: body.height || 256,
      color: body.color || '#000',
      bgColor: body.bgColor || '#fff',
    };
  } else if (type === 'svg') {
    return {
      text: body.text,
      color: body.color || '#000',
      bgColor: body.bgColor || '#fff',
    };
  } else if (type === 'ascii') {
    return {
      text: body.text,
      invert: !!body.invert,
    };
  }
  throw new Error('Invalid type');
}