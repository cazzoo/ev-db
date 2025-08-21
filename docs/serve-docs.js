#!/usr/bin/env node

/**
 * Simple HTTP server to serve OpenAPI documentation with Swagger UI
 * Usage: node serve-docs.js [port]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.argv[2] || 8080;
const DOCS_DIR = __dirname;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

// Simple HTML page with Swagger UI
const swaggerHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>EV Database API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
    .swagger-ui .topbar {
      background-color: #2c3e50;
    }
    .swagger-ui .topbar .download-url-wrapper .download-url-button {
      background-color: #34495e;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/openapi.yaml',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        validatorUrl: null,
        tryItOutEnabled: true,
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        onComplete: function() {
          console.log('Swagger UI loaded successfully');
        },
        onFailure: function(error) {
          console.error('Failed to load Swagger UI:', error);
        }
      });
    };
  </script>
</body>
</html>
`;

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Handle root path
  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(swaggerHTML);
    return;
  }

  // Handle file requests
  const filePath = path.join(DOCS_DIR, pathname);
  
  // Security check - ensure file is within docs directory
  if (!filePath.startsWith(DOCS_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }

    // Get file extension and MIME type
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    // Read and serve file
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
        return;
      }

      res.writeHead(200, { 
        'Content-Type': mimeType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      res.end(data);
    });
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`📚 OpenAPI Documentation Server running at:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   http://localhost:${PORT}/openapi.yaml`);
  console.log(`   http://localhost:${PORT}/API_DOCUMENTATION.md`);
  console.log('');
  console.log('Available files:');
  console.log('   - openapi.yaml (Main API specification)');
  console.log('   - openapi-admin.yaml (Admin endpoints)');
  console.log('   - openapi-schemas.yaml (Additional schemas)');
  console.log('   - API_DOCUMENTATION.md (Comprehensive documentation)');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n📚 Documentation server stopped');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\\n📚 Documentation server stopped');
  process.exit(0);
});
