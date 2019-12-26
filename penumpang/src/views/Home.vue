<template>
  <div class="home">
    <div>
      <div ref="map_element" style="width: 100%; height: calc(100vh - 120px);"></div>
    </div>
    <div style="padding: 2rem;">
      <div @click="refresh()" class="button is-fullwidth is-link">
        Cari Angkot
      </div>
    </div>
  </div>
</template>

<script>
import socket from '../socket'
import L from 'leaflet'
import { Plugins } from '@capacitor/core'

const { Geolocation } = Plugins
const isAvailable = Capacitor.isPluginAvailable('Geolocation')

const source = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const attribution = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const state = {
  map: null,
  markerUser: null,
  markerCircle: null,
  markers: {},
}

export default {
  name: 'home',

  components: {
  },

  data () {
    return {
      geoID: null
    }
  },

  mounted () {
    const tileLayer = new L.TileLayer(source, { attribution })
    const initCoords = [-6.032676394740438, 106.06046800205338]

    state.map = new L.Map(this.$refs.map_element, {
      'center': initCoords,
      'zoom': 13,
      'layers': [tileLayer]
    })

    this.turnOnGPS()
    socket.on('supir.reply.all', this.handleSupirListUpdate)
    socket.on('supir.updated', this.handleSupirUpdated)
    socket.on('supir.removed', this.handleSupirRemoved)
  },

  destroyed () {
    Object.keys(state.markers).map(id => {
      state.markers[id].remove()
    })

    state.markers = {}
    this.turnOffGPS()
    state.map = null
  },

  methods: {
    handleSupirListUpdate (data) {
      Object.keys(state.markers).map(id => {
        state.markers[id].remove()
      })

      state.markers = {}

      Object.keys(data.list).map(id => {
        this.createMarker(id, data.list[id])
      })
    },

    handleSupirUpdated (data) {
      if (!state.markers[data.id]) {
        this.createMarker(data.id, data)
      } else {
        state.markers[data.id].setLatLng(L.latLng(data.latitude, data.longitude))
        state.markers[data.id].setStyle({ color: data.full ? '#e84118' : '#fbc531' })
      }
    },

    handleSupirRemoved (data) {
      if (state.markers[data.id]) {
        state.markers[data.id].remove()
        delete state.markers[data.id]
      }
    },

    refresh () {
      socket.emit('supir.ask.all')
    },

    createMarker (id, { latitude, longitude, full }) {
      state.markers[id] = L
        .circleMarker([latitude, longitude], { radius: 4, fill: true, fillOpacity: 1, color: full ? '#e84118' : '#fbc531' })
        .addTo(state.map)
    },

    turnOnGPS () {
      const opts = { enableHighAccuracy: true }

      this.geoID = Geolocation.watchPosition(opts, (position, err) => {
        const { latitude, longitude, accuracy } = position.coords
        const leafletCoordinate = L.latLng(latitude, longitude)

        // Current user's device marker
        if (!state.markerUser) {
          state.markerUser = L
            .circleMarker(leafletCoordinate, { radius: 4, fill: true, fillOpacity: 1, color: '#4cd137' })
            .addTo(state.map)

          state.map.setView([latitude, longitude], 16)
        } else {
          state.map.setView([latitude, longitude])
          state.markerUser.setLatLng(leafletCoordinate)
        }

        // Current user's device accuracy
        if (!state.markerUserCircle) {
          state.markerUserCircle = L
            .circle(leafletCoordinate, position.coords.accuracy)
            .addTo(state.map)
        } else {
          state.markerUserCircle.setLatLng(leafletCoordinate)
          state.markerUserCircle.setRadius(position.coords.accuracy)
        }
      })
    },

    turnOffGPS () {
      if (this.geoID) Geolocation.clearWatch({ id: this.geoID })
      if (state.markerUser) state.markerUser.remove()
      if (state.markerUserCircle) state.markerUserCircle.remove()

      this.geoID = null
      state.markerUser = null
      state.markerUserCircle = null
    }
  }
}
</script>
