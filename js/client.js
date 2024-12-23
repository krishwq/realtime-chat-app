const socket=io('https://realtime-chat-server-3c8b.onrender.com');
const form=document.getElementById('send-container');
const message=document.getElementById('message');
const messagecontainer=document.querySelector(".chatcontainer");
const button = document.getElementById('button');
const navName = document.getElementById('nav-name');
const scrollToButtom = document.getElementById('bottom');
const numberOfParticipant=document.getElementById('numberOfParticipant');
const stopRecordingButton = document.getElementById('stopRecording');
const recordbox=document.getElementById('record');
const timer=document.getElementById('timer');
const audio=new Audio('ding.mp3');

//for time
const now = new Date();
const hours = now.getHours(); // 0-23
const minutes = now.getMinutes(); // 0-59
// Format hours and minutes to ensure two digits
const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

//entry point
const username = prompt("Enter your name to join:");
//check username is exist or not
if(username){
    socket.emit('new-user-joined', username);
}
else{
    alert("Please enter a username to join!");
    location.href="index.html";
}

//change on input field
const change = (e) => {
    message.value = e.target.value;
    toggleButton(); // Update button state dynamically
};

//scroll to bottom
scrollToButtom.addEventListener('click', () => {
    messagecontainer.scrollTo({
        behavior:'smooth',
        top: messagecontainer.scrollHeight
    });
})
//to set initially
if(messagecontainer.scrollTop + messagecontainer.clientHeight === messagecontainer.scrollHeight){
    scrollToButtom.style.display='none';
}
else{
    scrollToButtom.style.display='flex';
}
//show scroll to bottom button
messagecontainer.addEventListener('scroll', () => {
    if (messagecontainer.scrollHeight - (messagecontainer.scrollTop + messagecontainer.clientHeight) <= 50) {
        scrollToButtom.style.display = 'none';
    } else {
        scrollToButtom.style.display = 'flex';
    }
    
});

// Add event listener to dynamically update the button state
message.addEventListener('input', change);

// Function to toggle the button's disabled state
const toggleButton = () => {
    if (message.value.trim() === "") {
        button.innerHTML = '<i class="fa-solid fa-align-center fa-rotate-90" style="color: #06ac11;font-size:24px"></i>';
    } else {
        button.innerHTML='<img src="send.png" alt="send" class="sendimg">';
    }
};

// Initialize button state on page load
toggleButton();

//handle form submission
function handleForm(event) {
    event.preventDefault(); 
    const messageinp = message.value;
    if(messageinp!="") {
    socket.emit('send', messageinp);
    message.value = '';
    toggleButton(); // Reset button state after sending message
    append({message:messageinp}, 'right');
    }
} 
form.addEventListener('submit', handleForm);

// Add event listener to dynamically update the button state
message.addEventListener('input', change);
// Initialize button state on page load
toggleButton();

///to append message
const append=(message,position)=>{
    if(position==='center'){
    messagecontainer.innerHTML+=`<div class="message ${position}">${message}</div>`;
    }else if(position==='right'){
        messagecontainer.innerHTML+=`<div class="message right">
                <div class="chat">${message.message}</div>
                <div class="time">${formattedTime}</div>
                </div>`;
    }else if(position==='left'){
        messagecontainer.innerHTML+=`<div class="message left">
            <div class="chatname">${message.name}</div>
            <div class="chat">${message.message}</div>
            <div class="time">${formattedTime}</div>
            </div>`;
        audio.play();
    }
    messagecontainer.scrollTo({
        behavior:'smooth',
        top: messagecontainer.scrollHeight
    });
}

//for audio player
let mediaRecorder;
let audioChunks = [];
let stopwatch; 
let isRecordingCancelled = false;


// Add event listeners for recording buttons
stopRecordingButton.addEventListener('click', stopRecording);

// Request microphone access and initialize MediaRecorder
navigator.mediaDevices.getUserMedia({ audio: true })
.then((stream) => {
    mediaRecorder = new MediaRecorder(stream);
    // Collect audio chunks while recording
    mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
    };
    // Handle actions after stopping the recording
    mediaRecorder.onstop = () => {
        if (isRecordingCancelled) {
            // If recording is canceled, clear chunks and don't send
            audioChunks = [];
            isRecordingCancelled = false; 
            return;
        }
        
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const reader = new FileReader();

    reader.onload = function () {
      const arrayBuffer = reader.result; // Convert Blob to ArrayBuffer
        socket.emit('send-audio', { buffer: arrayBuffer });
    };
    reader.readAsArrayBuffer(audioBlob); // Read the Blob as an ArrayBuffer

      // Append the audio message to the user's chat
    messagecontainer.innerHTML+=`<div class="message right">
                <audio src="${audioUrl}" controls class="myaudio"></audio>
                <div class="time">${formattedTime}</div>
                </div>`
    };
    })
    .catch((error) => {
    console.error("Error accessing microphone:", error);
    alert("Microphone access is required for recording audio.");
    });

// Start recording
function startRecording() {
    if (message.value.trim() === "") {
        audioChunks = []; // Reset chunks
        let minute=0;
        let second=0;
        timer.innerText=`00:00`;
        mediaRecorder.start();
        recordbox.style.display='flex';
        button.disabled=true;
        stopwatch=setInterval(() => {
            if(second===59){
                second=0;
                minute++;
            } else{
                second++;
            }
            timer.innerText=`${minute<10? '0':''}${minute}:${second<10? '0':''}${second}`;
        },1000);
    }
}

// Stop recording
function stopRecording() {
mediaRecorder.stop();
recordbox.style.display='none';
clearInterval(stopwatch);
button.disabled=false;
}

function deleteAudio(){
isRecordingCancelled = true; // Set flag to cancel recording
if (mediaRecorder.state === "recording") {
    mediaRecorder.stop(); // Stop the recording if it's still ongoing
}
recordbox.style.display='none';
clearInterval(stopwatch);
button.disabled=false;
}

//socket connections
//when join any participant
socket.on('user-joined',(data)=>{
let message=`${data} joins the chat`;
    append(message,'center');
});

//for update number of participant and name of aprticipant
socket.on('participant',(data)=>{
    // Extract the names from the object
    const names = Object.values(data);
    const namesString = names.join(', ');
    navName.innerText = namesString;
    const numberOfParticipants = names.length-1;
    if(numberOfParticipants>=0){
    numberOfParticipant.innerText = `${numberOfParticipants}+`;
    }else{
        numberOfParticipant.innerText = `0+`;
    }
});

//when participant leave the chat
socket.on('left',(data)=>{
    if(data!=null){
    let message=`${data} left the chat`;
        append(message,'center');
    }
});

//when user receivge message
socket.on('receive',(data)=>{
        append(data,'left');
});

// Append received audio messages
socket.on('receive-audio', (data) => {
    const { buffer, name } = data; // Destructure the received object
    const audioBlob = new Blob([buffer], { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(audioBlob);
      // Create an audio player element
    messagecontainer.innerHTML+=`<div class="message left">
    <div class="chatname">${name}</div>
    <audio src="${audioUrl}" controls class="myaudio"></audio>
    <div class="time">${formattedTime}</div>
    </div>`;
    audio.play();
    });

