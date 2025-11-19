const requireAdmin = (req, res, next) => {
  // This middleware should be used after authenticate middleware
  // So req.user should already be set
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  
  next();
};

module.exports = { requireAdmin };

