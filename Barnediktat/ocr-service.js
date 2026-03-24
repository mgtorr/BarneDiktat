/**
 * Service OCR pour la reconnaissance d'écriture manuscrite
 * 
 * Cette implémentation utilise une approche hybride:
 * 1. Tente d'utiliser l'API Web Speech Recognition (si disponible en navigateur)
 * 2. Sinon, propose une saisie manuelle pour la démo
 * 
 * Pour une implémentation production, remplacer par:
 * - Google Cloud Vision API
 * - Azure Computer Vision
 * - AWS Textract
 * - OpenAI GPT-4 Vision
 */

class OCRService {
    constructor() {
        this.apiKey = null; // À configurer pour l'API réelle
        this.apiEndpoint = null;
    }

    /**
     * Configure les credentials pour l'API externe
     */
    configure(apiKey, endpoint) {
        this.apiKey = apiKey;
        this.apiEndpoint = endpoint;
    }

    /**
     * Reconnaît le texte dans une image
     * @param {HTMLImageElement|HTMLCanvasElement|string} image - Image source
     * @param {Object} options - Options de reconnaissance
     * @returns {Promise<{text: string, confidence: number}>}
     */
    async recognize(image, options = {}) {
        // Pour la démo, on simule la reconnaissance
        // En production, remplacer par un appel API réel
        
        if (options.simulate && options.originalText) {
            return this._simulateRecognition(options.originalText);
        }

        // Tentative avec une API externe si configurée
        if (this.apiKey && this.apiEndpoint) {
            return this._callExternalAPI(image, options);
        }

        // Fallback: demander à l'utilisateur de saisir le texte
        return this._manualFallback(options);
    }

    /**
     * Simulation de reconnaissance pour la démo
     * Crée des erreurs réalistes dans le texte
     */
    _simulateRecognition(originalText) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const text = this._introduceErrors(originalText);
                const confidence = 70 + Math.random() * 25; // 70-95%
                
