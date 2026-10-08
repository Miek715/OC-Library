const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Higher payload limit for cropped character images

// MongoDB Cloud Connection string
// Replace <username>, <password>, and <cluster-url> with your MongoDB Atlas details
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://<username>:<password>@<cluster-url>/oc_studio?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB Cloud'))
  .catch(err => console.error('MongoDB connection error:', err));

// Database Schema
const AppStateSchema = new mongoose.Schema({
  userId: { type: String, default: 'global_user' }, // Allows multi-user expansion
  folders: [mongoose.Schema.Types.Mixed],
  ocs: [mongoose.Schema.Types.Mixed],
  boards: [mongoose.Schema.Types.Mixed]
}, { timestamps: true });

const AppState = mongoose.model('AppState', AppStateSchema);

// GET API Route: Load character data
app.get('/api/state', async (req, res) => {
  try {
    let state = await AppState.findOne({ userId: 'global_user' });
    if (!state) {
      state = await AppState.create({
        userId: 'global_user',
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
      });
    }
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST API Route: Save changes remotely
app.post('/api/state', async (req, res) => {
  try {
    const { folders, ocs, boards } = req.body;
    const updated = await AppState.findOneAndUpdate(
      { userId: 'global_user' },
      { folders, ocs, boards },
      { new: true, upsert: true }
    );
    res.json({ success: true, updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));