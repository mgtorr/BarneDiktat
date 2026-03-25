/**
 * Barnediktat - Norsk versjon
 * 
 * Applikasjon for å lære barn å skrive på norsk
 * Inneholder: Diktat, skriveøvelser, vanlige ord
 */

// Applikasjonstilstand
const AppState = {
    currentStep: 'mode-select',
    selectedText: null,
    currentSentenceIndex: 0,
    isPlaying: false,
    isPaused: false,
    speechUtterance: null,
    capturedImage: null,
    recognizedText: '',
    cameraStream: null,
    availableVoices: [],
    selectedVoice: null,
    settings: {
        speed: 0.7,
        pitch: 1.0,
        repeat: true
    }
};

// Tilstand for skriveøvelser
const WritingState = {
    currentLetterIndex: 0,
    currentWordIndex: 0,
    currentSentenceIndex: 0,
    currentCommonWordIndex: 0,
    letterCanvas: null,
    letterCtx: null,
    isDrawing: false,
    wordAnswer: [],
    sentenceAnswer: []
};

// Oppmuntringsmeldinger på norsk
const EncouragementMessages = {
    excellent: [
        "Utmerket arbeid",
        "Bra jobbet, nesten perfekt",
        "Veldig fin prestasjon",
        "Kjempeflott"
    ],
    veryGood: [
        "Veldig bra, fortsett slik",
        "Fine framskritt",
        "Utmerket innsats",
        "Du gjør det bra"
    ],
    good: [
        "Bra jobbet",
        "Fortsett å øve",
        "Fin framgang",
        "Du er på rett vei"
    ],
    keepTrying: [
        "Fortsett, du klarer det",
        "Hver innsats teller",
        "Gi ikke opp",
        "Neste gang blir det bedre"
    ]
};

// DOM-referanser
const Elements = {};

// Initialisering
function init() {
    cacheElements();
    bindEvents();
    initSpeechSynthesis();
    initWritingExercises();
}

function cacheElements() {
    // Steg
    Elements.steps = {
        'mode-select': document.getElementById('step-mode-select'),
        select: document.getElementById('step-select'),
        dictee: document.getElementById('step-dictee'),
        photo: document.getElementById('step-photo'),
        correction: document.getElementById('step-correction'),
        'writing-menu': document.getElementById('step-writing-menu'),
        'writing-letters': document.getElementById('step-writing-letters'),
        'writing-words': document.getElementById('step-writing-words'),
        'writing-sentences': document.getElementById('step-writing-sentences'),
        'writing-common': document.getElementById('step-writing-common')
    };

    // Steg utvalg
    Elements.tabs = document.querySelectorAll('.tab-btn');
    Elements.textsContainer = document.getElementById('texts-container');

    // Steg diktat
    Elements.dicteeTitle = document.getElementById('dictee-title');
    Elements.dicteeAuthor = document.getElementById('dictee-author');
    Elements.progressFill = document.getElementById('progress-fill');
    Elements.voiceSelect = document.getElementById('voice-select');
    Elements.btnTestVoice = document.getElementById('btn-test-voice');
    Elements.speedSlider = document.getElementById('speed-slider');
    Elements.speedValue = document.getElementById('speed-value');
    Elements.pitchSlider = document.getElementById('pitch-slider');
    Elements.pitchValue = document.getElementById('pitch-value');
    Elements.repeatToggle = document.getElementById('repeat-toggle');
    Elements.btnStart = document.getElementById('btn-start');
    Elements.btnPause = document.getElementById('btn-pause');
    Elements.btnResume = document.getElementById('btn-resume');
    Elements.btnRepeat = document.getElementById('btn-repeat');
    Elements.btnNext = document.getElementById('btn-next');
    Elements.currentSentence = document.getElementById('current-sentence');
    Elements.sentenceDisplay = document.getElementById('sentence-display');
    Elements.currentNum = document.getElementById('current-num');
    Elements.totalNum = document.getElementById('total-num');
    Elements.btnFinishDictee = document.getElementById('btn-finish-dictee');
    Elements.backToSelect = document.getElementById('back-to-select');

    // Steg foto
    Elements.cameraVideo = document.getElementById('camera-video');
    Elements.cameraCanvas = document.getElementById('camera-canvas');
    Elements.capturedImage = document.getElementById('captured-image');
    Elements.cameraPlaceholder = document.getElementById('camera-placeholder');
    Elements.btnActivateCamera = document.getElementById('btn-activate-camera');
    Elements.btnTakePhoto = document.getElementById('btn-take-photo');
    Elements.btnRetake = document.getElementById('btn-retake');
    Elements.btnConfirmPhoto = document.getElementById('btn-confirm-photo');
    Elements.btnUploadFile = document.getElementById('btn-upload-file');
    Elements.fileInput = document.getElementById('file-input');

    // Steg retting
    Elements.scoreValue = document.getElementById('score-value');
    Elements.scoreMessage = document.getElementById('score-message');
    Elements.originalText = document.getElementById('original-text');
    Elements.recognizedText = document.getElementById('recognized-text');
    Elements.errorsList = document.getElementById('errors-list');
    Elements.btnNewDictee = document.getElementById('btn-new-dictee');
    Elements.btnRetrySame = document.getElementById('btn-retry-same');

    // Modal
    Elements.hintModal = document.getElementById('hint-modal');
}

