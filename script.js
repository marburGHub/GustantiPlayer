// ... (altre variabili DOM come prima: audioPlayer, albumCover, etc.) ...
const playlistElement = document.getElementById('playlist');
// Rimuovi le variabili per newTrackUrlInput e addTrackBtn se li togli dall'HTML

let playlist = []; // Array di oggetti: { title: '...', album: '...', trackNum: null, artist: '...', src: '...', coverDataUrl: null }
let currentTrackIndex = -1;
const defaultCover = 'default-cover.png';

// --- PLAYLIST PREDEFINITA ---
// Elenca qui i percorsi relativi ai tuoi file audio nella cartella 'audio'
const audioFiles = [
    'audio/1 - Intro.mp3', // Assicurati che i nomi file corrispondano ESATTAMENTE
    'audio/2 - La Forza Gentile.mp3',
    'audio/3 - Vineyard Driver.mp3',
    'audio/4 - Giardino dei colori.mp3',
    "audio/5 - L'imbianchino e il campione.mp3",
    "audio/6 - L'Alchimista dei Sensi.mp3",
    'audio/7 - Digital Renaissance Man.mp3',
    'audio/8 - Gustanti Viaggiatori.mp3'
    // Aggiungi gli altri
];

// --- Funzione per caricare i metadati di UNA traccia ---
function loadMetadata(filePath, index) {
    return new Promise((resolve, reject) => {
        window.jsmediatags.read(filePath, {
            onSuccess: function(tag) {
                console.log(`Tag letti per ${filePath}:`, tag.tags);
                const tags = tag.tags;

                let coverDataUrl = null; // Inizializza a null, useremo default se non trovato
                if (tags.picture) {
                    try {
                        let base64String = "";
                        for (let i = 0; i < tags.picture.data.length; i++) {
                            base64String += String.fromCharCode(tags.picture.data[i]);
                        }
                        coverDataUrl = "data:" + tags.picture.format + ";base64," + window.btoa(base64String);
                    } catch (e) {
                        console.error("Errore conversione copertina per:", filePath, e);
                        coverDataUrl = defaultCover; // Fallback se la conversione fallisce
                    }
                } else {
                     coverDataUrl = defaultCover; // Fallback se non c'è tag picture
                }


                const trackNumStr = tags.track || '';
                const trackNum = trackNumStr ? parseInt(trackNumStr.split('/')[0], 10) : null;
                const title = tags.title || filePath.split('/').pop().replace(/\.[^/.]+$/, ""); // Usa nome file come fallback

                resolve({
                    title: title,
                    album: tags.album || 'Album Sconosciuto',
                    artist: tags.artist || 'Artista Sconosciuto',
                    trackNum: trackNum,
                    src: filePath, // Percorso relativo
                    coverDataUrl: coverDataUrl,
                    originalIndex: index // Manteniamo l'ordine originale per ora
                });
            },
            onError: function(error) {
                console.error(`Errore lettura tag per ${filePath}:`, error.type, error.info);
                // Crea una traccia con dati di default se i tag falliscono
                resolve({
                    title: filePath.split('/').pop().replace(/\.[^/.]+$/, ""), // Nome file come fallback
                    album: 'Album Sconosciuto',
                    artist: 'Artista Sconosciuto',
                    trackNum: null,
                    src: filePath,
                    coverDataUrl: defaultCover,
                    originalIndex: index
                });
            }
        });
    });
}

// --- Funzione per caricare TUTTI i metadati all'avvio ---
async function initializePlaylist() {
    console.log("Inizializzazione playlist...");
    const promises = audioFiles.map((filePath, index) => loadMetadata(filePath, index));
    const loadedTracks = await Promise.all(promises);

    // Mantieni l'ordine originale o ordina subito? Decidiamo di ordinare.
    playlist = loadedTracks; // Assegna le tracce caricate alla playlist globale
    sortPlaylist(); // Ordina la playlist basandosi sui tag letti
    updatePlaylistUI(); // Aggiorna la UI con la playlist ordinata

    // Carica la prima traccia nell'interfaccia (ma non avviarla)
    if (playlist.length > 0) {
        loadTrack(0); // Carica la prima traccia (che sarà la #1 dopo l'ordinamento)
    }
    console.log("Playlist inizializzata e ordinata.");
}

