const audioPlayer = document.getElementById('audioPlayer');
const albumCover = document.getElementById('albumCover');
const trackTitle = document.getElementById('trackTitle');
const albumTitle = document.getElementById('albumTitle');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const playlistElement = document.getElementById('playlist');
const newTrackUrlInput = document.getElementById('newTrackUrl');
const addTrackBtn = document.getElementById('addTrackBtn');
const seekBar = document.getElementById('seekBar');
const currentTimeDisplay = document.getElementById('currentTime');
const durationDisplay = document.getElementById('duration');

let playlist = []; // Array di oggetti: { title: '...', album: '...', trackNum: null, src: '...', coverDataUrl: null }
let currentTrackIndex = -1;
const defaultCover = 'default-cover.png'; // Assicurati di avere questo file

// --- Funzioni Principali ---

function loadTrack(index) {
    if (index < 0 || index >= playlist.length) return;

    currentTrackIndex = index;
    const track = playlist[index];

    trackTitle.textContent = track.title || 'Titolo Sconosciuto';
    albumTitle.textContent = track.album || 'Album Sconosciuto';
    albumCover.src = track.coverDataUrl || defaultCover;
    audioPlayer.src = track.src; // Imposta la sorgente audio

    // Aggiorna evidenziazione nella playlist UI
    updatePlaylistUI();

    // Non avviare automaticamente, aspetta il click su play
    // audioPlayer.play();
    // playPauseBtn.textContent = '⏸️';
    playPauseBtn.textContent = '▶️'; // Pronto per suonare
    resetSeekBar(); // Resetta la barra di avanzamento
}

function playPauseTrack() {
    if (audioPlayer.paused && audioPlayer.src) {
        audioPlayer.play().catch(error => console.error("Errore durante play:", error));
        playPauseBtn.textContent = '⏸️';
    } else {
        audioPlayer.pause();
        playPauseBtn.textContent = '▶️';
    }
}

function nextTrack() {
    let newIndex = currentTrackIndex + 1;
    if (newIndex >= playlist.length) {
        newIndex = 0; // Torna all'inizio
    }
    loadTrack(newIndex);
    audioPlayer.play().catch(error => console.error("Errore durante play next:", error)); // Auto-play sulla prossima
    playPauseBtn.textContent = '⏸️';
}

function prevTrack() {
    let newIndex = currentTrackIndex - 1;
    if (newIndex < 0) {
        newIndex = playlist.length - 1; // Vai all'ultima
    }
    loadTrack(newIndex);
    audioPlayer.play().catch(error => console.error("Errore durante play prev:", error)); // Auto-play sulla precedente
    playPauseBtn.textContent = '⏸️';
}

function sortPlaylist() {
    playlist.sort((a, b) => {
        // Priorità al numero traccia (se presente e valido)
        const trackA = parseInt(a.trackNum, 10);
        const trackB = parseInt(b.trackNum, 10);

        if (!isNaN(trackA) && !isNaN(trackB)) {
            return trackA - trackB;
        }
        if (!isNaN(trackA) && isNaN(trackB)) return -1; // A ha traccia, B no -> A viene prima
        if (isNaN(trackA) && !isNaN(trackB)) return 1;  // B ha traccia, A no -> B viene prima

        // Fallback: ordinamento per titolo (o nome file se titolo non c'è)
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
    });
}

function updatePlaylistUI() {
    playlistElement.innerHTML = ''; // Pulisci la lista attuale
    playlist.forEach((track, index) => {
        const li = document.createElement('li');
        li.textContent = `${track.trackNum ? track.trackNum + '. ' : ''}${track.title || 'Traccia Sconosciuta'} - ${track.album || 'Album Sconosciuto'}`;
        li.dataset.index = index; // Salva l'indice per il click
        if (index === currentTrackIndex) {
            li.classList.add('active');
        }
        li.addEventListener('click', () => {
            loadTrack(index);
            audioPlayer.play().catch(error => console.error("Errore play da playlist:", error));
            playPauseBtn.textContent = '⏸️';
        });
        playlistElement.appendChild(li);
    });
}