function bindEvents() {
    // Faner
    Elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            Elements.tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadTexts(tab.dataset.level);
        });
    });

    // Stemmevalg
    Elements.voiceSelect.addEventListener('change', (e) => {
        const voiceIndex = parseInt(e.target.value);
        if (!isNaN(voiceIndex) && AppState.availableVoices[voiceIndex]) {
            AppState.selectedVoice = AppState.availableVoices[voiceIndex];
        }
    });

    // Test stemme-knapp
    Elements.btnTestVoice.addEventListener('click', testVoice);

    // Hastighetsglidebryter
    Elements.speedSlider.addEventListener('input', (e) => {
        AppState.settings.speed = parseFloat(e.target.value);
        Elements.speedValue.textContent = AppState.settings.speed + 'x';
    });

    // Toneglidebryter
    Elements.pitchSlider.addEventListener('input', (e) => {
        AppState.settings.pitch = parseFloat(e.target.value);
        const pitchLabels = {
            0.8: 'Dypere',
            0.9: 'Dyp',
            1.0: 'Normal',
            1.1: 'Høy',
            1.2: 'Høyere',
            1.3: 'Veldig høy'
        };
        Elements.pitchValue.textContent = pitchLabels[AppState.settings.pitch] || 'Normal';
    });

    // Gjenta-avkryssing
    Elements.repeatToggle.addEventListener('change', (e) => {
        AppState.settings.repeat = e.target.checked;
    });

    // Diktat-kontroller
    Elements.btnStart.addEventListener('click', startDictee);
    Elements.btnPause.addEventListener('click', pauseDictee);
    Elements.btnResume.addEventListener('click', resumeDictee);
    Elements.btnRepeat.addEventListener('click', repeatCurrent);
    Elements.btnNext.addEventListener('click', nextSentence);
    Elements.btnFinishDictee.addEventListener('click', goToPhotoStep);
    Elements.backToSelect.addEventListener('click', () => goToStep('select'));

    // Foto-kontroller
    Elements.btnActivateCamera.addEventListener('click', activateCamera);
    Elements.btnTakePhoto.addEventListener('click', takePhoto);
    Elements.btnRetake.addEventListener('click', retakePhoto);
    Elements.btnConfirmPhoto.addEventListener('click', processPhoto);
    Elements.btnUploadFile.addEventListener('click', () => Elements.fileInput.click());
    Elements.fileInput.addEventListener('change', handleFileUpload);

    // Retting-kontroller
    Elements.btnNewDictee.addEventListener('click', () => goToStep('select'));
    Elements.btnRetrySame.addEventListener('click', () => {
        AppState.currentSentenceIndex = 0;
        goToStep('dictee');
    });

    // Lukk modal
    document.querySelector('.close-modal')?.addEventListener('click', () => {
        Elements.hintModal.classList.add('hidden');
    });

    // Stopp lesing når man forlater siden
    window.addEventListener('beforeunload', () => {
        stopSpeech();
    });
}

// ============ HÅNDTERING AV TEKSTER ============

function loadTexts(level) {
    const texts = DICteesDB[level] || [];
    
    Elements.textsContainer.innerHTML = texts.map(text => `
        <div class="text-card" data-id="${text.id}">
            <h3>${text.title}</h3>
            <span class="author">${text.author}</span>
            <p class="preview">${text.sentences[0].substring(0, 100)}...</p>
            <p class="sentences-count">${text.sentences.length} setninger</p>
        </div>
    `).join('');

    // Bind klikk-hendelser
    Elements.textsContainer.querySelectorAll('.text-card').forEach(card => {
        card.addEventListener('click', () => selectText(card.dataset.id));
    });
}

function selectText(textId) {
    AppState.selectedText = getTextById(textId);
    AppState.currentSentenceIndex = 0;
    
    // Oppdater visning
    Elements.dicteeTitle.textContent = AppState.selectedText.title;
    Elements.dicteeAuthor.textContent = AppState.selectedText.author;
    Elements.totalNum.textContent = AppState.selectedText.sentences.length;
    
    goToStep('dictee');
}

// ============ NAVIGASJON ============

