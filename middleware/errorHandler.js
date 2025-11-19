const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      message: 'Validation error',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }
  
  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      message: 'Duplicate entry',
      field: err.errors[0]?.path
    });
  }
  
  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  
  // Default error
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(status).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;