// --- Funzioni Principali (loadTrack, playPauseTrack, nextTrack, prevTrack, sortPlaylist, updatePlaylistUI) ---
// Queste funzioni rimangono molto simili a prima.
// L'unica modifica è che 'src' ora contiene percorsi relativi.
// Assicurati che 'loadTrack' usi correttamente 'track.coverDataUrl' (che ora può essere null o defaultCover).

function loadTrack(index) {
    if (index < 0 || index >= playlist.length) {
         console.warn("Indice traccia non valido:", index);
         return;
    }

    currentTrackIndex = index;
    const track = playlist[index];
    console.log("Caricamento traccia:", track);


    trackTitle.textContent = track.title || 'Titolo Sconosciuto';
    albumTitle.textContent = track.album || 'Album Sconosciuto';
    // Usa il data URL della copertina se esiste, altrimenti il default
    albumCover.src = track.coverDataUrl || defaultCover;
    audioPlayer.src = track.src; // *** Usa il percorso relativo ***

    updatePlaylistUI();
    playPauseBtn.textContent = '▶️';
    resetSeekBar(); // Aggiunto per resettare la barra al cambio traccia
}

// ... (playPauseTrack, nextTrack, prevTrack rimangono uguali) ...

// ... (sortPlaylist rimane uguale, userà i 'trackNum' e 'title' letti) ...

// ... (updatePlaylistUI rimane uguale, visualizzerà i dati letti) ...

// ... (Funzioni per la seek bar: updateSeekBar, resetSeekBar, formatTime rimangono uguali) ...

// INSERISCI QUESTO BLOCCO NEL TUO SCRIPT.JS DOPO LA FUNZIONE loadTrack

function playPauseTrack() {
    // Assicurati che 'audioPlayer' e 'playPauseBtn' siano definiti all'inizio dello script
    const audioPlayer = document.getElementById('audioPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');

    if (!audioPlayer || !playPauseBtn) {
        console.error("Elemento audio o pulsante play/pausa non trovato!");
        return;
    }

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
    const audioPlayer = document.getElementById('audioPlayer'); // Assicurati sia accessibile
    const playPauseBtn = document.getElementById('playPauseBtn'); // Assicurati sia accessibile
    if (audioPlayer && playPauseBtn) {
       audioPlayer.play().catch(error => console.error("Errore durante play next:", error)); // Auto-play sulla prossima
       playPauseBtn.textContent = '⏸️';
    }
}

function prevTrack() {
    let newIndex = currentTrackIndex - 1;
    if (newIndex < 0) {
        newIndex = playlist.length - 1; // Vai all'ultima
    }
    loadTrack(newIndex);
     const audioPlayer = document.getElementById('audioPlayer'); // Assicurati sia accessibile
     const playPauseBtn = document.getElementById('playPauseBtn'); // Assicurati sia accessibile
     if (audioPlayer && playPauseBtn) {
        audioPlayer.play().catch(error => console.error("Errore durante play prev:", error)); // Auto-play sulla precedente
        playPauseBtn.textContent = '⏸️';
     }
}

function sortPlaylist() {
    playlist.sort((a, b) => {
        // Priorità al numero traccia (se presente e valido)
        const trackA = parseInt(a.trackNum, 10);
        const trackB = parseInt(b.trackNum, 10);

        if (!isNaN(trackA) && !isNaN(trackB)) {
            if (trackA !== trackB) return trackA - trackB; // Ordina per traccia se diverse
        }
        // Fallback se numeri traccia uguali o mancanti/non validi
        if (!isNaN(trackA) && isNaN(trackB)) return -1; // A ha traccia, B no -> A viene prima
        if (isNaN(trackA) && !isNaN(trackB)) return 1;  // B ha traccia, A no -> B viene prima

        // Fallback finale: ordinamento per titolo (o nome file se titolo non c'è)
        const titleA = (a.title || a.src || '').toLowerCase(); // Usa src come ulteriore fallback
        const titleB = (b.title || b.src || '').toLowerCase();
        return titleA.localeCompare(titleB);
    });
}


