// qr-scanner.js - QR-Code Scanner für Handy-Kamera

// Globale Variablen für den Scanner
let videoStream = null; // Speichert den Kamera-Stream
let scannerActive = false; // Ist der Scanner gerade aktiv?
let scanInterval = null; // Interval für das Scannen

// Hauptfunktion: QR-Code Scanner starten
async function startQRScanner() {
    const video = document.getElementById('qr-video'); // Video Element aus HTML holen
    const canvas = document.getElementById('qr-canvas'); // Canvas für QR-Code Verarbeitung
    
    try {
        // Handy-Kamera aktivieren (Rückkamera bevorzugt)
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment' // 'environment' = Rückkamera, 'user' = Frontkamera
            } 
        });
        
        video.srcObject = videoStream; // Kamera-Stream mit Video Element verbinden
        video.style.display = 'block'; // Video sichtbar machen
        await video.play(); // Video abspielen starten
        
        scannerActive = true;
        
        // Canvas Größe an Video anpassen
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Alle 500ms nach QR-Code scannen (nicht zu oft, sonst laggt es)
        scanInterval = setInterval(() => {
            scanForQRCode(video, canvas);
        }, 500);
        
        // Button Text ändern
        document.getElementById('start-scanner').textContent = 'Scanner stoppen';
        
    } catch (error) {
        console.error('Kamera-Zugriff fehlgeschlagen:', error);
        alert('Kamera konnte nicht geöffnet werden. Stelle sicher, dass du die Berechtigung erteilt hast!');
    }
}

// QR-Code Scanner stoppen
function stopQRScanner() {
    const video = document.getElementById('qr-video');
    
    if (videoStream) {
        // Alle Kamera-Tracks stoppen
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    if (scanInterval) {
        clearInterval(scanInterval); // Scan-Interval stoppen
        scanInterval = null;
    }
    
    video.style.display = 'none'; // Video verstecken
    scannerActive = false;
    
    // Button Text zurücksetzen
    document.getElementById('start-scanner').textContent = 'Kamera starten';
}

// Funktion: Im Video-Frame nach QR-Code suchen
function scanForQRCode(video, canvas) {
    if (!scannerActive) return; // Scanner ist gestoppt
    
    const ctx = canvas.getContext('2d');
    
    // Aktuelles Video-Bild auf Canvas zeichnen
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Bild-Daten vom Canvas holen
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // ECHTE QR-CODE ERKENNUNG mit jsQR Library
    const qrCode = jsQR(imageData.data, canvas.width, canvas.height);
    
    if (qrCode) {
        // QR-Code erfolgreich erkannt!
        console.log('QR-Code gefunden:', qrCode.data);
        qrCodeErkannt(qrCode.data); // Den erkannten Text weiterleiten
    }
    
    // FALLBACK: Für Testing ohne echte QR-Codes (zum Testen)
    // Entfernt diese Zeilen wenn ihr nur echte QR-Codes wollt!
    /*
    if (Math.random() < 0.05) { // 5% Chance pro Scan für Testing
        const testRaumIds = ['R132', 'R133', 'R134', 'R135', 'R136', 'R137'];
        const randomRaum = testRaumIds[Math.floor(Math.random() * testRaumIds.length)];
        qrCodeErkannt(randomRaum);
    }
    */
}

// Wird aufgerufen wenn ein QR-Code erfolgreich gescannt wurde
function qrCodeErkannt(raumId) {
    console.log('QR-Code erkannt:', raumId);
    
    // Scanner stoppen nach erfolgreichem Scan
    stopQRScanner();
    
    // Prüfen ob der Raum existiert
    const raumInfo = getRaumInfo(raumId); // Funktion aus rooms.js
    if (!raumInfo) {
        alert('Unbekannter QR-Code! Bitte scanne einen gültigen Schul-QR-Code.');
        return;
    }
    
    // Aktuellen Standort setzen (Funktion aus app.js)
    setzeAktuellenStandort(raumId);
    
    // Erfolgs-Nachricht
    alert(`✅ Standort erkannt: ${raumInfo.name}`);
}