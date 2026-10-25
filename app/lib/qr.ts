import qrcode from 'qrcode-generator'

// A QR code for a link, as SVG markup made on the server, so the printed sheet needs no images or scripts.
export function qrSvg(url: string): string {
  const code = qrcode(0, 'M')
  code.addData(url)
  code.make()
  return code.createSvgTag({ cellSize: 3, margin: 2, scalable: true })
}