function addTrackFromUrl(url) {
    if (!url) return;

    console.log("Tentativo di leggere tag da:", url);
    statusMessage("Caricamento tag..."); // Feedback per l'utente

    // Usa jsmediatags per leggere i tag
    window.jsmediatags.read(url, {
        onSuccess: function(tag) {
            console.log("Tag letti:", tag.tags);
            const tags = tag.tags;

            let coverDataUrl = defaultCover;
            if (tags.picture) {
                let base64String = "";
                for (let i = 0; i < tags.picture.data.length; i++) {
                    base64String += String.fromCharCode(tags.picture.data[i]);
                }
                coverDataUrl = "data:" + tags.picture.format + ";base64," + window.btoa(base64String);
            }

            const trackNumStr = tags.track || ''; // Es: "1/10" o "1"
            const trackNum = trackNumStr ? parseInt(trackNumStr.split('/')[0], 10) : null; // Estrai solo il numero traccia

            const newTrack = {
                title: tags.title || 'Titolo Sconosciuto',
                album: tags.album || 'Album Sconosciuto',
                artist: tags.artist || 'Artista Sconosciuto', // Anche se non mostrato, può essere utile
                trackNum: trackNum,
                src: url,
                coverDataUrl: coverDataUrl
            };

            playlist.push(newTrack);
            sortPlaylist(); // Riordina la playlist
            updatePlaylistUI(); // Aggiorna la visualizzazione
            newTrackUrlInput.value = ''; // Pulisci l'input
            statusMessage("Traccia aggiunta!");

            // Se è la prima traccia aggiunta, caricala ma non avviarla
            if (playlist.length === 1) {
                loadTrack(0);
            }
        },
        onError: function(error) {
            console.error('Errore lettura tag:', error.type, error.info);
            // Prova ad aggiungere la traccia anche senza tag, usando l'URL come titolo?
            // O mostra un errore all'utente.
            statusMessage(`Errore: Impossibile leggere i tag (${error.type}). Il link potrebbe non essere diretto o valido, o potrebbe esserci un problema CORS.`);
             // Potresti aggiungere la traccia con dati di default se vuoi
             /*
             playlist.push({ title: url.substring(url.lastIndexOf('/') + 1), album: 'Sconosciuto', trackNum: null, src: url, coverDataUrl: defaultCover });
             sortPlaylist();
             updatePlaylistUI();
             */
        }
    });
}

// --- Gestione Barra Avanzamento ---
function updateSeekBar() {
    if (!isNaN(audioPlayer.duration)) {
        seekBar.max = audioPlayer.duration;
        seekBar.value = audioPlayer.currentTime;
        currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
        durationDisplay.textContent = formatTime(audioPlayer.duration);
    } else {
         resetSeekBar();
    }
}

function resetSeekBar() {
    seekBar.value = 0;
    seekBar.max = 1; // Evita divisione per zero se duration non è pronta
    currentTimeDisplay.textContent = "0:00";
    durationDisplay.textContent = "0:00";
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// --- Gestione Feedback Utente (Semplice) ---
function statusMessage(msg) {
     // Potresti creare un piccolo div per mostrare messaggi temporanei
     console.log("Status:", msg);
     // Esempio:
     // const statusDiv = document.getElementById('statusDiv'); // Dovresti aggiungerlo all'HTML
     // statusDiv.textContent = msg;
     // setTimeout(() => { statusDiv.textContent = ''; }, 3000); // Nascondi dopo 3 sec
}


// --- Event Listeners ---
playPauseBtn.addEventListener('click', playPauseTrack);
nextBtn.addEventListener('click', nextTrack);
prevBtn.addEventListener('click', prevTrack);
addTrackBtn.addEventListener('click', () => addTrackFromUrl(newTrackUrlInput.value.trim()));

// Evento per input manuale del link
newTrackUrlInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      addTrackFromUrl(newTrackUrlInput.value.trim());
    }
});

// Evento quando la traccia finisce -> vai alla prossima
audioPlayer.addEventListener('ended', nextTrack);

// Eventi per aggiornare la barra di avanzamento
audioPlayer.addEventListener('timeupdate', updateSeekBar);
audioPlayer.addEventListener('loadedmetadata', updateSeekBar); // Aggiorna durata appena disponibile

// Evento per permettere all'utente di cambiare posizione nella traccia
seekBar.addEventListener('input', () => {
    if (!isNaN(audioPlayer.duration)) {
        audioPlayer.currentTime = seekBar.value;
    }
});


// --- Inizializzazione ---
// Potresti pre-caricare alcuni link qui se vuoi (Opzione A menzionata prima)
// Esempio:
// const initialTrackLinks = [
//    "https://drive.google.com/uc?export=download&id=ID_FILE_1",
//    "https://drive.google.com/uc?export=download&id=ID_FILE_2"
// ];
// initialTrackLinks.forEach(link => addTrackFromUrl(link)); // Li aggiunge all'avvio

// Oppure lascia vuoto e usa solo l'aggiunta manuale
updatePlaylistUI(); // Mostra playlist vuota o pre-caricata
resetSeekBar(); // Imposta la barra a zero