function goToStep(stepName) {
    // Skjul alle steg
    Object.values(Elements.steps).forEach(step => {
        if (step) step.classList.remove('active');
    });
    
    // Vis ønsket steg
    if (Elements.steps[stepName]) {
        Elements.steps[stepName].classList.add('active');
    }
    AppState.currentStep = stepName;
    
    // Spesifikke handlinger per steg
    if (stepName === 'dictee') {
        resetDicteeUI();
    } else if (stepName === 'photo') {
        resetPhotoUI();
    } else if (stepName === 'correction') {
        // Ingenting spesielt
    } else if (stepName === 'select') {
        stopSpeech();
        stopCamera();
        loadTexts('cp');
    }
    
    // Scroll til toppen
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============ DIKTAT / TTS ============

function initSpeechSynthesis() {
    if (!('speechSynthesis' in window)) {
        alert('Nettleseren din støtter ikke talesyntese. Prøv Chrome eller Safari.');
        return;
    }

    // Last tilgjengelige stemmer
    loadVoices();

    // Noen stemmer lastes asynkront (Chrome)
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
}

function loadVoices() {
    AppState.availableVoices = window.speechSynthesis.getVoices();
    
    if (AppState.availableVoices.length === 0) {
        Elements.voiceSelect.innerHTML = '<option value="">Ingen stemmer tilgjengelig</option>';
        return;
    }

    // Filtrer for å beholde hovedsakelig norske stemmer
    const norwegianVoices = AppState.availableVoices.filter(v => v.lang.startsWith('nb') || v.lang.startsWith('no') || v.lang.startsWith('nn'));
    const otherVoices = AppState.availableVoices.filter(v => !v.lang.startsWith('nb') && !v.lang.startsWith('no') && !v.lang.startsWith('nn'));
    
    // Sorter norske stemmer etter kvalitet (foretrekk lokale stemmer)
    norwegianVoices.sort((a, b) => {
        const aLocal = a.localService ? 1 : 0;
        const bLocal = b.localService ? 1 : 0;
        if (bLocal !== aLocal) return bLocal - aLocal;
        return a.name.localeCompare(b.name);
    });

    // Bygg alternativer
    let optionsHTML = '';
    
    // Gruppe: Norske stemmer
    if (norwegianVoices.length > 0) {
        optionsHTML += '<optgroup label="Norske stemmer">';
        norwegianVoices.forEach((voice) => {
            const originalIndex = AppState.availableVoices.indexOf(voice);
            const quality = voice.localService ? '• ' : '';
            const defaultMarker = voice.default ? ' (standard)' : '';
            const label = `${quality}${voice.name}${defaultMarker}`;
            optionsHTML += `<option value="${originalIndex}">${label}</option>`;
        });
        optionsHTML += '</optgroup>';
    }
    
    // Gruppe: Andre stemmer
    if (otherVoices.length > 0) {
        optionsHTML += '<optgroup label="Andre stemmer">';
        otherVoices.forEach((voice) => {
            const originalIndex = AppState.availableVoices.indexOf(voice);
            optionsHTML += `<option value="${originalIndex}">${voice.name} (${voice.lang})</option>`;
        });
        optionsHTML += '</optgroup>';
    }

    Elements.voiceSelect.innerHTML = optionsHTML;

    // Velg beste norske stemme som standard
    if (norwegianVoices.length > 0) {
        const bestVoice = norwegianVoices[0];
        AppState.selectedVoice = bestVoice;
        const bestIndex = AppState.availableVoices.indexOf(bestVoice);
        Elements.voiceSelect.value = bestIndex;
    } else if (AppState.availableVoices.length > 0) {
        AppState.selectedVoice = AppState.availableVoices[0];
        Elements.voiceSelect.value = 0;
    }
}

function testVoice() {
    if (!AppState.selectedVoice) {
        alert('Ingen stemme valgt');
        return;
    }

    const testText = 'Hei! Jeg er stemmen du har valgt for diktatet ditt.';
    
    // Stopp all pågående lesing
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(testText);
    utterance.voice = AppState.selectedVoice;
    utterance.lang = AppState.selectedVoice.lang;
    utterance.rate = AppState.settings.speed;
    utterance.pitch = AppState.settings.pitch;
    utterance.volume = 1;
    
    window.speechSynthesis.speak(utterance);
}

function resetDicteeUI() {
    AppState.currentSentenceIndex = 0;
    AppState.isPlaying = false;
    AppState.isPaused = false;
    
    updateProgress();
    
    Elements.btnStart.classList.remove('hidden');
    Elements.btnPause.classList.add('hidden');
    Elements.btnResume.classList.add('hidden');
    Elements.btnRepeat.classList.add('hidden');
    Elements.btnNext.classList.add('hidden');
    Elements.currentSentence.classList.add('hidden');
    Elements.sentenceDisplay.textContent = '';
}

function startDictee() {
    AppState.isPlaying = true;
    AppState.isPaused = false;
    
    Elements.btnStart.classList.add('hidden');
    Elements.btnPause.classList.remove('hidden');
    Elements.btnRepeat.classList.remove('hidden');
    Elements.btnNext.classList.remove('hidden');
    Elements.currentSentence.classList.remove('hidden');
    
    speakCurrentSentence();
}

function pauseDictee() {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        AppState.isPaused = true;
        
        Elements.btnPause.classList.add('hidden');
        Elements.btnResume.classList.remove('hidden');
    }
}

function resumeDictee() {
    if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        AppState.isPaused = false;
        
        Elements.btnResume.classList.add('hidden');
        Elements.btnPause.classList.remove('hidden');
    }
}

function speakCurrentSentence() {
    if (!AppState.selectedText) return;
    
    const sentence = AppState.selectedText.sentences[AppState.currentSentenceIndex];
    
    // Vis gjeldende setning
    Elements.sentenceDisplay.textContent = sentence;
    Elements.currentNum.textContent = AppState.currentSentenceIndex + 1;
    updateProgress();
    
    // Lag uttale
    const utterance = new SpeechSynthesisUtterance(sentence);
    
    // Bruk valgt stemme hvis tilgjengelig
    if (AppState.selectedVoice) {
        utterance.voice = AppState.selectedVoice;
        utterance.lang = AppState.selectedVoice.lang;
    } else {
        utterance.lang = 'nb-NO';
    }
    
    utterance.rate = AppState.settings.speed;
    utterance.pitch = AppState.settings.pitch;
    utterance.volume = 1;
    
    // Animasjon under lesing
    utterance.onstart = () => {
        Elements.sentenceDisplay.classList.add('speaking');
    };
    
    utterance.onend = () => {
        Elements.sentenceDisplay.classList.remove('speaking');
        
        // Gjenta hvis aktivert og ikke siste setning
        if (AppState.settings.repeat && AppState.currentSentenceIndex < AppState.selectedText.sentences.length - 1) {
            setTimeout(() => {
                if (AppState.isPlaying && !AppState.isPaused) {
                    speakCurrentSentence();
                }
            }, 2000);
        }
    };
    
    // Håndter feil
    utterance.onerror = (event) => {
        console.error('Talesyntese-feil:', event);
        Elements.sentenceDisplay.classList.remove('speaking');
    };
    
    AppState.speechUtterance = utterance;
    window.speechSynthesis.speak(utterance);
}

