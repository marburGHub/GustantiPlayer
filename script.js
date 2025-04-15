// --- Elementi DOM ---
const audioPlayer = document.getElementById('audioPlayer');
const albumCover = document.getElementById('albumCover');
const trackTitle = document.getElementById('trackTitle');
const albumTitle = document.getElementById('albumTitle');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const playlistElement = document.getElementById('playlist');
const seekBar = document.getElementById('seekBar');
const currentTimeDisplay = document.getElementById('currentTime');
const durationDisplay = document.getElementById('duration');
const themeToggleBtn = document.getElementById('themeToggleBtn'); // Pulsante Tema

// --- Stato del Player ---
let playlist = [];
let currentTrackIndex = -1;
const defaultCover = 'default-cover.png';

// --- PLAYLIST PREDEFINITA ---
const audioFiles = [
    'audio/1 - Intro.mp3',
    'audio/2 - La Forza Gentile.mp3',
    'audio/3 - Vineyard Driver.mp3',
    'audio/4 - Giardino dei colori.mp3',
    "audio/5 - L'imbianchino e il campione.mp3", // Usa doppie virgolette per apostrofi
    "audio/6 - L'Alchimista dei Sensi.mp3",    // Usa doppie virgolette per apostrofi
    'audio/7 - Digital Renaissance Man.mp3',
    'audio/8 - Gustanti Viaggiatori.mp3'
];

// --- Funzioni Tema ---
function setTheme(theme) {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    localStorage.setItem('audioPlayerTheme', theme);

    // --- MODIFICA QUI: Aggiorna il testo del pulsante in base al tema ---
    if (themeToggleBtn) {
        if (theme === 'dark') {
            themeToggleBtn.textContent = '☀️'; // Se è tema scuro, mostra il sole (per passare a chiaro)
        } else {
            themeToggleBtn.textContent = '🌙'; // Se è tema chiaro, mostra la luna (per passare a scuro)
        }
    }
    // --- FINE MODIFICA ---
}

