// --- Elementi DOM ---
// Recupera tutti gli elementi HTML necessari all'inizio
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

// --- Stato del Player ---
let playlist = []; // Array di oggetti traccia: { title: '...', album: '...', trackNum: null, artist: '...', src: '...', coverDataUrl: null, originalIndex: ... }
let currentTrackIndex = -1; // Indice della traccia attualmente caricata o in riproduzione
const defaultCover = 'default-cover.png'; // Percorso dell'immagine di copertina predefinita

// --- PLAYLIST PREDEFINITA ---
// Elenca qui i percorsi relativi ai tuoi file audio nella cartella 'audio'
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

// --- Funzione per caricare i metadati di UNA traccia ---
function loadMetadata(filePath, index) {
    // filePath è il percorso relativo, es: 'audio/1 - Intro.mp3'

    // COSTRUISCI L'URL COMPLETO per jsmediatags
    // window.location.href è l'URL della pagina corrente (es. https://marburghub.github.io/GustantiPlayer/)
    // new URL(filePath, window.location.href) combina correttamente il percorso base e quello relativo.
    const fullUrl = new URL(filePath, window.location.href).href;

    console.log(`Tentativo lettura tag per ${filePath} usando URL: ${fullUrl}`); // Log per debug

    return new Promise((resolve) => { // Non serve reject qui, gestiamo l'errore internamente
        // PASSA L'URL COMPLETO a jsmediatags
        window.jsmediatags.read(fullUrl, {
            onSuccess: function(tag) {
                console.log(`Tag letti con successo per ${filePath}:`, tag.tags);
                const tags = tag.tags;
                let coverDataUrl = defaultCover; // Inizia con il default

                if (tags.picture) {
                    try {
                        let base64String = "";
                        for (let i = 0; i < tags.picture.data.length; i++) {
                            base64String += String.fromCharCode(tags.picture.data[i]);
                        }
                        // Controlla se la stringa base64 non è vuota prima di usarla
                        if (base64String.length > 0) {
                           coverDataUrl = "data:" + tags.picture.format + ";base64," + window.btoa(base64String);
                        } else {
                             console.warn("Dati immagine vuoti nei tag per:", filePath);
                        }
                    } catch (e) {
                        console.error("Errore conversione copertina per:", filePath, e);
                        // coverDataUrl rimane defaultCover in caso di errore
                    }
                }

                const trackNumStr = tags.track || '';
                // Estrai solo il numero traccia, gestisci "1/10" o solo "1"
                const trackNumMatch = trackNumStr.match(/^(\d+)/);
                const trackNum = trackNumMatch ? parseInt(trackNumMatch[1], 10) : null;

                const title = tags.title || filePath.split('/').pop().replace(/\.[^/.]+$/, ""); // Usa nome file come fallback

                resolve({
                    title: title,
                    album: tags.album || 'Album Sconosciuto',
                    artist: tags.artist || 'Artista Sconosciuto',
                    trackNum: trackNum,
                    // IMPORTANTE: Usa ancora il PERCORSO RELATIVO per l'elemento <audio>
                    src: filePath,
                    coverDataUrl: coverDataUrl,
                    originalIndex: index // Manteniamo l'ordine originale per ora
                });
            },
            onError: function(error) {
                // Logga l'errore con l'URL completo che ha fallito
                console.error(`Errore lettura tag per URL ${fullUrl}: Type: ${error.type}, Info: ${error.info}`);

                // Crea una traccia con dati di default se i tag falliscono
                // Usiamo comunque resolve per non bloccare Promise.all
                resolve({
                    title: filePath.split('/').pop().replace(/\.[^/.]+$/, ""), // Nome file come fallback
                    album: 'Album Sconosciuto',
                    artist: 'Artista Sconosciuto',
                    trackNum: null,
                     // IMPORTANTE: Usa ancora il PERCORSO RELATIVO per l'elemento <audio>
                    src: filePath,
                    coverDataUrl: defaultCover, // Usa copertina di default
                    originalIndex: index
                });
            }
        });
    });
}

