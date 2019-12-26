<template>
  <div class="home">
    <div>
      <div ref="map_element" style="width: 100%; height: calc(100vh - 180px);"></div>
    </div>
    <div style="padding: 2rem;">
      <div class="buttons has-addons">
        <button @click="switchActive(false)" :class="['button is-expanded', !isActive ? 'is-dark' : null]">
          Tidak Aktif
        </button>
        <button @click="switchActive(true)" :class="['button is-expanded', isActive ? 'is-link' : null]">
          Aktif
        </button>
      </div>
      <div class="buttons has-addons">
        <button @click="switchFull(false)" :class="['button is-expanded', !isFull ? 'is-dark' : null]">
          Tidak Penuh
        </button>
        <button @click="switchFull(true)" :class="['button is-expanded', isFull ? 'is-link' : null]">
          Penuh
        </button>
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
  cached: null
}

export default {
  name: 'home',

  components: {
  },

  data () {
    return {
      isActive: false,
      isFull: false,
      cached: null,
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
  },

  methods: {
    switchActive (active) {
      this.isActive = active

      if (active) {
        this.turnOnGPS()
      } else {
        this.turnOffGPS()
      }
    },

    switchFull (full) {
      this.isFull = full

      if (state.cached) {
        socket.emit('supir.update', { ...state.cached, full: this.isFull })
      }
    },

    turnOnGPS () {
      const opts = { enableHighAccuracy: true }

      this.geoID = Geolocation.watchPosition(opts, (position, err) => {
        const { latitude, longitude, accuracy } = position.coords
        const leafletCoordinate = L.latLng(latitude, longitude)

        // Current user's device marker
        if (!state.markerUser) {
          state.markerUser = L
            .circleMarker(leafletCoordinate, { radius: 4, fill: true, fillOpacity: 1, color: '#e84118' })
            .addTo(state.map)

          state.map.setView([latitude, longitude], 17)
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

        state.cached = { latitude, longitude, accuracy }
        socket.emit('supir.update', { latitude, longitude, accuracy, full: this.isFull })
      })
    },

    turnOffGPS () {
      if (this.geoID) Geolocation.clearWatch({ id: this.geoID })
      if (state.markerUser) state.markerUser.remove()
      if (state.markerUserCircle) state.markerUserCircle.remove()

      this.geoID = null
      state.markerUser = null
      state.markerUserCircle = null

      socket.emit('supir.remove')
    }
  }
}
</script>