function repeatCurrent() {
    stopSpeech();
    setTimeout(() => speakCurrentSentence(), 100);
}

function nextSentence() {
    if (!AppState.selectedText) return;
    
    if (AppState.currentSentenceIndex < AppState.selectedText.sentences.length - 1) {
        AppState.currentSentenceIndex++;
        stopSpeech();
        setTimeout(() => speakCurrentSentence(), 100);
    }
}

function stopSpeech() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    if (Elements.sentenceDisplay) {
        Elements.sentenceDisplay.classList.remove('speaking');
    }
}

function updateProgress() {
    if (!AppState.selectedText) return;
    
    const progress = ((AppState.currentSentenceIndex + 1) / AppState.selectedText.sentences.length) * 100;
    Elements.progressFill.style.width = `${progress}%`;
}

function goToPhotoStep() {
    stopSpeech();
    goToStep('photo');
}

// ============ FOTO / KAMERA ============

function resetPhotoUI() {
    stopCamera();
    
    Elements.cameraVideo.classList.add('hidden');
    Elements.capturedImage.classList.add('hidden');
    Elements.cameraPlaceholder.classList.remove('hidden');
    
    Elements.btnActivateCamera.classList.remove('hidden');
    Elements.btnTakePhoto.classList.add('hidden');
    Elements.btnRetake.classList.add('hidden');
    Elements.btnConfirmPhoto.classList.add('hidden');
    Elements.btnUploadFile.classList.remove('hidden');
}

async function activateCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            } 
        });
        
        AppState.cameraStream = stream;
        Elements.cameraVideo.srcObject = stream;
        
        Elements.cameraPlaceholder.classList.add('hidden');
        Elements.cameraVideo.classList.remove('hidden');
        
        Elements.btnActivateCamera.classList.add('hidden');
        Elements.btnUploadFile.classList.add('hidden');
        Elements.btnTakePhoto.classList.remove('hidden');
        
    } catch (err) {
        console.error('Kamera-feil:', err);
        alert('Kunne ikke få tilgang til kameraet. Du kan bruke "Velg fil"-knappen for å velge et bilde.');
    }
}

function stopCamera() {
    if (AppState.cameraStream) {
        AppState.cameraStream.getTracks().forEach(track => track.stop());
        AppState.cameraStream = null;
    }
}

function takePhoto() {
    const video = Elements.cameraVideo;
    const canvas = Elements.cameraCanvas;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // Konverter til bilde
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    AppState.capturedImage = imageData;
    
    // Vis tatt bilde
    Elements.capturedImage.src = imageData;
    Elements.cameraVideo.classList.add('hidden');
    Elements.capturedImage.classList.remove('hidden');
    
    // Oppdater knapper
    Elements.btnTakePhoto.classList.add('hidden');
    Elements.btnRetake.classList.remove('hidden');
    Elements.btnConfirmPhoto.classList.remove('hidden');
    
    stopCamera();
}

