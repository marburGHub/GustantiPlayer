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