                resolve({
                    text: text,
                    confidence: Math.round(confidence),
                    simulated: true
                });
            }, 1500); // Délai réaliste
        });
    }

    /**
     * Introduit des erreurs typiques d'un enfant dans le texte
     */
    _introduceErrors(text) {
        const words = text.split(/(\s+)/);
        const errors = [];
        
        // Types d'erreurs courantes
        const errorTypes = [
            // Omission de lettres
            (word) => {
                if (word.length < 4) return word;
                const pos = Math.floor(Math.random() * word.length);
                return word.slice(0, pos) + word.slice(pos + 1);
            },
            // Doublon de lettres
            (word) => {
                if (word.length < 3) return word;
                const pos = Math.floor(Math.random() * word.length);
                return word.slice(0, pos + 1) + word[pos] + word.slice(pos + 1);
            },
            // Confusion accents
            (word) => {
                const replacements = {
                    'é': 'e', 'è': 'e', 'ê': 'e',
                    'à': 'a', 'â': 'a',
                    'ô': 'o', 'ö': 'o',
                    'ù': 'u', 'û': 'u', 'ü': 'u',
                    'î': 'i', 'ï': 'i',
                    'ç': 'c'
                };
                for (const [acc, noAcc] of Object.entries(replacements)) {
                    if (word.includes(acc) && Math.random() > 0.5) {
                        return word.replace(acc, noAcc);
                    }
                }
                return word;
            },
            // Inversion de lettres
            (word) => {
                if (word.length < 4) return word;
                const pos = Math.floor(Math.random() * (word.length - 2));
                return word.slice(0, pos) + word[pos + 1] + word[pos] + word.slice(pos + 2);
            },
            // Mots collés (oubli d'espace) - simulé par omission
            (word) => {
                return Math.random() > 0.9 ? word + ' ' : word;
            }
        ];

        // Appliquer 2-4 erreurs aléatoires
        const numErrors = 2 + Math.floor(Math.random() * 3);
        const wordsCopy = [...words];
        
        for (let i = 0; i < numErrors; i++) {
            // Choisir un mot significatif (pas un espace ou ponctuation)
            const candidates = wordsCopy
                .map((w, idx) => ({ word: w, idx }))
                .filter(item => item.word.trim().length > 2 && /^[a-zA-ZÀ-ÿ]+$/.test(item.word.trim()));
            
            if (candidates.length === 0) continue;
            
            const target = candidates[Math.floor(Math.random() * candidates.length)];
            const errorFunc = errorTypes[Math.floor(Math.random() * errorTypes.length)];
            const newWord = errorFunc(target.word);
            
            if (newWord !== target.word) {
                wordsCopy[target.idx] = newWord;
                errors.push({
                    original: target.word,
                    recognized: newWord,
                    type: this._getErrorType(target.word, newWord)
                });
            }
        }

        return wordsCopy.join('');
    }

    _getErrorType(original, recognized) {
        if (recognized.length < original.length) return 'missing';
        if (recognized.length > original.length) return 'extra';
        return 'spelling';
    }

    /**
     * Appel à une API externe (template pour implémentation)
     */
    async _callExternalAPI(image, options) {
        // Exemple avec Google Vision API
        const base64Image = await this._getBase64(image);
        
        const requestBody = {
            requests: [{
                image: { content: base64Image },
                features: [{
                    type: 'DOCUMENT_TEXT_DETECTION',
                    model: 'latest'
                }],
                imageContext: {
                    languageHints: ['fr']
                }
            }]
        };

        try {
            const response = await fetch(
                `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                }
            );

            const data = await response.json();
            
            if (data.responses && data.responses[0]) {
                const textAnnotation = data.responses[0].fullTextAnnotation;
                return {
                    text: textAnnotation ? textAnnotation.text : '',
                    confidence: data.responses[0].textAnnotations?.[0]?.confidence || 80
                };
            }
            
            throw new Error('No text detected');
        } catch (error) {
            console.error('OCR API error:', error);
            throw error;
        }
    }

    /**
     * Fallback manuel pour la démo
     */
    _manualFallback(options) {
        return new Promise((resolve) => {
            // Créer un modal pour saisie manuelle
            const modal = document.createElement('div');
            modal.className = 'modal ocr-manual-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>📝 Saisie du texte</h3>
                    <p>Pour cette démo, saisis le texte que tu as écrit :</p>
                    <textarea id="manual-text-input" 
                        placeholder="Tape ton texte ici..."
                        style="width: 100%; min-height: 150px; margin: 16px 0; padding: 12px; border: 2px solid var(--border); border-radius: var(--radius); font-size: 1rem; font-family: inherit;"></textarea>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="btn-skip-ocr" class="btn-secondary" style="padding: 10px 16px;">
                            Simulation auto
                        </button>
                        <button id="btn-confirm-text" class="btn-primary" style="padding: 10px 16px;">
                            Valider
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            modal.style.display = 'flex';
            
            const textarea = modal.querySelector('#manual-text-input');
            const confirmBtn = modal.querySelector('#btn-confirm-text');
            const skipBtn = modal.querySelector('#btn-skip-ocr');
            
            // Pré-remplir si on a le texte original
            if (options.originalText) {
                textarea.value = options.originalText;
                textarea.select();
            }

            confirmBtn.addEventListener('click', () => {
                const text = textarea.value.trim();
                modal.remove();
                resolve({
                    text: text,
                    confidence: 95,
                    manual: true
                });
            });

            skipBtn.addEventListener('click', () => {
                modal.remove();
                if (options.originalText) {
                    const result = this._introduceErrors(options.originalText);
                    resolve({
                        text: result,
                        confidence: 75,
                        simulated: true
                    });
                } else {
                    resolve({
                        text: 'Texte non reconnu',
                        confidence: 0,
                        error: true
                    });
                }
            });

            textarea.focus();
        });
    }

    /**
     * Convertit une image en base64
     */
    _getBase64(image) {
        return new Promise((resolve, reject) => {
            if (typeof image === 'string') {
                // Déjà une URL ou base64
                if (image.startsWith('data:')) {
                    resolve(image.split(',')[1]);
                    return;
                }
                // Charger l'image depuis l'URL
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/jpeg').split(',')[1]);
                };
                img.onerror = reject;
                img.src = image;
                return;
            }

            // Canvas ou ImageElement
            const canvas = document.createElement('canvas');
            if (image instanceof HTMLImageElement) {
                canvas.width = image.naturalWidth || image.width;
                canvas.height = image.naturalHeight || image.height;
            } else {
                canvas.width = image.width;
                canvas.height = image.height;
            }
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);
            resolve(canvas.toDataURL('image/jpeg').split(',')[1]);
        });
    }

    /**
     * Compare deux textes et identifie les différences
     * @param {string} original - Texte original
     * @param {string} recognized - Texte reconnu
     * @returns {Object} Résultat de la comparaison
     */
    compareTexts(original, recognized) {
        const originalWords = original.toLowerCase().replace(/[.,;:!?]/g, '').split(/\s+/);
        const recognizedWords = recognized.toLowerCase().replace(/[.,;:!?]/g, '').split(/\s+/);
        
        const differences = [];
        const maxLen = Math.max(originalWords.length, recognizedWords.length);
        
        let correctCount = 0;
        let i = 0, j = 0;
        
        while (i < originalWords.length && j < recognizedWords.length) {
            const orig = originalWords[i];
            const rec = recognizedWords[j];
            
            if (orig === rec) {
                correctCount++;
                i++;
                j++;
            } else {
                // Chercher le mot le plus proche
                const distance = this._levenshteinDistance(orig, rec);
                const similarity = 1 - distance / Math.max(orig.length, rec.length);
                
                if (similarity > 0.6) {
                    // Faute d'orthographe
                    differences.push({
                        type: 'spelling',
                        original: orig,
                        recognized: rec,
                        position: i
                    });
                    i++;
                    j++;
                } else {
                    // Mot manquant ou en trop
                    // Essayer de trouver une correspondance future
                    let foundMatch = false;
                    for (let k = 1; k < 3 && i + k < originalWords.length; k++) {
                        if (originalWords[i + k] === rec) {
                            for (let m = 0; m < k; m++) {
                                differences.push({
                                    type: 'missing',
                                    original: originalWords[i + m],
                                    recognized: null,
                                    position: i + m
                                });
                            }
                            i += k;
                            foundMatch = true;
                            break;
                        }
                    }
                    
                    if (!foundMatch) {
                        for (let k = 1; k < 3 && j + k < recognizedWords.length; k++) {
                            if (recognizedWords[j + k] === orig) {
                                for (let m = 0; m < k; m++) {
                                    differences.push({
                                        type: 'extra',
                                        original: null,
                                        recognized: recognizedWords[j + m],
                                        position: j + m
                                    });
                                }
                                j += k;
                                foundMatch = true;
                                break;
                            }
                        }
                    }
                    
                    if (!foundMatch) {
                        differences.push({
                            type: 'substitution',
                            original: orig,
                            recognized: rec,
                            position: i
                        });
                        i++;
                        j++;
                    }
                }
            }
        }
        
        // Mots restants
        while (i < originalWords.length) {
            differences.push({
                type: 'missing',
                original: originalWords[i],
                recognized: null,
                position: i
            });
            i++;
        }
        
        while (j < recognizedWords.length) {
            differences.push({
                type: 'extra',
                original: null,
                recognized: recognizedWords[j],
                position: j
            });
            j++;
        }

        // Calculer le score
        const totalWords = originalWords.length;
        const score = Math.round((correctCount / totalWords) * 100);

        return {
            score,
            correctCount,
            totalWords,
            errors: differences,
            details: this._generateErrorDetails(differences)
        };
    }

    /**
     * Calcule la distance de Levenshtein entre deux chaînes
     */
    _levenshteinDistance(a, b) {
        const matrix = [];
        
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[b.length][a.length];
    }

    _generateErrorDetails(errors) {
        const errorTypes = {
            spelling: { label: 'Faute d\'orthographe', count: 0 },
            missing: { label: 'Mot oublié', count: 0 },
            extra: { label: 'Mot en trop', count: 0 },
            substitution: { label: 'Mauvais mot', count: 0 }
        };

        errors.forEach(err => {
            if (errorTypes[err.type]) {
                errorTypes[err.type].count++;
            }
        });

        return errorTypes;
    }
}

// Créer l'instance singleton
const ocrService = new OCRService();