function retakePhoto() {
    AppState.capturedImage = null;
    Elements.capturedImage.classList.add('hidden');
    Elements.cameraVideo.classList.remove('hidden');
    
    Elements.btnRetake.classList.add('hidden');
    Elements.btnConfirmPhoto.classList.add('hidden');
    Elements.btnTakePhoto.classList.remove('hidden');
    
    activateCamera();
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        AppState.capturedImage = event.target.result;
        
        Elements.cameraPlaceholder.classList.add('hidden');
        Elements.cameraVideo.classList.add('hidden');
        Elements.capturedImage.src = AppState.capturedImage;
        Elements.capturedImage.classList.remove('hidden');
        
        Elements.btnActivateCamera.classList.add('hidden');
        Elements.btnUploadFile.classList.add('hidden');
        Elements.btnRetake.classList.remove('hidden');
        Elements.btnConfirmPhoto.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

async function processPhoto() {
    if (!AppState.capturedImage || !AppState.selectedText) return;
    
    goToStep('correction');
    
    // Vis originaltekst
    const fullOriginalText = AppState.selectedText.sentences.join(' ');
    Elements.originalText.textContent = fullOriginalText;
    
    // Vis "behandler"
    Elements.recognizedText.innerHTML = '<em>Analyserer...</em>';
    Elements.scoreValue.textContent = '--';
    Elements.scoreMessage.textContent = 'Vent litt';
    
    try {
        // Bruk OCR-tjeneste
        const result = await ocrService.recognize(AppState.capturedImage, {
            simulate: true,
            originalText: fullOriginalText
        });
        
        AppState.recognizedText = result.text;
        Elements.recognizedText.textContent = result.text;
        
        // Sammenlign og beregn poengsum
        const comparison = ocrService.compareTexts(fullOriginalText, result.text);
        
        displayCorrection(comparison);
        
    } catch (error) {
        console.error('OCR-feil:', error);
        Elements.recognizedText.textContent = 'Feil under gjenkjenning. Prøv med et tydeligere bilde.';
        Elements.scoreValue.textContent = '0';
        Elements.scoreMessage.textContent = 'Gjenkjenningen mislyktes';
        Elements.errorsList.innerHTML = '<p class="no-errors">Kunne ikke analysere teksten.</p>';
    }
}

// ============ RETTING ============

function getRandomMessage(category) {
    const messages = EncouragementMessages[category];
    return messages[Math.floor(Math.random() * messages.length)];
}

function displayCorrection(comparison) {
    // Poengsum
    Elements.scoreValue.textContent = comparison.score;
    
    // Melding basert på poengsum
    let message = '';
    let category = '';
    
    if (comparison.score >= 90) {
        category = 'excellent';
    } else if (comparison.score >= 75) {
        category = 'veryGood';
    } else if (comparison.score >= 50) {
        category = 'good';
    } else {
        category = 'keepTrying';
    }
    
    message = getRandomMessage(category);
    Elements.scoreMessage.textContent = message;
    
    // Feilliste
    if (comparison.errors.length === 0) {
        Elements.errorsList.innerHTML = '<p class="no-errors">Ingen feil funnet</p>';
    } else {
        const errorLabels = {
            spelling: 'Stavefeil',
            missing: 'Manglende',
            extra: 'Ekstra',
            substitution: 'Erstattet'
        };
        
        Elements.errorsList.innerHTML = comparison.errors.slice(0, 10).map(err => `
            <div class="error-item">
                <span class="error-type ${err.type}">${errorLabels[err.type]}</span>
                <span class="error-text">
                    ${err.original ? `<span class="error-original">${err.original}</span>` : ''}
                    ${err.original && err.recognized ? ' → ' : ''}
                    ${err.recognized ? `<span class="error-correction">${err.recognized}</span>` : ''}
                </span>
            </div>
        `).join('');
        
        if (comparison.errors.length > 10) {
            Elements.errorsList.innerHTML += `<p style="text-align: center; margin-top: 16px; color: var(--text-tertiary); font-size: 0.875rem;">...og ${comparison.errors.length - 10} flere feil</p>`;
        }
    }
}

// ============ SKRIVEØVELSER ============

function initWritingExercises() {
    // Modusvalg
    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            if (mode === 'dictation') {
                goToStep('select');
            } else if (mode === 'writing') {
                goToStep('writing-menu');
            }
        });
    });

    // Tilbake-knapper
    document.getElementById('back-to-mode')?.addEventListener('click', () => goToStep('mode-select'));
    document.getElementById('back-to-mode-from-writing')?.addEventListener('click', () => goToStep('mode-select'));
    document.getElementById('back-to-writing-menu')?.addEventListener('click', () => goToStep('writing-menu'));
    document.getElementById('back-to-writing-menu-words')?.addEventListener('click', () => goToStep('writing-menu'));
    document.getElementById('back-to-writing-menu-sentences')?.addEventListener('click', () => goToStep('writing-menu'));
    document.getElementById('back-to-writing-menu-common')?.addEventListener('click', () => goToStep('writing-menu'));

    // Skrivetype-valg
    document.querySelectorAll('.writing-type-card').forEach(card => {
        card.addEventListener('click', () => {
            const type = card.dataset.type;
            if (type === 'letters') {
                initLetterExercise();
                goToStep('writing-letters');
            } else if (type === 'words') {
                initWordExercise();
                goToStep('writing-words');
            } else if (type === 'sentences') {
                initSentenceExercise();
                goToStep('writing-sentences');
            } else if (type === 'common-words') {
                initCommonWordsExercise();
                goToStep('writing-common');
            }
        });
    });

    // Bokstavøvelse-kontroller
    document.getElementById('btn-prev-letter')?.addEventListener('click', prevLetter);
    document.getElementById('btn-next-letter')?.addEventListener('click', nextLetter);
    document.getElementById('btn-clear-letter')?.addEventListener('click', clearLetterCanvas);
    document.getElementById('btn-check-letter')?.addEventListener('click', checkLetter);

    // Ordøvelse-kontroller
    document.getElementById('btn-hint-word')?.addEventListener('click', showWordHint);
    document.getElementById('btn-check-word')?.addEventListener('click', checkWord);
    document.getElementById('btn-next-word')?.addEventListener('click', nextWord);

    // Setningsøvelse-kontroller
    document.getElementById('btn-play-sentence-audio')?.addEventListener('click', playSentenceAudio);
    document.getElementById('btn-reset-sentence')?.addEventListener('click', resetSentence);
    document.getElementById('btn-check-sentence')?.addEventListener('click', checkSentence);
    document.getElementById('btn-next-sentence')?.addEventListener('click', nextSentence);

    // Vanlige ord-kontroller
    document.getElementById('btn-play-common-word')?.addEventListener('click', playCommonWord);
    document.getElementById('btn-hint-common')?.addEventListener('click', showCommonWordHint);
    document.getElementById('btn-check-common')?.addEventListener('click', checkCommonWord);
    document.getElementById('btn-next-common')?.addEventListener('click', nextCommonWord);
    document.getElementById('btn-erase-common')?.addEventListener('click', eraseCommonWordCanvas);
    document.getElementById('common-word-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkCommonWord();
        }
    });
}

// ============ BOKSTAVØVELSE ============

function initLetterExercise() {
    WritingState.currentLetterIndex = 0;
    setupLetterCanvas();
    displayCurrentLetter();
}

function setupLetterCanvas() {
    const canvas = document.getElementById('letter-canvas');
    if (!canvas) return;
    
    WritingState.letterCanvas = canvas;
    WritingState.letterCtx = canvas.getContext('2d');
    
    // Sett opp tegning
    WritingState.letterCtx.lineCap = 'round';
    WritingState.letterCtx.lineJoin = 'round';
    WritingState.letterCtx.lineWidth = 8;
    WritingState.letterCtx.strokeStyle = '#2C2825';
    
    // Mus-hendelser
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Berøringshendelser
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
    WritingState.isDrawing = true;
    const rect = WritingState.letterCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    WritingState.letterCtx.beginPath();
    WritingState.letterCtx.moveTo(x, y);
}

