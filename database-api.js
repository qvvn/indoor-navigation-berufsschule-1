// database-api.js - Verbindung zur SQLite Datenbank

// SQLite Datenbank initialisieren (läuft im Browser!)
let db = null;

// Datenbank beim Laden der Seite initialisieren
async function initDatabase() {
    try {
        // Warten bis SQL.js Library verfügbar ist
        if (typeof initSqlJs === 'undefined') {
            console.error('❌ SQL.js Library nicht geladen');
            // Fallback: Verwende einfache JavaScript-Objekte
            return initFallbackDatabase();
        }
        
        // SQL.js Library laden
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });
        
        // Neue Datenbank erstellen
        db = new SQL.Database();
        
        console.log('✅ Datenbank initialisiert');
        
        // Tabellen und Daten erstellen
        await setupDatabase();
        
    } catch (error) {
        console.error('❌ Datenbank-Fehler:', error);
        console.log('🔄 Verwende Fallback-System...');
        return initFallbackDatabase();
    }
}

// Fallback: Einfache JavaScript-Objekte verwenden
function initFallbackDatabase() {
    console.log('🔄 Fallback-Datenbank initialisiert');
    
    // Globale Variable für Raum-Daten
    window.raumeDaten = {
        '3ETAGE-R-GANG': { id: '3ETAGE-R-GANG', name: '3. Etage - Rechter Gang', beschreibung: 'Hauptgang der 3. Etage', etage: 3, raumtyp: 'Gang' },
        'R132': { id: 'R132', name: 'Raum 132', beschreibung: 'Klassenzimmer', etage: 3, raumtyp: 'Klassenzimmer' },
        'R133': { id: 'R133', name: 'Raum 133', beschreibung: 'Klassenzimmer', etage: 3, raumtyp: 'Klassenzimmer' },
        'R134': { id: 'R134', name: 'Raum 134', beschreibung: 'Klassenzimmer', etage: 3, raumtyp: 'Klassenzimmer' },
        'R135': { id: 'R135', name: 'Raum 135', beschreibung: 'Klassenzimmer', etage: 3, raumtyp: 'Klassenzimmer' },
        'R136': { id: 'R136', name: 'Raum 136', beschreibung: 'Klassenzimmer', etage: 3, raumtyp: 'Klassenzimmer' },
        'R137': { id: 'R137', name: 'Raum 137', beschreibung: 'Klassenzimmer', etage: 3, raumtyp: 'Klassenzimmer' },
        'TREPPE-3': { id: 'TREPPE-3', name: 'Treppe zur 3. Etage', beschreibung: 'Treppenhaus', etage: 3, raumtyp: 'Treppe' }
    };
    
    window.verbindungenDaten = {
        '3ETAGE-R-GANG': ['R132', 'R133', 'R134', 'R135', 'R136', 'R137', 'TREPPE-3'],
        'R132': ['3ETAGE-R-GANG'],
        'R133': ['3ETAGE-R-GANG'],
        'R134': ['3ETAGE-R-GANG'],
        'R135': ['3ETAGE-R-GANG'],
        'R136': ['3ETAGE-R-GANG'],
        'R137': ['3ETAGE-R-GANG'],
        'TREPPE-3': ['3ETAGE-R-GANG']
    };
}

// Datenbank-Schema und Daten einrichten
async function setupDatabase() {
    const setupSQL = `
        -- Räume Tabelle
        CREATE TABLE IF NOT EXISTS raeume (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            beschreibung TEXT,
            etage INTEGER,
            raumtyp TEXT,
            qr_code_aktiv BOOLEAN DEFAULT 1
        );

        -- Verbindungen Tabelle  
        CREATE TABLE IF NOT EXISTS verbindungen (
            von_raum TEXT,
            zu_raum TEXT,
            bidirektional BOOLEAN DEFAULT 1,
            PRIMARY KEY (von_raum, zu_raum)
        );

        -- Eure 3. Etage Daten
        INSERT OR REPLACE INTO raeume VALUES
        ('3ETAGE-R-GANG', '3. Etage - Rechter Gang', 'Hauptgang der 3. Etage', 3, 'Gang', 1),
        ('R132', 'Raum 132', 'Klassenzimmer', 3, 'Klassenzimmer', 1),
        ('R133', 'Raum 133', 'Klassenzimmer', 3, 'Klassenzimmer', 1),
        ('R134', 'Raum 134', 'Klassenzimmer', 3, 'Klassenzimmer', 1),
        ('R135', 'Raum 135', 'Klassenzimmer', 3, 'Klassenzimmer', 1),
        ('R136', 'Raum 136', 'Klassenzimmer', 3, 'Klassenzimmer', 1),
        ('R137', 'Raum 137', 'Klassenzimmer', 3, 'Klassenzimmer', 1),
        ('TREPPE-3', 'Treppe zur 3. Etage', 'Treppenhaus', 3, 'Treppe', 1);

        -- Verbindungen der 3. Etage
        INSERT OR REPLACE INTO verbindungen VALUES
        ('3ETAGE-R-GANG', 'R132', 1),
        ('3ETAGE-R-GANG', 'R133', 1),
        ('3ETAGE-R-GANG', 'R134', 1),
        ('3ETAGE-R-GANG', 'R135', 1),
        ('3ETAGE-R-GANG', 'R136', 1),
        ('3ETAGE-R-GANG', 'R137', 1),
        ('3ETAGE-R-GANG', 'TREPPE-3', 1);
    `;
    
    try {
        db.exec(setupSQL); // SQL ausführen
        console.log('✅ Datenbank-Schema erstellt');
    } catch (error) {
        console.error('❌ Fehler beim Setup:', error);
    }
}