function updatePlaylistUI() {
     const playlistElement = document.getElementById('playlist'); // Assicurati sia accessibile
     if (!playlistElement) return;

    playlistElement.innerHTML = ''; // Pulisci la lista attuale
    playlist.forEach((track, index) => {
        const li = document.createElement('li');
        // Mostra numero traccia se disponibile e valido
        const trackNumDisplay = !isNaN(track.trackNum) && track.trackNum !== null ? `${track.trackNum}. ` : '';
        li.textContent = `${trackNumDisplay}${track.title || 'Traccia Sconosciuta'} - ${track.album || 'Album Sconosciuto'}`;
        li.dataset.index = index; // Salva l'indice per il click
        if (index === currentTrackIndex) {
            li.classList.add('active');
        }
        li.addEventListener('click', () => {
             const playPauseBtn = document.getElementById('playPauseBtn'); // Assicurati sia accessibile
            loadTrack(index);
             const audioPlayer = document.getElementById('audioPlayer'); // Assicurati sia accessibile
             if (audioPlayer && playPauseBtn) {
                audioPlayer.play().catch(error => console.error("Errore play da playlist:", error));
                playPauseBtn.textContent = '⏸️';
             }
        });
        playlistElement.appendChild(li);
    });
}

// --- Gestione Barra Avanzamento ---
function updateSeekBar() {
    // Assicurati che gli elementi siano accessibili
    const audioPlayer = document.getElementById('audioPlayer');
    const seekBar = document.getElementById('seekBar');
    const currentTimeDisplay = document.getElementById('currentTime');
    const durationDisplay = document.getElementById('duration');

    if (!audioPlayer || !seekBar || !currentTimeDisplay || !durationDisplay) return;


    if (!isNaN(audioPlayer.duration)) {
        seekBar.max = audioPlayer.duration;
        seekBar.value = audioPlayer.currentTime;
        currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
        durationDisplay.textContent = formatTime(audioPlayer.duration);
    } else {
         // Non resettare sempre qui, potrebbe causare flickering
         // resetSeekBar(); // Rimuovilo o usalo con cautela
    }
}

function resetSeekBar() {
     // Assicurati che gli elementi siano accessibili
    const seekBar = document.getElementById('seekBar');
    const currentTimeDisplay = document.getElementById('currentTime');
    const durationDisplay = document.getElementById('duration');

    if (!seekBar || !currentTimeDisplay || !durationDisplay) return;

    seekBar.value = 0;
    // Non impostare max a 1, può causare problemi. Lascialo o imposta a 100 come valore di default
    seekBar.max = 100;
    currentTimeDisplay.textContent = "0:00";
    durationDisplay.textContent = "0:00";
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00"; // Gestisci NaN o valori negativi
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// Assicurati che anche le variabili DOM all'inizio dello script siano definite correttamente
const audioPlayer = document.getElementById('audioPlayer');
const albumCover = document.getElementById('albumCover');
const trackTitle = document.getElementById('trackTitle');
const albumTitle = document.getElementById('albumTitle');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
// const playlistElement = document.getElementById('playlist'); // Già definita sopra
const seekBar = document.getElementById('seekBar');
const currentTimeDisplay = document.getElementById('currentTime');
const durationDisplay = document.getElementById('duration');


// FINE DEL BLOCCO DA INSERIRE

// --- Event Listeners ---
playPauseBtn.addEventListener('click', playPauseTrack);
nextBtn.addEventListener('click', nextTrack);
prevBtn.addEventListener('click', prevTrack);
audioPlayer.addEventListener('ended', nextTrack);
audioPlayer.addEventListener('timeupdate', updateSeekBar);
audioPlayer.addEventListener('loadedmetadata', updateSeekBar);
seekBar.addEventListener('input', () => {
    if (!isNaN(audioPlayer.duration)) {
        audioPlayer.currentTime = seekBar.value;
    }
});

// Rimuovi gli event listener per addTrackBtn e newTrackUrlInput

// --- Inizializzazione ---
document.addEventListener('DOMContentLoaded', initializePlaylist); // Avvia il caricamento dei metadati quando la pagina è pronta
