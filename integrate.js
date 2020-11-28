/*
 * Copyright 2020 Jiří Janoušek <janousek.jiri@gmail.com>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

(function (Nuvola) {
  // Create media player component
  const player = Nuvola.$object(Nuvola.MediaPlayer)

  // Handy aliases
  const PlaybackState = Nuvola.PlaybackState
  const PlayerAction = Nuvola.PlayerAction

  // Create new WebApp prototype
  const WebApp = Nuvola.$WebApp()

  // Initialization routines
  WebApp._onInitWebWorker = function (emitter) {
    Nuvola.WebApp._onInitWebWorker.call(this, emitter)

    const state = document.readyState
    if (state === 'interactive' || state === 'complete') {
      this._onPageReady()
    } else {
      document.addEventListener('DOMContentLoaded', this._onPageReady.bind(this))
    }
  }

  // Page is ready for magic
  WebApp._onPageReady = function () {
    // Connect handler for signal ActionActivated
    Nuvola.actions.connect('ActionActivated', this)

    // Start update routine
    this.update()
  }

  // Extract data from the web page
  WebApp.update = function () {
    const elms = this._getElements()
    const track = {
      title: Nuvola.queryText('div[data-test="player-container"] div[data-test="player-text"] p:last-child'),
      artist: null,
      album: Nuvola.queryText('div[data-test="player-container"] div[data-test="player-text"] p:first-child'),
      artLocation: Nuvola.queryAttribute(
        'div[data-test="player-container"] img[data-test="player-artwork-image"]',
        'src',
        src => src.replace('fit(75%2C75)', 'fit(240%2C240)')
      ),
      rating: null,
      length: this._getTimeTotal()
    }

    let state
    if (elms.pause) {
      state = PlaybackState.PLAYING
    } else if (elms.play) {
      state = PlaybackState.PAUSED
    } else {
      state = PlaybackState.UNKNOWN
    }

    player.setPlaybackState(state)

    player.setTrack(track)

    player.setCanGoPrev(!!elms.prev)
    player.setCanGoNext(!!elms.next)
    player.setCanPlay(!!elms.play)
    player.setCanPause(!!elms.pause)

    player.setTrackPosition(Nuvola.queryText('div[data-test="player-container"] div[data-test="seekbar-position"]'))
    player.setCanSeek(state !== PlaybackState.UNKNOWN && elms.progressbar)

    player.updateVolume(elms.volumebar ? elms.volumebar.value / 100 : null)
    player.setCanChangeVolume(!!elms.volumebar)

    // Schedule the next update
    setTimeout(this.update.bind(this), 500)
  }

  // Handler of playback actions
  WebApp._onActionActivated = function (emitter, name, param) {
    const elms = this._getElements()
    switch (name) {
      case PlayerAction.TOGGLE_PLAY:
        if (elms.play) {
          Nuvola.clickOnElement(elms.play)
        } else {
          Nuvola.clickOnElement(elms.pause)
        }
        break
      case PlayerAction.PLAY:
        Nuvola.clickOnElement(elms.play)
        break
      case PlayerAction.PAUSE:
      case PlayerAction.STOP:
        Nuvola.clickOnElement(elms.pause)
        break
      case PlayerAction.PREV_SONG:
        Nuvola.clickOnElement(elms.prev)
        break
      case PlayerAction.NEXT_SONG:
        Nuvola.clickOnElement(elms.next)
        break
      case PlayerAction.SEEK: {
        const total = Nuvola.parseTimeUsec(this._getTimeTotal())
        Nuvola.setInputValueWithEvent(elms.progressbar, Math.round(param / 1000000) + '.1') // event 'invalid'
        Nuvola.clickOnElement(elms.progressbar, param / total, 0.5)
        break
      }
      case PlayerAction.CHANGE_VOLUME:
        Nuvola.setInputValueWithEvent(elms.volumebar, Math.round(param * 100) + '.1') // event 'invalid'
        Nuvola.clickOnElement(elms.volumebar, param, 0.5)
        break
    }
  }

  WebApp._getElements = function () {
  // Interesting elements
    const elms = {
      play: document.querySelector(
        'div[data-test="player-container"] button[data-test="play-button"][data-test-state="PAUSED"]'),
      pause: document.querySelector(
        'div[data-test="player-container"] button[data-test="play-button"][data-test-state="PLAYING"]'),
      next: document.querySelector('div[data-test="player-container"] button[data-test="forward-30-button"]'),
      prev: document.querySelector('div[data-test="player-container"] button[data-test="back-15-button"]'),
      progressbar: document.querySelector(
        'div[data-test="player-container"] div[data-test="seekbar-container"] input'),
      volumebar: document.querySelector(
        'div[data-test="player-container"] div[data-test="volume-container"] input')
    }

    // Ignore disabled buttons
    for (const key in elms) {
      if (elms[key] && elms[key].disabled) {
        elms[key] = null
      }
    }

    return elms
  }

  WebApp._getTimeTotal = function () {
    return Nuvola.queryText('div[data-test="player-container"] div[data-test="seekbar-duration"]')
  }

  WebApp.start()
})(this) // function(Nuvola)
