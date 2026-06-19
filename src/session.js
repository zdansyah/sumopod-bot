// ============================================================
//  SUMOPOD BOT - SESSION MANAGER
// ============================================================

const fs = require('fs');
const path = require('path');
const cfg = require('./config');

function loadSession() {
    try {
        if (!fs.existsSync(cfg.SESSION_FILE)) return null;
        const raw = fs.readFileSync(cfg.SESSION_FILE, 'utf8');
        const data = JSON.parse(raw);
        return data;
    } catch {
        return null;
    }
}

function saveSession(sessionData) {
    fs.writeFileSync(cfg.SESSION_FILE, JSON.stringify(sessionData, null, 2), 'utf8');
}

function clearSession() {
    if (fs.existsSync(cfg.SESSION_FILE)) {
        fs.unlinkSync(cfg.SESSION_FILE);
    }
}

/**
 * Returns true if session exists and access_token is present.
 */
function hasSession() {
    const s = loadSession();
    return !!(s && s.access_token);
}

module.exports = { loadSession, saveSession, clearSession, hasSession };