function draw(e) {
    if (!WritingState.isDrawing) return;
    const rect = WritingState.letterCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    WritingState.letterCtx.lineTo(x, y);
    WritingState.letterCtx.stroke();
}

function stopDrawing() {
    WritingState.isDrawing = false;
    WritingState.letterCtx.beginPath();
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    WritingState.letterCanvas.dispatchEvent(mouseEvent);
}

function displayCurrentLetter() {
    const letter = WritingExercises.letters[WritingState.currentLetterIndex];
    document.getElementById('current-letter').textContent = letter;
    document.getElementById('trace-guide').textContent = letter;
    document.getElementById('letter-progress').textContent = `${WritingState.currentLetterIndex + 1} / ${WritingExercises.letters.length}`;
    clearLetterCanvas();
}

function clearLetterCanvas() {
    if (WritingState.letterCtx) {
        WritingState.letterCtx.clearRect(0, 0, 300, 300);
    }
}

function prevLetter() {
    if (WritingState.currentLetterIndex > 0) {
        WritingState.currentLetterIndex--;
        displayCurrentLetter();
    }
}

function nextLetter() {
    if (WritingState.currentLetterIndex < WritingExercises.letters.length - 1) {
        WritingState.currentLetterIndex++;
        displayCurrentLetter();
    }
}

function checkLetter() {
    // Enkel validering - sjekk om lerretet har innhold
    const imageData = WritingState.letterCtx.getImageData(0, 0, 300, 300);
    const hasContent = imageData.data.some(channel => channel !== 0);
    
    if (hasContent) {
        alert('Bra jobbet! Gå til neste bokstav.');
        if (WritingState.currentLetterIndex < WritingExercises.letters.length - 1) {
            nextLetter();
        }
    } else {
        alert('Prøv å skrive bokstaven i området.');
    }
}

// ============ ORDØVELSE ============

function initWordExercise() {
    WritingState.currentWordIndex = 0;
    displayCurrentWord();
}

function displayCurrentWord() {
    const exercise = WritingExercises.words[WritingState.currentWordIndex];
    const wordContainer = document.getElementById('word-with-gaps');
    const choicesContainer = document.getElementById('letter-choices');
    
    WritingState.wordAnswer = new Array(exercise.word.length).fill('');
    
    // Lag bokstavspor
    wordContainer.innerHTML = '';
    for (let i = 0; i < exercise.word.length; i++) {
        const slot = document.createElement('div');
        slot.className = 'letter-slot';
        slot.dataset.index = i;
        if (!exercise.missing.includes(i)) {
            slot.textContent = exercise.word[i];
            slot.classList.add('filled');
            WritingState.wordAnswer[i] = exercise.word[i];
        } else {
            slot.addEventListener('click', () => selectWordSlot(i));
        }
        wordContainer.appendChild(slot);
    }
    
    // Lag bokstavvalg
    choicesContainer.innerHTML = '';
    const missingLetters = exercise.missing.map(i => exercise.word[i]);
    const distractors = getDistractorLetters(missingLetters);
    const allChoices = shuffleArray([...missingLetters, ...distractors]);
    
    allChoices.forEach(letter => {
        const btn = document.createElement('button');
        btn.className = 'letter-choice';
        btn.textContent = letter;
        btn.addEventListener('click', () => placeLetter(letter));
        choicesContainer.appendChild(btn);
    });
    
    document.getElementById('word-hint').textContent = '';
    document.getElementById('word-counter').textContent = `Ord ${WritingState.currentWordIndex + 1} av ${WritingExercises.words.length}`;
    document.getElementById('btn-next-word').classList.add('hidden');
    document.getElementById('btn-check-word').classList.remove('hidden');
}

let selectedSlotIndex = -1;

function selectWordSlot(index) {
    selectedSlotIndex = index;
    document.querySelectorAll('.letter-slot').forEach((slot, i) => {
        slot.style.borderColor = i === index ? 'var(--scandi-terracotta)' : '';
    });
}

function placeLetter(letter) {
    if (selectedSlotIndex === -1) {
        // Finn første tomme spor
        const exercise = WritingExercises.words[WritingState.currentWordIndex];
        for (let i = 0; i < exercise.word.length; i++) {
            if (exercise.missing.includes(i) && WritingState.wordAnswer[i] === '') {
                selectedSlotIndex = i;
                break;
            }
        }
    }
    
    if (selectedSlotIndex !== -1) {
        WritingState.wordAnswer[selectedSlotIndex] = letter;
        const slots = document.querySelectorAll('.letter-slot');
        slots[selectedSlotIndex].textContent = letter;
        slots[selectedSlotIndex].classList.add('filled');
        
        // Gå til neste tomme spor
        const exercise = WritingExercises.words[WritingState.currentWordIndex];
        let foundNext = false;
        for (let i = selectedSlotIndex + 1; i < exercise.word.length; i++) {
            if (exercise.missing.includes(i) && WritingState.wordAnswer[i] === '') {
                selectWordSlot(i);
                foundNext = true;
                break;
            }
        }
        if (!foundNext) {
            selectedSlotIndex = -1;
            document.querySelectorAll('.letter-slot').forEach(slot => {
                slot.style.borderColor = '';
            });
        }
    }
}

