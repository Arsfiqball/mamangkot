var app = require('http').createServer(handler)
var io = require('socket.io')(app)
var fs = require('fs').promises

app.listen(process.env.SERVICE_PORT || 3000, process.env.SERVICE_IP || '127.0.0.1')

async function handler (req, res) {
  try {
    const data = await fs.readFile(__dirname + '/index.html')
    res.writeHead(200)
    res.end(data)
  } catch (e) {
    res.writeHead(500)
    return res.end('Error loading index.html')
  }
}

const state = { counter: 0, supirs: {} }

io.on('connection', function (socket) {
  if (state.counter < 999999999) {
    state.counter++
  } else {
    state.counter = 1
  }

  const id = state.counter

  socket.on('supir.ask.all', function (data) {
    socket.emit('supir.reply.all', { list: state.supirs })
  })

  socket.on('supir.update', function (data) {
    state.supirs[id] = data
    io.emit('supir.updated', { id, ...state.supirs[id] })
  })

  socket.on('disconnect', function () {
    if (state.supirs[id]) {
      io.emit('supir.removed', { id })
      delete state.supirs[id]
    }
  })

  socket.on('supir.remove', function () {
    if (state.supirs[id]) {
      io.emit('supir.removed', { id })
      delete state.supirs[id]
    }
  })
})
