const http = require('node:http');
const net = require('node:net');

const mainTarget = { host: '127.0.0.1', port: 3001 };
const devTarget = { host: '127.0.0.1', port: 3002 };
const listenPort = Number(process.env.ROUTER_PORT || '3000');

const targetByHost = new Map([
  ['chinesearizona.com', mainTarget],
  ['www.chinesearizona.com', mainTarget],
  ['dev.chinesearizona.com', devTarget],
]);

function normalizeHost(value) {
  if (!value) {
    return '';
  }

  const firstValue = String(value).split(',')[0]?.trim() ?? '';
  return firstValue.split(':')[0].toLowerCase();
}

function resolveTarget(headers) {
  const host =
    normalizeHost(headers['x-forwarded-host']) || normalizeHost(headers.host);

  return targetByHost.get(host) ?? mainTarget;
}

function writeBadGateway(responseLike) {
  try {
    responseLike.writeHead?.(502, { 'content-type': 'text/plain; charset=utf-8' });
    responseLike.end?.('Bad Gateway');
  } catch {
    responseLike.destroy?.();
  }
}

const server = http.createServer((request, response) => {
  const target = resolveTarget(request.headers);
  const proxyRequest = http.request(
    {
      host: target.host,
      port: target.port,
      method: request.method,
      path: request.url,
      headers: request.headers,
    },
    (proxyResponse) => {
      response.writeHead(
        proxyResponse.statusCode ?? 502,
        proxyResponse.statusMessage,
        proxyResponse.headers
      );
      proxyResponse.pipe(response);
    }
  );

  proxyRequest.on('error', () => {
    writeBadGateway(response);
  });

  request.on('aborted', () => {
    proxyRequest.destroy();
  });

  request.pipe(proxyRequest);
});

server.on('upgrade', (request, socket, head) => {
  const target = resolveTarget(request.headers);
  const upstream = net.connect(target.port, target.host, () => {
    let rawHeaders = `${request.method} ${request.url} HTTP/${request.httpVersion}\r\n`;

    for (const [key, value] of Object.entries(request.headers)) {
      if (typeof value === 'undefined') {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          rawHeaders += `${key}: ${item}\r\n`;
        }
      } else {
        rawHeaders += `${key}: ${value}\r\n`;
      }
    }

    rawHeaders += '\r\n';
    upstream.write(rawHeaders);

    if (head.length > 0) {
      upstream.write(head);
    }

    socket.pipe(upstream).pipe(socket);
  });

  upstream.on('error', () => {
    try {
      socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
    } catch {}
    socket.destroy();
  });

  socket.on('error', () => {
    upstream.destroy();
  });
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

server.listen(listenPort, '127.0.0.1', () => {
  process.stdout.write(
    `ChineseArizona host router listening on 127.0.0.1:${listenPort}\n`
  );
});