function getDistractorLetters(missingLetters) {
    const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ';
    const distractors = [];
    for (let letter of allLetters) {
        if (!missingLetters.includes(letter) && distractors.length < 4) {
            distractors.push(letter);
        }
    }
    return distractors;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function showWordHint() {
    const exercise = WritingExercises.words[WritingState.currentWordIndex];
    document.getElementById('word-hint').textContent = `Hint: ${exercise.hint}`;
}

function checkWord() {
    const exercise = WritingExercises.words[WritingState.currentWordIndex];
    const answer = WritingState.wordAnswer.join('');
    const slots = document.querySelectorAll('.letter-slot');
    
    let correct = true;
    exercise.missing.forEach(index => {
        if (WritingState.wordAnswer[index] === exercise.word[index]) {
            slots[index].classList.add('correct');
        } else {
            slots[index].classList.add('incorrect');
            correct = false;
        }
    });
    
    if (correct) {
        document.getElementById('btn-check-word').classList.add('hidden');
        document.getElementById('btn-next-word').classList.remove('hidden');
    }
}

function nextWord() {
    if (WritingState.currentWordIndex < WritingExercises.words.length - 1) {
        WritingState.currentWordIndex++;
        displayCurrentWord();
    } else {
        alert('Gratulerer! Du har fullført alle ordene.');
        goToStep('writing-menu');
    }
}

// ============ SETNINGSØVELSE ============

function initSentenceExercise() {
    WritingState.currentSentenceIndex = 0;
    displayCurrentSentence();
}

function displayCurrentSentence() {
    const exercise = WritingExercises.sentences[WritingState.currentSentenceIndex];
    const slotsContainer = document.getElementById('sentence-slots');
    const bankContainer = document.getElementById('word-bank');
    
    WritingState.sentenceAnswer = [];
    
    // Lag tomme spor
    slotsContainer.innerHTML = '';
    for (let i = 0; i < exercise.words.length; i++) {
        const slot = document.createElement('div');
        slot.className = 'word-slot';
        slot.dataset.index = i;
        slot.addEventListener('click', () => removeWordFromSlot(i));
        slotsContainer.appendChild(slot);
    }
    
    // Lag ord-bank (stokket)
    bankContainer.innerHTML = '';
    const shuffledWords = shuffleArray([...exercise.words]);
    shuffledWords.forEach((word, index) => {
        const wordEl = document.createElement('div');
        wordEl.className = 'draggable-word';
        wordEl.textContent = word;
        wordEl.dataset.word = word;
        wordEl.addEventListener('click', () => placeWord(word));
        bankContainer.appendChild(wordEl);
    });
    
    document.getElementById('sentence-counter').textContent = `Setning ${WritingState.currentSentenceIndex + 1} av ${WritingExercises.sentences.length}`;
    document.getElementById('btn-next-sentence').classList.add('hidden');
    document.getElementById('btn-check-sentence').classList.remove('hidden');
}

function placeWord(word) {
    const exercise = WritingExercises.sentences[WritingState.currentSentenceIndex];
    const slots = document.querySelectorAll('.word-slot');
    
    // Finn første tomme spor
    for (let i = 0; i < exercise.words.length; i++) {
        if (!WritingState.sentenceAnswer[i]) {
            WritingState.sentenceAnswer[i] = word;
            slots[i].textContent = word;
            
            // Fjern fra bank
            document.querySelectorAll('.draggable-word').forEach(el => {
                if (el.dataset.word === word && el.style.display !== 'none') {
                    el.style.display = 'none';
                    return;
                }
            });
            break;
        }
    }
}

function removeWordFromSlot(index) {
    if (WritingState.sentenceAnswer[index]) {
        const word = WritingState.sentenceAnswer[index];
        WritingState.sentenceAnswer[index] = null;
        
        const slots = document.querySelectorAll('.word-slot');
        slots[index].textContent = '';
        slots[index].classList.remove('correct', 'incorrect');
        
        // Returner til bank
        document.querySelectorAll('.draggable-word').forEach(el => {
            if (el.dataset.word === word) {
                el.style.display = 'flex';
            }
        });
    }
}

function playSentenceAudio() {
    const exercise = WritingExercises.sentences[WritingState.currentSentenceIndex];
    speakText(exercise.audio);
}

function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'nb-NO';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
}

function resetSentence() {
    displayCurrentSentence();
}

function checkSentence() {
    const exercise = WritingExercises.sentences[WritingState.currentSentenceIndex];
    const slots = document.querySelectorAll('.word-slot');
    
    let allCorrect = true;
    for (let i = 0; i < exercise.words.length; i++) {
        if (WritingState.sentenceAnswer[i] === exercise.words[i]) {
            slots[i].classList.add('correct');
        } else {
            slots[i].classList.add('incorrect');
            allCorrect = false;
        }
    }
    
    if (allCorrect) {
        document.getElementById('btn-check-sentence').classList.add('hidden');
        document.getElementById('btn-next-sentence').classList.remove('hidden');
    }
}

function nextSentence() {
    if (WritingState.currentSentenceIndex < WritingExercises.sentences.length - 1) {
        WritingState.currentSentenceIndex++;
        displayCurrentSentence();
    } else {
        alert('Gratulerer! Du har fullført alle setningene.');
        goToStep('writing-menu');
    }
}

// ============ VANLIGE ORD ØVELSE ============

let commonWordCanvas = null;
let commonWordCtx = null;
let isDrawingCommonWord = false;

function initCommonWordsExercise() {
    WritingState.currentCommonWordIndex = 0;
    setupCommonWordCanvas();
    displayCurrentCommonWord();
}