// --- Funzione per caricare TUTTI i metadati all'avvio ---
async function initializePlaylist() {
    console.log("Inizializzazione playlist...");
    // Mostra un messaggio di caricamento all'utente
    if(trackTitle) trackTitle.textContent = "Caricamento playlist...";
    if(albumTitle) albumTitle.textContent = "";

    try {
        const promises = audioFiles.map((filePath, index) => loadMetadata(filePath, index));
        const loadedTracks = await Promise.all(promises);

        // Assegna le tracce caricate (anche quelle con errori gestiti) alla playlist globale
        playlist = loadedTracks;
        sortPlaylist(); // Ordina la playlist basandosi sui tag letti/fallback
        updatePlaylistUI(); // Aggiorna la UI con la playlist ordinata

        // Carica la prima traccia nell'interfaccia (ma non avviarla)
        if (playlist.length > 0) {
            // Trova l'indice della prima traccia nell'array *ordinato*
            const firstTrackIndex = playlist.findIndex(track => track.originalIndex !== undefined); // Trova il primo elemento valido
            loadTrack(firstTrackIndex >= 0 ? firstTrackIndex : 0);
        } else {
             if(trackTitle) trackTitle.textContent = "Nessuna traccia trovata";
             if(albumTitle) albumTitle.textContent = "";
        }
        console.log("Playlist inizializzata e ordinata.");

    } catch (error) {
         console.error("Errore grave durante l'inizializzazione della playlist:", error);
         if(trackTitle) trackTitle.textContent = "Errore caricamento playlist";
         if(albumTitle) albumTitle.textContent = "";
    }
}


// --- Funzioni Principali di Controllo Audio ---

function loadTrack(index) {
    if (index < 0 || index >= playlist.length || !playlist[index]) {
         console.warn("Indice traccia non valido o traccia non trovata:", index);
         // Potresti voler mostrare un messaggio all'utente o non fare nulla
         return;
    }

    currentTrackIndex = index;
    const track = playlist[index];
    console.log("Caricamento traccia:", track);

    // Aggiorna UI con i dati della traccia
    if (trackTitle) trackTitle.textContent = track.title || 'Titolo Sconosciuto';
    if (albumTitle) albumTitle.textContent = track.album || 'Album Sconosciuto';
    if (albumCover) albumCover.src = track.coverDataUrl || defaultCover; // Usa cover di default se non trovata

    // Imposta la sorgente audio sull'elemento <audio> usando il percorso RELATIVO
    if (audioPlayer) audioPlayer.src = track.src;

    updatePlaylistUI(); // Evidenzia la traccia corrente nella lista
    if(playPauseBtn) playPauseBtn.textContent = '▶️'; // Mostra il pulsante Play
    resetSeekBar(); // Resetta la barra di avanzamento
}

function playPauseTrack() {
    if (!audioPlayer || !playPauseBtn) {
        console.error("Elemento audio o pulsante play/pausa non trovato!");
        return;
    }

    if (audioPlayer.paused && audioPlayer.src) {
        // Controlla se siamo alla fine, in tal caso riavvolgi prima di play
        if (audioPlayer.ended) {
             audioPlayer.currentTime = 0;
        }
        audioPlayer.play().then(() => {
             playPauseBtn.textContent = '⏸️';
        }).catch(error => {
             console.error("Errore durante play:", error);
             // Potrebbe essere necessario un'interazione utente iniziale su alcuni browser
             playPauseBtn.textContent = '▶️';
        });
    } else {
        audioPlayer.pause();
        playPauseBtn.textContent = '▶️';
    }
}

function nextTrack() {
    if (playlist.length === 0) return; // Non fare nulla se la playlist è vuota
    let newIndex = currentTrackIndex + 1;
    if (newIndex >= playlist.length) {
        newIndex = 0; // Torna all'inizio (loop)
    }
    loadTrack(newIndex); // Carica la nuova traccia

    // --- MODIFICA QUI ---
    // Tenta di avviare la riproduzione subito dopo il caricamento
    if (audioPlayer && playPauseBtn) { // Assicurati che gli elementi esistano
        audioPlayer.play().then(() => {
            playPauseBtn.textContent = '⏸️'; // Aggiorna il pulsante a Pausa
        }).catch(error => {
            console.error("Errore durante autoplay next:", error);
            playPauseBtn.textContent = '▶️'; // Se fallisce, mostra Play
        });
    }
    // --- FINE MODIFICA ---
}

function prevTrack() {
    if (playlist.length === 0) return; // Non fare nulla se la playlist è vuota
    let newIndex = currentTrackIndex - 1;
    if (newIndex < 0) {
        newIndex = playlist.length - 1; // Vai all'ultima (loop)
    }
    loadTrack(newIndex); // Carica la nuova traccia

    // --- MODIFICA QUI (Opzionale ma consigliata per coerenza) ---
    // Tenta di avviare la riproduzione subito dopo il caricamento
    if (audioPlayer && playPauseBtn) { // Assicurati che gli elementi esistano
        audioPlayer.play().then(() => {
            playPauseBtn.textContent = '⏸️'; // Aggiorna il pulsante a Pausa
        }).catch(error => {
            console.error("Errore durante autoplay prev:", error);
            playPauseBtn.textContent = '▶️'; // Se fallisce, mostra Play
        });
    }
    // --- FINE MODIFICA ---
}

// --- Funzioni di Utilità (Playlist e Barra Avanzamento) ---

