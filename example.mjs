import http from "http";
const port = 8080

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  })

  res.end('Hello!')
})

server.listen(port, () => {
  console.log('started listening on port', port)
})
