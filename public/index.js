const socket = io.connect();
//"ws://localhost:5500"

let theUUID;
let peerConnection;
let localStream;
let otherUser;
let peerID;
let otherPeerID;

let form = document.getElementById('form');
let input = document.getElementById('input');
let theMessages = document.getElementById('messages');
let onlineCounter = document.querySelector('h3');

let joined = false;
let waitingOnConnection = false;
let videoOn;

const myPeer = new Peer();

socket.on('oc', (oc) => {
  console.log('oc = ' + oc);
  onlineCounter.innerHTML = 'Users online: ' + oc;
});

form.addEventListener('submit', function (e) {
  e.preventDefault();
  if (input.value && joined) {
    //if not blank
    let msg = input.value;
    console.log(msg);
    socket.emit('message', msg);
    let item = document.createElement('li');
    item.innerHTML = "<h4 id='you'>You: </h4>" + msg;
    messages.appendChild(item);
    input.value = ''; //clear
    theMessages.scrollTo(0, theMessages.scrollHeight);
  } else if (waitingOnConnection) {
    serverMsg('Waiting for stranger');
  } else if (!joined) {
    serverMsg('You havent joined a Room yet! Please click "New Room"');
  } else {
    serverMsg('You cannot send a blank message.');
  }
});

socket.on('message', function (msg, servermsg) {
  console.log(msg);

  if (servermsg) {
    serverMsg(msg);
  } else {
    strangerMsg(msg);
  }
});

myPeer.on('open', (id) => {
  peerID = id;
  console.log('peerID = ' + peerID);
});

socket.on('connect', () => {
  navigator.getUserMedia =
    navigator.getUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.msGetUserMedia;
  const constraints = {
    video: {
      width: {
        min: 480,
        max: 1280,
      },
      aspectRatio: 1.33333,
    },
    audio: true,
  };
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      console.log('Got MediaStream:', stream);
      localStream = stream;
      document.getElementById('local-video').srcObject = localStream;
      if (!localStream.active) {
        videoOn = false;
        console.log('No Video!');
        serverMsg(
          'Webcam not detected, please refresh page and make sure your webcam permission are correctly set! (Chrome works best)'
        );
        localStream = {};
        console.log('localStream: ' + localStream);
      } else {
        videoOn = true;
        console.log('Video is on');
      }
    })
    .catch((error) => {
      console.error('Error accessing media devices.', error);
      videoOn = false;
      console.log('No Video!');
      serverMsg(
        'Webcam not detected, please refresh page and make sure your webcam permission are correctly set! (Chrome works best)'
      );
    });
});

function joinRoom() {
  serverMsg('Searching for a stranger...');
  waitingOnConnection = true;
  joined = false;
  console.log('peerID = ' + peerID);
  socket.emit('join room', peerID, videoOn);

  document.getElementById('remote-video').srcObject = undefined;
  myPeer.on('call', (call) => {
    console.log('call' + call);
    console.log('localStream' + localStream);
    call.answer(localStream);

    call.on('stream', (theStream) => {
      console.log('theStream' + theStream);
      document.getElementById('remote-video').srcObject = theStream;
    });
  });
}

socket.on('user joined', (id, pid, vOn) => {
  //host
  otherPeerID = pid;
  console.log('User connected: ' + id + ' ' + pid+ '= ' +vOn);
  socket.emit('send peerid', id, peerID);
  theMessages.innerHTML = '';
  try {
    connectToNewUser(pid, localStream);
  } catch (e) {
    console.log('Error connecting to User: ' + e);
    serverMsg(
      'Media connection not established due to your webcam having an issue, Chat only.'
    );
    socket.emit(
      'message',
      'Media connection not established due to stranger having a webcam error, He cannot see or hear you, Chat only.',
      true
    );
  }
  serverMsg('Connected to a stranger, say hi!');
  joined = true;
  waitingOnConnection = false;
  if (!vOn) {
    document.getElementById('vidoff').innerHTML = 'Stranger has no video';
  }
  otherUser = id; //handshake
});
function connectToNewUser(pid, stream) {
  console.log('connectToNewUser');
  console.log('pid = ' + pid + ' stream = ' + stream);

  const call = myPeer.call(pid, stream);
  call.on('stream', (theStream) => {
    document.getElementById('remote-video').srcObject = theStream;
  });
}
socket.on('other user', (ou, vOn) => {
  theMessages.innerHTML = '';
  console.log('you joined: ' + ou);
  joined = true;
  waitingOnConnection = false;
  serverMsg('Connected to a stranger, say hi!');
  if (!vOn) {
    document.getElementById('vidoff').innerHTML = 'Stranger has no video';
  }
  otherUser = ou;
});

socket.on('dc', (msg) => {
  console.log(msg);
  document.getElementById('remote-video').srcObject = undefined;
  joined = false;
  serverMsg('User has disconnected, click "New Room"');
  document.getElementById('vidoff').innerHTML = '';
});

socket.on('other peer', (pid) => {
  //joiner
  console.log('pid ' + pid);
  otherPeerID = pid;
});

function serverMsg(msg) {
  let item = document.createElement('li');
  item.innerHTML = "<h4 id='server'>Server: </h4>" + msg;
  messages.appendChild(item);
  theMessages.scrollTo(0, theMessages.scrollHeight);
}

function strangerMsg(msg) {
  let item = document.createElement('li');
  item.innerHTML = '<h4>Stranger: </h4>' + msg;
  messages.appendChild(item);
  theMessages.scrollTo(0, theMessages.scrollHeight);
}