// WICHTIGE FUNKTION: Raum-Info aus Datenbank holen
async function getRaumInfo(raumId) {
    // Fallback-System: Wenn keine Datenbank verfügbar
    if (!db && window.raumeDaten) {
        const raum = window.raumeDaten[raumId];
        if (raum) {
            console.log(`✅ Raum gefunden (Fallback): ${raum.name}`);
            return raum;
        } else {
            console.log(`❌ Raum ${raumId} nicht gefunden (Fallback)`);
            return null;
        }
    }
    
    // Normale Datenbank-Abfrage
    if (!db) {
        console.error('Datenbank nicht initialisiert!');
        return null;
    }
    
    try {
        const sql = 'SELECT * FROM raeume WHERE id = ? AND qr_code_aktiv = 1';
        const statement = db.prepare(sql);
        const result = statement.get([raumId]);
        statement.free();
        
        if (result) {
            console.log(`✅ Raum gefunden: ${result.name}`);
            return {
                id: result.id,
                name: result.name,
                beschreibung: result.beschreibung,
                etage: result.etage,
                raumtyp: result.raumtyp
            };
        } else {
            console.log(`❌ Raum ${raumId} nicht gefunden`);
            return null;
        }
        
    } catch (error) {
        console.error('Datenbank-Abfrage Fehler:', error);
        return null;
    }
}

// Alle verfügbaren Räume laden
async function getAlleRaeume() {
    // Fallback-System
    if (!db && window.raumeDaten) {
        return Object.values(window.raumeDaten).map(raum => ({
            id: raum.id,
            name: raum.name
        }));
    }
    
    if (!db) return [];
    
    try {
        const sql = 'SELECT id, name FROM raeume WHERE qr_code_aktiv = 1 ORDER BY etage, name';
        const statement = db.prepare(sql);
        const results = statement.all();
        statement.free();
        
        return results.map(row => ({
            id: row.id,
            name: row.name
        }));
        
    } catch (error) {
        console.error('Fehler beim Laden aller Räume:', error);
        return [];
    }
}

// Verbindungen eines Raums finden
async function getRaumVerbindungen(raumId) {
    // Fallback-System
    if (!db && window.verbindungenDaten) {
        return window.verbindungenDaten[raumId] || [];
    }
    
    if (!db) return [];
    
    try {
        const sql = `
            SELECT zu_raum as raum_id 
            FROM verbindungen 
            WHERE von_raum = ? AND bidirektional = 1
            UNION
            SELECT von_raum as raum_id 
            FROM verbindungen 
            WHERE zu_raum = ? AND bidirektional = 1
        `;
        
        const statement = db.prepare(sql);
        const results = statement.all([raumId, raumId]);
        statement.free();
        
        return results.map(row => row.raum_id);
        
    } catch (error) {
        console.error('Fehler beim Laden der Verbindungen:', error);
        return [];
    }
}

// QR-Code Scan in Datenbank loggen (optional für Statistiken)
async function logQRScan(raumId, userAgent = navigator.userAgent) {
    if (!db) return;
    
    try {
        const sql = `
            INSERT INTO qr_scans (raum_id, benutzer_agent, gescannt_am) 
            VALUES (?, ?, datetime('now'))
        `;
        
        // Tabelle erstellen falls nicht vorhanden
        db.exec(`
            CREATE TABLE IF NOT EXISTS qr_scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                raum_id TEXT,
                benutzer_agent TEXT,
                gescannt_am DATETIME
            )
        `);
        
        const statement = db.prepare(sql);
        statement.run([raumId, userAgent]);
        statement.free();
        
        console.log(`📊 QR-Scan geloggt: ${raumId}`);
        
    } catch (error) {
        console.error('Fehler beim Loggen:', error);
    }
}

// Neuen Raum zur Datenbank hinzufügen
async function addNeuerRaum(id, name, beschreibung, etage, raumtyp) {
    if (!db) return false;
    
    try {
        const sql = `
            INSERT INTO raeume (id, name, beschreibung, etage, raumtyp, qr_code_aktiv)
            VALUES (?, ?, ?, ?, ?, 1)
        `;
        
        const statement = db.prepare(sql);
        statement.run([id, name, beschreibung, etage, raumtyp]);
        statement.free();
        
        console.log(`✅ Neuer Raum hinzugefügt: ${name}`);
        return true;
        
    } catch (error) {
        console.error('Fehler beim Hinzufügen:', error);
        return false;
    }
}

// Datenbank exportieren (für Backup)
function exportDatabase() {
    if (!db) return null;
    
    const data = db.export(); // Als Uint8Array
    const blob = new Blob([data], {type: 'application/octet-stream'});
    const url = URL.createObjectURL(blob);
    
    // Download-Link erstellen
    const a = document.createElement('a');
    a.href = url;
    a.download = 'indoor_navigation.db';
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('💾 Datenbank exportiert');
}
