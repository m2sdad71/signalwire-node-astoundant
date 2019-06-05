var client;
var cur_call = null;

var username = localStorage.getItem('verto.example.username') || '1008';
var password = localStorage.getItem('verto.example.password') || '1234';
var domain = localStorage.getItem('verto.example.domain') || window.location.hostname;
var resource = localStorage.getItem('verto.example.resource') || 'test';
var host = localStorage.getItem('verto.example.host') || window.location.host;
var client = localStorage.getItem('verto.example.client') || 'sw';
var number = localStorage.getItem('verto.example.number') || '9196';
var audio = localStorage.getItem('verto.example.audio') || '1';
var video = localStorage.getItem('verto.example.video') || '1';

ready(function() {
  document.getElementById('username').value = username;
  document.getElementById('password').value = password;
  document.getElementById('domain').value = domain;
  document.getElementById('resource').value = resource;
  document.getElementById('host').value = host;
  document.getElementById('number').value = number;
  document.getElementById('client_' + client).checked = true;
  document.getElementById('audio').checked = audio === '1';
  document.getElementById('video').checked = video === '1';
});

function disconnect() {
  connectStatus.innerHTML = 'disconnecting..'
  client.disconnect()
}

function connect() {
  host = document.getElementById('host').value;
  domain = document.getElementById('domain').value;
  resource = document.getElementById('resource').value;
  username = document.getElementById('username').value;
  password = document.getElementById('password').value;
  client = document.querySelector('input[name="client"]:checked').value;
  login = username + '@' + domain;

  var klass = client === 'sw' ? Relay : Verto

  client = new klass({
    host: host,
    login: login,
    password: password,
    project: username,
    token: password,
    domain: domain,
    resource: resource,
  });

  client.remoteElement = 'remoteVideo'

  client.on('signalwire.ready', function() {
    btnConnect.disabled = true
    btnDisconnect.disabled = false
    connectStatus.innerHTML = 'connected!'
    callCommands.style.display = 'block'

    startCall.disabled = false
  });

  client.on('signalwire.socket.open', function() {
    console.log('socket connected')
  });

  client.on('signalwire.socket.close', function() {
    console.log('socket disconnected')
    btnConnect.disabled = false
    btnDisconnect.disabled = true
    connectStatus.innerHTML = 'disconnected'
    callCommands.style.display = 'none'
  });

  client.on('signalwire.error', function(error){
    // Handle error
    console.warn("SignalWire error", error);
  });

  client.on('signalwire.notification', handleNotification);

  connectStatus.innerHTML = 'connecting..'
  client.connect()
}

function handleNotification(notification) {
  // console.log("notification", notification.type, notification);
  switch (notification.type) {
    case 'dialogUpdate':
      handleDialogChange(notification.dialog)
      break
    case 'conferenceUpdate':
      handleConferenceUpdate(notification)
      break
    case 'participantData':
      // Caller's data like name and number to update the UI. In case of a conference call you will get the name of the room and the extension.
      break
    case 'vertoClientReady':
      // All previously dialogs have been reattached. Note: FreeSWITCH 1.8+ only.
      break
    case 'userMediaError':
      // Permission denied or invalid audio/video params on `getUserMedia`
      break
    case 'event':
      // Generic notification received
      break
  }
}

function handleDialogChange(dialog) {
  // Update the UI when this dialog's state change:

  // console.log("dialog.state", dialog.state);

  cur_call = dialog;

  switch (dialog.state) {
    case 'new':
      // Setup the UI
      break;
    case 'trying':
      // You are calling someone and he's ringing now
      break;
    case 'ringing':
      // Someone is calling you
      if (confirm('Pick up the call?')) {
        cur_call.answer()
      } else {
        cur_call.hangup()
      }
      break;
    case 'active':
      // Dialog has become active
      hangupCall.disabled = false
      remoteVideo.style.display = 'block'
      confCommands.style.display = 'block'
      // localVideo.style.display = 'block'
      startScreenShare.onclick = function() {
        dialog.startScreenShare()
      }

      break;
    case 'hangup':
      // Dialog is over
      hangupCall.disabled = true
      startCall.disabled = false

      remoteVideo.style.display = 'none'
      confCommands.style.display = 'none'
      // localVideo.style.display = 'none'

      break;
    case 'destroy':
      // Dialog has been destroyed
      cur_call = null;
      break;
  }
}

function _createLiParticipant(part) {
  var li = document.createElement('li')
  li.id = 'p-' + part.participantId
  li.appendChild(document.createTextNode(part.participantName + ' ' + part.participantNumber))
  if (cur_call.role === 'moderator') {
    var kickBtn = document.createElement('button')
    kickBtn.innerHTML = 'Kick'
    kickBtn.onclick = function () {
      cur_call.kick(part.participantId)
    }
    li.appendChild(kickBtn)
  }
  return li
}

function handleConferenceUpdate(notification) {
  switch (notification.action) {
    case 'join':
    case 'leave':
    case 'clear':
      participants.innerHTML = ''
      break
    case 'bootstrap':
      participants.innerHTML = ''
      notification.participants.forEach(function(part) {
        participants.appendChild(_createLiParticipant(part))
      })
      break
    case 'add':
      participants.appendChild(_createLiParticipant(notification))
      break
    case 'modify':
      break
    case 'delete':
      var li = document.getElementById('p-' + notification.participantId)
      if (li) {
        li.remove()
      }
      break
  }
}

function makeCall() {
  var resource = document.getElementById('resource').value;
  var domain = document.getElementById('domain').value;
  const params = {
    // Required:
    destinationNumber: document.getElementById('number').value,
    remoteCallerName: 'Joe Example',
    remoteCallerNumber: 'joe@example.com',
    callerName: resource,
    callerNumber: resource + '@' + domain,

    // Optional:
    // localStream: MediaStream, // Use this stream instead of retrieving a new one. Useful if you have a stream from a canvas.captureStream() or from a screen share extension.
    audio: document.getElementById('audio').checked,
    video: document.getElementById('video').checked,
    // iceServers: true || false || RTCIceServer[], // https://developer.mozilla.org/en-US/docs/Web/API/RTCIceServer
    // useStereo: true || false,
    // micId: '<deviceUUID>', // Microphone device ID
    // camId: '<deviceUUID>', // Webcam device ID
    userVariables: {
      // General user variables.. email/username
    },
    onNotification: handleNotification
  }

  cur_call = client.newCall(params);
}

function hangup() {
  cur_call.hangup()
}

function save_params(e) {
  var key = e.target.name || e.target.id
  localStorage.setItem('verto.example.' + key, e.target.value);
}

// jQuery document.ready equivalent
function ready(fn) {
  if (document.readyState != 'loading') {
    fn();
  } else if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    document.attachEvent('onreadystatechange', function() {
      if (document.readyState != 'loading')
        fn();
    });
  }
}