function toggleTheme() {
    const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// --- Funzioni Caricamento Metadati ---
function loadMetadata(filePath, index) {
    const fullUrl = new URL(filePath, window.location.href).href;
    console.log(`Tentativo lettura tag per ${filePath} usando URL: ${fullUrl}`);

    return new Promise((resolve) => {
        window.jsmediatags.read(fullUrl, {
            onSuccess: function(tag) {
                console.log(`Tag letti con successo per ${filePath}:`, tag.tags);
                const tags = tag.tags;
                let coverDataUrl = defaultCover;

                if (tags.picture) {
                    try {
                        let base64String = "";
                        for (let i = 0; i < tags.picture.data.length; i++) {
                            base64String += String.fromCharCode(tags.picture.data[i]);
                        }
                        if (base64String.length > 0) {
                           coverDataUrl = "data:" + tags.picture.format + ";base64," + window.btoa(base64String);
                        } else { console.warn("Dati immagine vuoti nei tag per:", filePath); }
                    } catch (e) { console.error("Errore conversione copertina per:", filePath, e); }
                }

                const trackNumStr = tags.track || '';
                const trackNumMatch = trackNumStr.match(/^(\d+)/);
                const trackNum = trackNumMatch ? parseInt(trackNumMatch[1], 10) : null;
                const title = tags.title || filePath.split('/').pop().replace(/\.[^/.]+$/, "");

                resolve({
                    title: title, album: tags.album || 'Album Sconosciuto', artist: tags.artist || 'Artista Sconosciuto',
                    trackNum: trackNum, src: filePath, coverDataUrl: coverDataUrl, originalIndex: index
                });
            },
            onError: function(error) {
                console.error(`Errore lettura tag per URL ${fullUrl}: Type: ${error.type}, Info: ${error.info}`);
                resolve({ // Risolvi comunque con dati di fallback
                    title: filePath.split('/').pop().replace(/\.[^/.]+$/, ""), album: 'Album Sconosciuto', artist: 'Artista Sconosciuto',
                    trackNum: null, src: filePath, coverDataUrl: defaultCover, originalIndex: index
                });
            }
        });
    });
}

async function initializePlaylist() {
    console.log("Inizializzazione playlist...");
    if(trackTitle) trackTitle.textContent = "Caricamento playlist...";
    if(albumTitle) albumTitle.textContent = "";

    try {
        const promises = audioFiles.map((filePath, index) => loadMetadata(filePath, index));
        playlist = await Promise.all(promises); // Attendere tutte le letture tag
        sortPlaylist();
        updatePlaylistUI();

        if (playlist.length > 0) {
            loadTrack(0); // Carica la prima traccia (indice 0 dell'array ordinato)
        } else {
             if(trackTitle) trackTitle.textContent = "Nessuna traccia trovata";
             if(albumTitle) albumTitle.textContent = "";
        }
        console.log("Playlist inizializzata.");
    } catch (error) {
         console.error("Errore grave durante l'inizializzazione della playlist:", error);
         if(trackTitle) trackTitle.textContent = "Errore caricamento playlist";
    }
}

// --- Funzioni Controllo Player ---
function loadTrack(index) {
    if (index < 0 || index >= playlist.length || !playlist[index]) {
         console.warn("Indice traccia non valido:", index); return;
    }
    currentTrackIndex = index;
    const track = playlist[index];
    console.log("Caricamento traccia:", track);

    if (trackTitle) trackTitle.textContent = track.title || 'Titolo Sconosciuto';
    if (albumTitle) albumTitle.textContent = track.album || 'Album Sconosciuto';
    if (albumCover) albumCover.src = track.coverDataUrl || defaultCover;
    if (audioPlayer) audioPlayer.src = track.src; // Usa percorso RELATIVO per <audio>

    updatePlaylistUI();
    if(playPauseBtn) playPauseBtn.textContent = '▶️';
    resetSeekBar();
}

function playTrack() {
    if (!audioPlayer || !playPauseBtn) return;
     if (audioPlayer.ended) {
        audioPlayer.currentTime = 0;
    }
    audioPlayer.play().then(() => {
        playPauseBtn.textContent = '⏸️';
    }).catch(error => {
        console.error("Errore durante play:", error);
        playPauseBtn.textContent = '▶️';
    });
}

function pauseTrack() {
     if (!audioPlayer || !playPauseBtn) return;
     audioPlayer.pause();
     playPauseBtn.textContent = '▶️';
}

function playPauseToggle() {
    if (!audioPlayer) return;
    if (audioPlayer.paused && audioPlayer.src) {
        playTrack();
    } else {
        pauseTrack();
    }
}

function nextTrack(playImmediately = true) {
    if (playlist.length === 0) return;
    let newIndex = currentTrackIndex + 1;
    if (newIndex >= playlist.length) {
        newIndex = 0; // Loop
    }
    loadTrack(newIndex);
    if (playImmediately) {
        playTrack();
    }
}

function prevTrack(playImmediately = true) {
    if (playlist.length === 0) return;
    let newIndex = currentTrackIndex - 1;
    if (newIndex < 0) {
        newIndex = playlist.length - 1; // Loop
    }
    loadTrack(newIndex);
    if (playImmediately) {
         playTrack();
    }
}

// --- Funzioni Utilità Player ---
function sortPlaylist() {
    playlist.sort((a, b) => {
        const trackA = a.trackNum; const trackB = b.trackNum;
        if (trackA !== null && trackB !== null) {
            if (trackA !== trackB) return trackA - trackB;
        } else if (trackA !== null) return -1;
        else if (trackB !== null) return 1;
        const titleA = (a.title || a.src || '').toLowerCase();
        const titleB = (b.title || b.src || '').toLowerCase();
        return titleA.localeCompare(titleB);
    });
}

function updatePlaylistUI() {
     if (!playlistElement) return;
    playlistElement.innerHTML = '';
    playlist.forEach((track, index) => {
        const li = document.createElement('li');
        const trackNumDisplay = track.trackNum !== null ? `${track.trackNum}. ` : '';
        li.textContent = `${trackNumDisplay}${track.title || 'Traccia Sconosciuta'} - ${track.album || 'Album Sconosciuto'}`;
        li.dataset.index = index;
        if (index === currentTrackIndex) {
            li.classList.add('active');
        }
        li.addEventListener('click', () => {
            loadTrack(index);
            playTrack(); // Avvia riproduzione al click sulla playlist
        });
        playlistElement.appendChild(li);
    });
}

function updateSeekBar() {
    if (!audioPlayer || !seekBar || !currentTimeDisplay || !durationDisplay || isNaN(audioPlayer.duration)) {
         return;
    }
    seekBar.max = audioPlayer.duration;
    seekBar.value = audioPlayer.currentTime;
    currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
    durationDisplay.textContent = audioPlayer.duration > 0 ? formatTime(audioPlayer.duration) : "0:00";
}

function resetSeekBar() {
    if (!seekBar || !currentTimeDisplay || !durationDisplay) return;
    seekBar.value = 0;
    seekBar.max = 100; // Default max
    currentTimeDisplay.textContent = "0:00";
    durationDisplay.textContent = "0:00";
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// --- Event Listeners ---
function setupEventListeners() {
    if (playPauseBtn) playPauseBtn.addEventListener('click', playPauseToggle);
    if (nextBtn) nextBtn.addEventListener('click', () => nextTrack(true));
    if (prevBtn) prevBtn.addEventListener('click', () => prevTrack(true));
    // Event listener per il pulsante tema
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);

    if (audioPlayer) {
        audioPlayer.addEventListener('ended', () => nextTrack(true));
        audioPlayer.addEventListener('timeupdate', updateSeekBar);
        audioPlayer.addEventListener('loadedmetadata', updateSeekBar);
        audioPlayer.addEventListener('error', () => {
            console.error("Errore elemento Audio:", audioPlayer.error);
            pauseTrack();
            resetSeekBar();
        });
    }

    if (seekBar) {
        seekBar.addEventListener('input', () => {
            if (audioPlayer && !isNaN(audioPlayer.duration)) {
                audioPlayer.currentTime = seekBar.value;
            }
        });
    }
}

// --- Inizializzazione ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Applica tema salvato O tema di default (chiaro)
    const savedTheme = localStorage.getItem('audioPlayerTheme') || 'light';
    setTheme(savedTheme); // Questo ora imposta anche l'icona corretta sul pulsante

    // 2. Imposta gli event listener
    setupEventListeners();

    // 3. Inizializza la playlist
    initializePlaylist();
});
