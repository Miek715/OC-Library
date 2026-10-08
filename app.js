/**
 * Live Backend API Integration
 * Set BACKEND_URL to your deployed server endpoint (e.g., https://oc-studio.onrender.com).
 * Falls back seamlessly to LocalStorage if offline or during local testing.
 */
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://YOUR_BACKEND_URL.onrender.com'; // Replace with your live cloud backend URL when deployed

const API = {
  async fetchState() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/state`);
      if (!response.ok) throw new Error('Cloud fetch failed');
      const data = await response.json();
      return {
        folders: data.folders || [],
        ocs: data.ocs || [],
        boards: data.boards || []
      };
    } catch (err) {
      console.warn('Backend unavailable, reading from LocalStorage fallback:', err);
      const fallback = localStorage.getItem('oc_app_data');
      if (fallback) return JSON.parse(fallback);
      
      // Default initial structure
      return {
        folders: [{ id: 'f1', name: 'Main Party' }],
        ocs: [{
          id: 'oc1',
          name: 'Aeliana',
          gender: 'Female',
          faction: 'Starlight Guild',
          age: '24',
          folderId: 'f1',
          tags: ['Mage', 'Leader'],
          notes: '<p>Master of elemental magic.</p>',
          image: ''
        }],
        boards: [{
          id: 'b1',
          name: 'Story Arc Concept',
          nodes: [{ id: 'n1', label: 'Main Hero', ocId: 'oc1', x: 120, y: 120 }],
          connections: []
        }]
      };
    }
  },

  async saveState(state) {
    // 1. Save locally first for instant offline backup
    localStorage.setItem('oc_app_data', JSON.stringify(state));

    // 2. Sync to cloud database
    try {
      const response = await fetch(`${BACKEND_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folders: state.folders,
          ocs: state.ocs,
          boards: state.boards
        })
      });
      return response.ok;
    } catch (err) {
      console.error('Cloud auto-save failed:', err);
      return false;
    }
  }
};

/* Application Core State */
let appState = {
  folders: [],
  ocs: [],
  boards: []
};

let currentEditingOcId = null;
let currentActiveFolderId = null;
let currentActiveBoardId = null;
let tempCroppedImageBase64 = null;
let cropper = null;
let activeDrawingConnection = null;
let autoSaveTimer = null;

async function init() {
  appState = await API.fetchState();
  renderHome();
  setupAutoSaveHooks();
}

function triggerAutoSave() {
  setSaveIndicator('saving');
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    await API.saveState(appState);
    setSaveIndicator('saved');
  }, 400);