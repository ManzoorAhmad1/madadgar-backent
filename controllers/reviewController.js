import Review from '../models/Review.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import { createBookingNotification } from '../utils/notification.js';

export const createReview = async (req, res, next) => {
  try {
    const { bookingId, rating, comment, images } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Rating must be between 1 and 5' 
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking || booking.client_id !== req.user.id) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' });
    }

    // Allow review if status is 'completed' OR if status is 'work_done' and payment has been received
    if (booking.status !== 'completed' && !(booking.status === 'work_done' && booking.receivedAmount)) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Can only review after payment is received' 
      });
    }

    // Check if review already exists
    const existingReview = await Review.findByBookingId(bookingId);
    if (existingReview) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Review already submitted for this booking' 
      });
    }

    const review = await Review.create({
      booking_id: bookingId,
      client_id: req.user.id,
      provider_id: booking.provider_id,
      service_category_id: booking.service_category_id,
      rating,
      comment,
      images: images ? JSON.stringify(images) : null
    });

    // Update provider rating
    await updateProviderRating(booking.provider_id);

    // Notify provider
    await createBookingNotification(
      booking.provider_id,
      bookingId,
      'review_received',
      `You received a ${rating}-star review`
    );

    const io = req.app.get('io');
    io.to(booking.provider_id.toString()).emit('review-received', {
      bookingId,
      reviewId: review.id,
      rating,
      message: `New ${rating}-star review received`
    });

    res.status(201).json({ status: 'success', data: review });
  } catch (error) {
    next(error);
  }
};

// Provider responds to review
export const respondToReview = async (req, res, next) => {
  try {
    const { response } = req.body;
    const reviewId = req.params.id;

    const review = await Review.findById(reviewId);

    if (!review || review.provider_id !== req.user.id) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Review not found or unauthorized' 
      });
    }

    await Review.updateById(reviewId, {
      provider_response: response,
      response_date: new Date()
    });

    // Notify client
    await createBookingNotification(
      review.client_id,
      review.booking_id,
      'review_response',
      'Provider responded to your review'
    );

    const io = req.app.get('io');
    io.to(review.client_id.toString()).emit('review-response', {
      reviewId,
      bookingId: review.booking_id,
      message: 'Provider responded to your review'
    });

    const updatedReview = await Review.findById(reviewId);
    res.status(200).json({ status: 'success', data: updatedReview });
  } catch (error) {
    next(error);
  }
};

// Update provider average rating
async function updateProviderRating(providerId) {
  try {
    const result = await Review.findByProviderId(providerId);
    const reviews = result.reviews || result || [];

    if (reviews.length === 0) {
      await User.updateById(providerId, {
        average_rating: 0,
        total_reviews: 0
      });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = (totalRating / reviews.length).toFixed(2);

    await User.updateById(providerId, {
      average_rating: averageRating,
      total_reviews: reviews.length
    });
  } catch (error) {
    console.error('Error updating provider rating:', error);
  }
}

export const getProviderReviews = async (req, res, next) => {
  try {
    const result = await Review.findByProviderId(req.params.id, { isVisible: true, limit: 50 });
    const reviews = result.reviews || result;

    res.status(200).json({ status: 'success', data: reviews });
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review || review.client_id !== req.user.id) {
      return res.status(404).json({ status: 'error', message: 'Review not found' });
    }

    const { rating, comment, images } = req.body;
    await Review.updateById(req.params.id, {
      rating,
      comment,
      images: images ? JSON.stringify(images) : review.images
    });

    // Update provider rating again
    await updateProviderRating(review.provider_id);

    const updatedReview = await Review.findById(req.params.id);
    res.status(200).json({ status: 'success', data: updatedReview });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review || review.client_id !== req.user.id) {
      return res.status(404).json({ status: 'error', message: 'Review not found' });
    }

    await Review.deleteById(req.params.id);

    // Update provider rating
    await updateProviderRating(review.provider_id);

    res.status(200).json({ status: 'success', message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
};
