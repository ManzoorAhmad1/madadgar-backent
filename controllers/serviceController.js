import ServiceCategory from '../models/ServiceCategory.js';
import User from '../models/User.js';

export const getCategories = async (req, res, next) => {
  try {
    const { isActive = true } = req.query;

    const categories = await ServiceCategory.findAll({ isActive });

    res.status(200).json({
      status: 'success',
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const category = await ServiceCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

export const searchServices = async (req, res, next) => {
  try {
    const { q, category } = req.query;

    let categories;
    if (q) {
      categories = await ServiceCategory.search(q);
    } else if (category) {
      // Allow category to be id, slug, or name
      let cat = null;
      if (/^\d+$/.test(String(category))) {
        cat = await ServiceCategory.findById(category);
      }
      if (!cat) cat = await ServiceCategory.findBySlug(category);
      if (!cat) {
        // fallback search by name
        const results = await ServiceCategory.search(category);
        categories = results;
      } else {
        categories = [cat];
      }
    } else {
      const result = await ServiceCategory.findAll({ isActive: true });
      categories = result.categories || result;
    }

    res.status(200).json({
      status: 'success',
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

export const findNearbyProviders = async (req, res, next) => {
  try {
    const { lat, lng, radius = 10, category } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        status: 'error',
        message: 'Latitude and longitude are required'
      });
    }

    // Resolve category param (id, slug or name) to an id understood by provider records
    let resolvedCategory = category;
    if (category) {
      if (!/^\d+$/.test(String(category))) {
        // try slug
        const catBySlug = await ServiceCategory.findBySlug(category);
        if (catBySlug) resolvedCategory = catBySlug.id;
        else {
          // try name search
          const searchResults = await ServiceCategory.search(category);
          if (searchResults && searchResults.length > 0) resolvedCategory = searchResults[0].id;
        }
      }
    }

    const filters = {
      role: 'provider',
      approved: true,
      isAvailable: true,
      isActive: true,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius: parseFloat(radius),
      category: resolvedCategory,
      limit: 50
    };

    const result = await User.findAll(filters);
    const providers = result.users || result;

    res.status(200).json({
      status: 'success',
      data: providers
    });
  } catch (error) {
    next(error);
  }
};

export const calculatePrice = async (req, res, next) => {
  try {
    const { categoryId, distance } = req.body;

    const category = await ServiceCategory.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found'
      });
    }

    const driverCharges = 300; // Fixed fuel charges
    const basePrice = category.basePrice || 500;
    const commissionRate = category.commission_rate || 10;

    // Calculate using new pricing model
    const serviceCommission = Math.round(basePrice * (commissionRate / 100));
    const providerEarningFromService = basePrice - serviceCommission;
    const totalProviderEarning = providerEarningFromService + driverCharges;
    const totalAmount = basePrice + driverCharges;

    res.status(200).json({
      status: 'success',
      data: {
        basePrice: basePrice,
        driverCharges: driverCharges,
        serviceCommission: serviceCommission,
        totalAmount: totalAmount,
        providerEarning: totalProviderEarning,
        distance,
        commissionRate: commissionRate + '%',
        breakdown: {
          clientPays: totalAmount,
          adminEarns: serviceCommission,
          providerEarns: totalProviderEarning,
          driverFuelCharges: driverCharges
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Create new service category
export const createCategory = async (req, res, next) => {
  try {
    const { name, name_ur, description, basePrice, commissionRate, icon, isActive } = req.body;

    const category = await ServiceCategory.create({
      name,
      name_ur,
      description,
      base_price: basePrice,
      commission_rate: commissionRate || 10,
      icon,
      is_active: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      status: 'success',
      message: 'Service category created successfully',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Update service category
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, name_ur, description, basePrice, commissionRate, icon, isActive } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (name_ur) updateData.name_ur = name_ur;
    if (description) updateData.description = description;
    if (basePrice) updateData.base_price = basePrice;
    if (commissionRate !== undefined) updateData.commission_rate = commissionRate;
    if (icon) updateData.icon = icon;
    if (isActive !== undefined) updateData.is_active = isActive;

    const category = await ServiceCategory.updateById(id, updateData);

    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Service category updated successfully',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Delete service category
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await ServiceCategory.deleteById(id);

    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Service category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Update commission rate for a service
export const updateCommission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { commissionRate } = req.body;

    if (commissionRate < 0 || commissionRate > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Commission rate must be between 0 and 100'
      });
    }

    const category = await ServiceCategory.updateById(id, {
      commission_rate: commissionRate
    });

    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: `Commission rate updated to ${commissionRate}%`,
      data: category
    });
  } catch (error) {
    next(error);
  }
};