function setupCommonWordCanvas() {
    const canvas = document.getElementById('common-word-canvas');
    if (!canvas) return;
    
    commonWordCanvas = canvas;
    commonWordCtx = canvas.getContext('2d');
    
    // Sett opp tegning
    commonWordCtx.lineCap = 'round';
    commonWordCtx.lineJoin = 'round';
    commonWordCtx.lineWidth = 6;
    commonWordCtx.strokeStyle = '#2C2825';
    
    // Mus-hendelser
    canvas.addEventListener('mousedown', startDrawingCommonWord);
    canvas.addEventListener('mousemove', drawCommonWord);
    canvas.addEventListener('mouseup', stopDrawingCommonWord);
    canvas.addEventListener('mouseout', stopDrawingCommonWord);
    
    // Berøringshendelser
    canvas.addEventListener('touchstart', handleCommonWordTouch);
    canvas.addEventListener('touchmove', handleCommonWordTouch);
    canvas.addEventListener('touchend', stopDrawingCommonWord);
}

function startDrawingCommonWord(e) {
    isDrawingCommonWord = true;
    const rect = commonWordCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    commonWordCtx.beginPath();
    commonWordCtx.moveTo(x, y);
}

function drawCommonWord(e) {
    if (!isDrawingCommonWord) return;
    const rect = commonWordCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    commonWordCtx.lineTo(x, y);
    commonWordCtx.stroke();
}

function stopDrawingCommonWord() {
    isDrawingCommonWord = false;
    commonWordCtx.beginPath();
}

function handleCommonWordTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    commonWordCanvas.dispatchEvent(mouseEvent);
}

function clearCommonWordCanvas() {
    if (commonWordCtx) {
        commonWordCtx.clearRect(0, 0, commonWordCanvas.width, commonWordCanvas.height);
    }
}

function displayCurrentCommonWord() {
    const word = CommonWords[WritingState.currentCommonWordIndex];
    
    document.getElementById('current-common-word').textContent = word;
    document.getElementById('current-common-word').style.visibility = 'hidden';
    document.getElementById('guide-word').textContent = word;
    document.getElementById('common-word-feedback').innerHTML = '';
    document.getElementById('common-word-counter').textContent = `Ord ${WritingState.currentCommonWordIndex + 1} av ${CommonWords.length}`;
    
    // Tøm lerretet
    clearCommonWordCanvas();
    
    // Oppdater fremdriftsindikator
    const progress = ((WritingState.currentCommonWordIndex + 1) / CommonWords.length) * 100;
    document.getElementById('common-progress-fill').style.width = `${progress}%`;
    
    document.getElementById('btn-next-common').classList.add('hidden');
    document.getElementById('btn-check-common').classList.remove('hidden');
    document.getElementById('btn-hint-common').textContent = 'Se ordet';
    
    // Spill ordet automatisk
    setTimeout(() => playCommonWord(), 500);
}

function playCommonWord() {
    const word = CommonWords[WritingState.currentCommonWordIndex];
    speakText(word);
}

function showCommonWordHint() {
    const wordDisplay = document.getElementById('current-common-word');
    const guideWord = document.getElementById('guide-word');
    const btn = document.getElementById('btn-hint-common');
    
    if (wordDisplay.style.visibility === 'hidden') {
        wordDisplay.style.visibility = 'visible';
        guideWord.style.opacity = '0.4';
        btn.textContent = 'Skjul ordet';
    } else {
        wordDisplay.style.visibility = 'hidden';
        guideWord.style.opacity = '0.2';
        btn.textContent = 'Se ordet';
    }
}

function checkCommonWord() {
    const feedback = document.getElementById('common-word-feedback');
    const word = CommonWords[WritingState.currentCommonWordIndex];
    
    // Sjekk om lerretet har innhold
    const imageData = commonWordCtx.getImageData(0, 0, commonWordCanvas.width, commonWordCanvas.height);
    const hasContent = imageData.data.some(channel => channel !== 0);
    
    if (!hasContent) {
        feedback.innerHTML = '<span style="color: var(--scandi-coral); font-weight: 600;">Skriv ordet for hånd først</span>';
        speakText('Skriv ordet for hånd først', 0.9);
        return;
    }
    
    // Vis ordet så barnet kan sammenligne selv
    document.getElementById('current-common-word').style.visibility = 'visible';
    document.getElementById('guide-word').style.opacity = '0.4';
    document.getElementById('btn-check-common').classList.add('hidden');
    document.getElementById('btn-next-common').classList.remove('hidden');
    
    // Gi tilbakemelding om å sammenligne
    feedback.innerHTML = '<span style="color: var(--scandi-terracotta); font-weight: 600;">Sammenlign med ordet over. Skrev du riktig?</span>';
    speakText('Sammenlign med ordet over. Skrev du riktig?', 0.9);
}

function nextCommonWord() {
    if (WritingState.currentCommonWordIndex < CommonWords.length - 1) {
        WritingState.currentCommonWordIndex++;
        displayCurrentCommonWord();
    } else {
        alert('Gratulerer! Du har øvd på alle de 100 vanligste ordene!');
        goToStep('writing-menu');
    }
}

function eraseCommonWordCanvas() {
    if (commonWordCtx) {
        commonWordCtx.clearRect(0, 0, commonWordCanvas.width, commonWordCanvas.height);
    }
    // Also clear any feedback
    const feedback = document.getElementById('common-word-feedback');
    if (feedback) {
        feedback.innerHTML = '';
    }
}



// ============ OPPSTART ============

// Start appen når DOM er klar
document.addEventListener('DOMContentLoaded', init);
