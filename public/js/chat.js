const socket = io();

const print = (msg) => {
    console.log(`At: ${msg.timestamp}, ${msg.text}`);
}

// website elements
const $msgTextInput = document.querySelector('#msg-form-messageTextInput');
const $msgSendBtn = document.querySelector('#msg-form-sendButton');
const $shareLocBtn = document.querySelector('#send-location');
const $messages = document.querySelector('#messages-container');

// templates
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationTemplate = document.querySelector('#location-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

// options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild;

    // height of last message
    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    // visible height
    const visibleHeight = $messages.offsetHeight;

    // height of messages container
    const containerHeight = $messages.scrollHeight;

    // how far am i scrolled down?
    const scrollOffset = $messages.scrollTop + visibleHeight;

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight;
    }
}

// populate received message from the server
socket.on('serverSendMessage', (msg) => {
    console.log(`At: ${msg.timestamp}, ${msg.text}`);
    const html = Mustache.render(messageTemplate, {
        timestamp: moment(msg.timestamp).format('H:mm:ss'),
        text: msg.text,
        username: msg.username
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
})

// notification when another user disconnects
socket.on('userLogout', (msg) => print(msg))

// room data update
socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html;
})

socket.on('serverSendLocation', (loc) => {
    const html = Mustache.render(locationTemplate, {
        lat: loc.lat,
        lon: loc.lon,
        timestamp: moment(loc.timestamp).format('H:mm:ss'),
        username: loc.username
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
})

// button on click
$msgSendBtn.addEventListener('click', (e) => {
    // prevent browser refresh (for forms)
    e.preventDefault();

    // retrieve text from input
    let msg = $msgTextInput.value;

    // don't sent if user input empty
    if (msg == "") return;

    // temporarily disable send button
    $msgSendBtn.setAttribute('disabled', 'disabled');

    // send message to the server for an update, with callback for server acknowledgement
    socket.emit('clientSendMessage', { msg, username, room }, (error) => {
        // re-enable button
        $msgSendBtn.removeAttribute('disabled');

        // clear input
        $msgTextInput.value = "";
        $msgTextInput.focus();

        if (error) return console.log(error);

        console.log('Message delivered.');
    });
})

// share location event
$shareLocBtn.addEventListener('click', (e) => {
    e.preventDefault();

    // temporarily disable button
    $shareLocBtn.setAttribute('disabled', 'disabled');

    // get location
    if (!navigator.geolocation) return alert('Geolocation is not supported by your browser.')

    navigator.geolocation.getCurrentPosition((position) => {

        // send location to the server for broadcast
        socket.emit('userSendLocation', { lat: position.coords.latitude, lon: position.coords.longitude, timestamp: new Date().getTime() }, (error) => {
            // re-enable button
            $shareLocBtn.removeAttribute('disabled');

            if (error) return console.log(error);

            console.log("Location shared successfully!");
        });
    }, () => {
    })
})

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error);
        location.href = '/';
    }
});