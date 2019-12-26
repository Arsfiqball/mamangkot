import io from 'socket.io-client'

export default io(process.env.VUE_APP_SOCKET_HOST || 'http://localhost:3000')
