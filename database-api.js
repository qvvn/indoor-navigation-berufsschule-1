// database-api.js - Verbindung zur SQLite Datenbank

// SQLite Datenbank initialisieren (läuft im Browser!)
let db = null;

// Datenbank beim Laden der Seite initialisieren
async function initDatabase() {
    try {
        // SQL.js Library laden (SQLite für Browser)
        const SQL = await initSqlJs({
            locateFile: file => `https://sql.js.org/dist/${file}`
        });
        
        // Neue Datenbank erstellen
        db = new SQL.Database();
        
        console.log('✅ Datenbank initialisiert');
        
        // Tabellen und Daten erstellen
        await setupDatabase();
        
    } catch (error) {
        console.error('❌ Datenbank-Fehler:', error);
        alert('Datenbank konnte nicht geladen werden!');
    }
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
    if (!db) {
        console.error('Datenbank nicht initialisiert!');
        return null;
    }
    
    try {
        const sql = 'SELECT * FROM raeume WHERE id = ? AND qr_code_aktiv = 1';
        const statement = db.prepare(sql);
        const result = statement.get([raumId]); // Parameter sicher einfügen
        statement.free(); // Speicher freigeben
        
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
    if (!db) return [];
    
    try {
        const sql = 'SELECT id, name FROM raeume WHERE qr_code_aktiv = 1 ORDER BY etage, name';
        const statement = db.prepare(sql);
        const results = statement.all(); // Alle Ergebnisse holen
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
        const results = statement.all([raumId, raumId]); // Bidirektionale Verbindungen
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