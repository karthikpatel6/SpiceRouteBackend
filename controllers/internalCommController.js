/* ============================================
   SpiceRoute - Internal Comm Controller
   Handles Kitchen ↔ Manager communications
   ============================================ */

const InternalComm = require('../models/InternalComm');

/* ---- Get recent comms for a restaurant ---- */
// GET /api/comms/:restaurantId
const getComms = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const comms = await InternalComm.find({ restaurant: restaurantId })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, comms: comms.reverse() });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching communications' });
  }
};

/* ---- Post a new comm message ---- */
// POST /api/comms
const postComm = async (req, res) => {
  try {
    const { restaurantId, senderName, role, message, type, relatedOrder } = req.body;

    const comm = await InternalComm.create({
      restaurant: restaurantId,
      sender: req.user?._id,
      senderName: senderName || req.user?.name || 'Staff',
      role,
      message,
      type: type || 'shout',
      relatedOrder: relatedOrder || null
    });

    // Emit to appropriate socket rooms
    const io = req.app.get('io');
    if (io) {
      const payload = {
        _id: comm._id,
        senderName: comm.senderName,
        role: comm.role,
        message: comm.message,
        type: comm.type,
        timestamp: comm.timestamp,
        restaurantId
      };
      if (role === 'kitchen') {
        io.to(`manager:${restaurantId}`).emit('manager_alert', payload);
      } else if (role === 'manager') {
        io.to(`kitchen:${restaurantId}`).emit('manager_reply', payload);
      }
    }

    res.status(201).json({ success: true, comm });
  } catch (error) {
    console.error('Post comm error:', error);
    res.status(500).json({ message: 'Error posting communication' });
  }
};

/* ---- Mark comm as acknowledged ---- */
// PATCH /api/comms/:id/ack
const ackComm = async (req, res) => {
  try {
    const comm = await InternalComm.findByIdAndUpdate(
      req.params.id,
      { acknowledged: true },
      { new: true }
    );
    if (!comm) return res.status(404).json({ message: 'Comm not found' });
    res.json({ success: true, comm });
  } catch (error) {
    res.status(500).json({ message: 'Error acknowledging comm' });
  }
};

module.exports = { getComms, postComm, ackComm };
