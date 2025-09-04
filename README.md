# QRCodeAPI

## Overview
QRCodeAPI is a simple, open-source QR Code Generator API built from scratch. It supports generating QR codes in PNG, SVG, ASCII, and JSON formats. Hosted on Vercel and open to anyone.

## Features
- Generate QR codes via a REST API
- Output formats: PNG, SVG, ASCII (terminal), JSON (matrix)
- Rate limiting for public safety
- Easy to deploy on Vercel

## API Usage

### Endpoint
`POST /api/generate`

### Request Body
Send a JSON object with at least a `text` field:

```json
{
	"text": "Hello World",
	"type": "png" // or "svg", "ascii", "json"
}
```

#### Optional fields (for PNG/SVG):
- `color`: Foreground color (default: `#000`)
- `bgColor`: Background color (default: `#fff`)
- `width`, `height`: Output size (PNG only)

### Example (PowerShell)
```powershell
Invoke-RestMethod -Uri "https://<your-app-ip>/api/generate" -Method POST -ContentType "application/json" -Body '{"text":"Hello World","type":"svg"}'
```

### Example (curl)
```sh
curl -X POST https://<your-app-ip>/api/generate \
		-H "Content-Type: application/json" \
		-d '{"text":"Hello World","type":"png"}' --output qrcode.png
```

## Example QR Codes

### 1. Website URL (example.com)
```powershell
Invoke-RestMethod -Uri "https://<your-app-ip>/api/generate" -Method POST -ContentType "application/json" -Body '{"text":"https://example.com","type":"png"}' --OutFile "example_com.png"
```

### 2. WiFi QR Code
To encode WiFi credentials, use the following format for the `text` field:

```
WIFI:T:WPA;S:MyNetwork;P:MyPassword;;
```

Example (PowerShell):
```powershell
Invoke-RestMethod -Uri "https://<your-app-ip>/api/generate" -Method POST -ContentType "application/json" -Body '{"text":"WIFI:T:WPA;S:MyNetwork;P:MyPassword;;","type":"svg"}' > wifi_qr.svg
```

Example (curl):
```sh
curl -X POST https://<your-app-ip>/api/generate \
		-H "Content-Type: application/json" \
		-d '{"text":"WIFI:T:WPA;S:MyNetwork;P:MyPassword;;","type":"png"}' --output wifi_qr.png
```

## Deployment

1. Clone the repo: `git clone https://github.com/raigon-pawa/QRCodeAPI.git`
2. Install dependencies: `npm install`
3. Deploy to Vercel:
	 - Import the repo in Vercel
	 - Vercel will auto-detect the `/api/generate` endpoint

## Local Development

Run locally with Express:
```sh
npm start
```
The API will be available at `http://localhost:3000/api/generate`

## License
MIT