function sortPlaylist() {
    playlist.sort((a, b) => {
        // Priorità al numero traccia (se presente e valido)
        const trackA = a.trackNum; // trackNum è già null o un numero
        const trackB = b.trackNum;

        // Gestione casi null/numero
        if (trackA !== null && trackB !== null) {
            if (trackA !== trackB) return trackA - trackB; // Ordina per traccia se diverse e non null
        } else if (trackA !== null && trackB === null) {
            return -1; // A ha traccia, B no -> A viene prima
        } else if (trackA === null && trackB !== null) {
            return 1;  // B ha traccia, A no -> B viene prima
        }
        // Se entrambi null o uguali, passa al fallback

        // Fallback: ordinamento per titolo (o nome file se titolo non c'è)
        const titleA = (a.title || a.src || '').toLowerCase(); // Usa src come ulteriore fallback
        const titleB = (b.title || b.src || '').toLowerCase();
        // Usa localeCompare per un ordinamento alfabetico corretto
        return titleA.localeCompare(titleB);
    });
}


function updatePlaylistUI() {
     if (!playlistElement) return; // Se l'elemento playlist non esiste, esci

    playlistElement.innerHTML = ''; // Pulisci la lista attuale
    playlist.forEach((track, index) => {
        const li = document.createElement('li');
        // Mostra numero traccia se disponibile e valido
        const trackNumDisplay = track.trackNum !== null ? `${track.trackNum}. ` : '';
        li.textContent = `${trackNumDisplay}${track.title || 'Traccia Sconosciuta'} - ${track.album || 'Album Sconosciuto'}`;
        li.dataset.index = index; // Salva l'indice (dell'array ordinato) per il click

        // Evidenzia la traccia attualmente caricata/in riproduzione
        if (index === currentTrackIndex) {
            li.classList.add('active');
        }

        // Aggiungi evento click per riprodurre la traccia dalla playlist
        li.addEventListener('click', () => {
            loadTrack(index); // Carica la traccia cliccata
            // Avvia la riproduzione dopo il click
            if(audioPlayer){
                 audioPlayer.play().then(() => {
                    if(playPauseBtn) playPauseBtn.textContent = '⏸️';
                 }).catch(error => console.error("Errore play da playlist:", error));
            }
        });
        playlistElement.appendChild(li);
    });
}

function updateSeekBar() {
    if (!audioPlayer || !seekBar || !currentTimeDisplay || !durationDisplay || isNaN(audioPlayer.duration)) {
         // Non fare nulla se gli elementi non ci sono o la durata non è valida
         // Potresti voler reimpostare la barra qui se la durata diventa NaN
         // resetSeekBar(); // Valuta se è necessario
         return;
    }

    seekBar.max = audioPlayer.duration;
    seekBar.value = audioPlayer.currentTime;
    currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
    // Mostra la durata totale solo se è un numero valido e maggiore di 0
    durationDisplay.textContent = audioPlayer.duration > 0 ? formatTime(audioPlayer.duration) : "0:00";
}

function resetSeekBar() {
    if (!seekBar || !currentTimeDisplay || !durationDisplay) return;

    seekBar.value = 0;
    seekBar.max = 100; // Imposta un max di default ragionevole
    currentTimeDisplay.textContent = "0:00";
    durationDisplay.textContent = "0:00";
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00"; // Gestisci NaN o valori negativi
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`; // Aggiunge lo zero iniziale ai secondi
}

// --- Event Listeners ---
// Assicurati che gli elementi esistano prima di aggiungere listener

if (playPauseBtn) {
    playPauseBtn.addEventListener('click', playPauseTrack);
}
if (nextBtn) {
    nextBtn.addEventListener('click', nextTrack);
}
if (prevBtn) {
    prevBtn.addEventListener('click', prevTrack);
}
if (audioPlayer) {
    // Quando la traccia finisce, vai alla prossima
    audioPlayer.addEventListener('ended', nextTrack);
    // Aggiorna la barra di avanzamento durante la riproduzione
    audioPlayer.addEventListener('timeupdate', updateSeekBar);
    // Aggiorna la durata totale quando i metadati sono caricati
    audioPlayer.addEventListener('loadedmetadata', updateSeekBar);
    // Aggiorna anche in caso di errore per resettare la UI
    audioPlayer.addEventListener('error', () => {
         console.error("Errore elemento Audio:", audioPlayer.error);
         if(playPauseBtn) playPauseBtn.textContent = '▶️';
         resetSeekBar();
         // Potresti voler mostrare un messaggio d'errore all'utente
    });
}
if (seekBar) {
    // Permetti all'utente di cambiare posizione nella traccia
    seekBar.addEventListener('input', () => {
        if (audioPlayer && !isNaN(audioPlayer.duration)) {
            audioPlayer.currentTime = seekBar.value;
        }
    });
}

// --- Inizializzazione ---
// Avvia il caricamento dei metadati quando il DOM è pronto
document.addEventListener('DOMContentLoaded', initializePlaylist);
