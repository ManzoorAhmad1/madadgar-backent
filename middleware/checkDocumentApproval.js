// Middleware to check if provider documents are approved
export const checkDocumentApproval = async (req, res, next) => {
  try {
    // Only check for providers
    if (req.user.role !== 'provider') {
      return next();
    }

    // Check document approval status
    let providerDetails = req.user.providerDetails || req.user.provider_details;
    
    // Parse if it's a string
    if (typeof providerDetails === 'string') {
      try {
        providerDetails = JSON.parse(providerDetails);
      } catch (e) {
        providerDetails = {};
      }
    }
    
    const documentStatus = providerDetails?.documentStatus || 'pending';

    if (documentStatus !== 'approved') {
      return res.status(403).json({
        status: 'error',
        message: 'Your documents are pending approval. Please wait for admin approval before accessing this feature.',
        documentStatus: documentStatus
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
