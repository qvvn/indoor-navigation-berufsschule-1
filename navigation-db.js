// navigation-db.js - Wegfindung mit Datenbank-Anbindung

// Hauptfunktion: Route zwischen zwei Räumen berechnen (mit Datenbank)
async function berechneRoute(startRaum, zielRaum) {
    // Spezialfall: Start und Ziel sind gleich
    if (startRaum === zielRaum) {
        const raumInfo = await getRaumInfo(startRaum);
        return {
            gefunden: true,
            weg: [startRaum],
            beschreibung: `Du bist bereits im ${raumInfo ? raumInfo.name : startRaum}! 🎯`
        };
    }
    
    // Prüfen ob beide Räume existieren
    const startInfo = await getRaumInfo(startRaum);
    const zielInfo = await getRaumInfo(zielRaum);
    
    if (!startInfo) {
        return {
            gefunden: false,
            weg: [],
            beschreibung: `❌ Start-Raum "${startRaum}" nicht in der Datenbank gefunden!`
        };
    }
    
    if (!zielInfo) {
        return {
            gefunden: false,
            weg: [],
            beschreibung: `❌ Ziel-Raum "${zielRaum}" nicht in der Datenbank gefunden!`
        };
    }
    
    // Breadth-First-Search mit Datenbank-Verbindungen
    const besucht = new Set(); // Besuchte Räume
    const warteschlange = [startRaum]; // Zu prüfende Räume
    const vorgaenger = new Map(); // Von wo sind wir gekommen?
    
    besucht.add(startRaum);
    
    // Solange es Räume zu prüfen gibt
    while (warteschlange.length > 0) {
        const aktuellerRaum = warteschlange.shift();
        
        // Ziel erreicht?
        if (aktuellerRaum === zielRaum) {
            // Weg rückwärts rekonstruieren
            const weg = [];
            let aktuell = zielRaum;
            
            while (aktuell !== undefined) {
                weg.unshift(aktuell); // Am Anfang einfügen
                aktuell = vorgaenger.get(aktuell);
            }
            
            return {
                gefunden: true,
                weg: weg,
                beschreibung: await erstelleWegbeschreibung(weg)
            };
        }
        
        // Alle Nachbar-Räume aus Datenbank holen
        const nachbarn = await getRaumVerbindungen(aktuellerRaum);
        
        for (const nachbar of nachbarn) {
            if (!besucht.has(nachbar)) {
                besucht.add(nachbar);
                warteschlange.push(nachbar);
                vorgaenger.set(nachbar, aktuellerRaum);
            }
        }
    }
    
    // Kein Weg gefunden
    return {
        gefunden: false,
        weg: [],
        beschreibung: `❌ Kein Weg von "${startInfo.name}" zu "${zielInfo.name}" gefunden. Sind die Räume verbunden?`
    };
}

// Wegbeschreibung mit Datenbank-Infos erstellen
async function erstelleWegbeschreibung(weg) {
    if (weg.length === 0) return "Kein Weg verfügbar.";
    
    if (weg.length === 1) {
        const raumInfo = await getRaumInfo(weg[0]);
        return `Du bist bereits im Ziel: ${raumInfo ? raumInfo.name : weg[0]}! 🎯`;
    }
    
    let beschreibung = "🗺️ Deine Route:\n\n";
    
    // Jeden Schritt beschreiben
    for (let i = 0; i < weg.length; i++) {
        const raumInfo = await getRaumInfo(weg[i]);
        const raumName = raumInfo ? raumInfo.name : weg[i];
        const raumTyp = raumInfo ? raumInfo.raumtyp : '';
        
        if (i === 0) {
            // Startpunkt
            beschreibung += `📍 Start: ${raumName}`;
            if (raumTyp) beschreibung += ` (${raumTyp})`;
            beschreibung += '\n';
            
        } else if (i === weg.length - 1) {
            // Zielpunkt
            beschreibung += `🎯 Ziel: ${raumName}`;
            if (raumTyp) beschreibung += ` (${raumTyp})`;
            beschreibung += '\n';
            
        } else {
            // Zwischenschritt
            beschreibung += `↓ Gehe zu: ${raumName}`;
            if (raumTyp) beschreibung += ` (${raumTyp})`;
            beschreibung += '\n';
        }
    }
    
    // Zusatzinfos
    const schritte = weg.length - 1;
    beschreibung += `\n✨ Route in ${schritte} Schritt${schritte === 1 ? '' : 'en'}`;
    
    // Etagen-Info hinzufügen
    const etagen = new Set();
    for (const raumId of weg) {
        const info = await getRaumInfo(raumId);
        if (info && info.etage) etagen.add(info.etage);
    }
    
    if (etagen.size > 1) {
        beschreibung += `\n🏢 Route führt über ${etagen.size} Etagen: ${Array.from(etagen).sort().join(', ')}`;
    }
    
    return beschreibung;
}

// Alle erreichbaren Räume von einem Punkt finden
async function findeErreichbareRaeume(startRaum) {
    const erreichbar = new Set([startRaum]);
    const warteschlange = [startRaum];
    
    while (warteschlange.length > 0) {
        const aktuell = warteschlange.shift();
        const nachbarn = await getRaumVerbindungen(aktuell);
        
        for (const nachbar of nachbarn) {
            if (!erreichbar.has(nachbar)) {
                erreichbar.add(nachbar);
                warteschlange.push(nachbar);
            }
        }
    }
    
    return Array.from(erreichbar);
}

// Räume nach Etage gruppiert holen
async function getRaeumeNachEtage(etage = null) {
    if (!db) return {};
    
    try {
        let sql = 'SELECT id, name, etage, raumtyp FROM raeume WHERE qr_code_aktiv = 1';
        let params = [];
        
        if (etage !== null) {
            sql += ' AND etage = ?';
            params = [etage];
        }
        
        sql += ' ORDER BY etage, name';
        
        const statement = db.prepare(sql);
        const results = statement.all(params);
        statement.free();
        
        // Nach Etagen gruppieren
        const grouped = {};
        for (const raum of results) {
            const etageKey = raum.etage || 0;
            if (!grouped[etageKey]) grouped[etageKey] = [];
            grouped[etageKey].push({
                id: raum.id,
                name: raum.name,
                raumtyp: raum.raumtyp
            });
        }
        
        return grouped;
        
    } catch (error) {
        console.error('Fehler beim Gruppieren nach Etagen:', error);
        return {};
    }
}

// Statistiken über das Gebäude
async function getGebaeudeStats() {
    if (!db) return null;
    
    try {
        const sql = `
            SELECT 
                COUNT(*) as total_raeume,
                COUNT(DISTINCT etage) as anzahl_etagen,
                COUNT(CASE WHEN raumtyp = 'Klassenzimmer' THEN 1 END) as klassenzimmer,
                COUNT(CASE WHEN raumtyp = 'Gang' THEN 1 END) as gaenge,
                COUNT(CASE WHEN raumtyp = 'Treppe' THEN 1 END) as treppen
            FROM raeume 
            WHERE qr_code_aktiv = 1
        `;
        
        const statement = db.prepare(sql);
        const result = statement.get();
        statement.free();
        
        return result;
        
    } catch (error) {
        console.error('Fehler bei Statistiken:', error);
        return null;
    }
}