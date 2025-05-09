const Booking = require('../models/Booking');
const Hotel = require('../models/Hotel')

//@desc     Get all booking
//@route    GET /api/v1/bookings
//@access   Public
exports.getBookings = async (req, res, next) => {
    let query;

    //General users can see only their bookings
    if(req.user.role !== 'admin') {
        query = Booking.find({user:req.user.id}).populate({
            path: 'hotel',
            select: 'name province tel'
        });
    } else {
        //If you are an admin
        if (req.params.hotelId) {
            console.log(req.params.hotelId);
            query = Booking.find({hotel: req.params.hotelId}).populate({
                path: 'hotel',
                select: 'name province tel',
            });
        } else {
            query = Booking.find().populate({
                path: 'hotel',
                select: 'name province tel'
            });
        }
    }

    try {
        const bookings = await query;
        res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: "Cannot find Booking"
        });
    }
}

//@desc     Get single booking
//@route    GET /api/v1/bookings/:id
//@access   Public
exports.getBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id).populate({
            path: 'hotel',
            select: 'name description tel'
        });

        if(!booking) {
            return res.status(404).json({
                success: false,
                message: `No booking with the id of ${req.params.id}`
            });
        }

        res.status(200).json({
            success: true,
            data: booking
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: "Cannot find Booking"
        });
    }
}

//@desc     Add booking
//@route    POST /api/v1/hotels/:hotelId/booking
//@access   Private
exports.addBooking = async (req, res, next) => {
    try {
        req.body.hotel = req.params.hotelId;

        const hotel = await Hotel.findById(req.params.hotelId);

        if (!hotel) {
            return res.status(404).json({
                success: false,
                message: `No hotel with the id of ${req.params.hotelId}`
            });
        }

        //add user Id to req.body
        req.body.user = req.user.id;

        const { checkInDate, checkOutDate } = req.body;

        // Validate the check-in and check-out dates
        if (!checkInDate || !checkOutDate) {
            return res.status(400).json({
                success: false,
                message: "Check-in and Check-out dates are required"
            });
        }

        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);

        // Ensure check-out is after check-in
        if (checkOut <= checkIn) {
            return res.status(400).json({
                success: false,
                message: "Check-out date must be later than check-in date"
            });
        }

        // Ensure no more than 3 nights
        const duration = (checkOut - checkIn) / (1000 * 3600 * 24); // Convert milliseconds to days
        if (duration > 3) {
            return res.status(400).json({
                success: false,
                message: "Bookings can only be made for up to 3 nights."
            });
        }

        // Check for existing bookings for the user
        const existedBooking = await Booking.find({user: req.user.id});
        if (existedBooking.length >= 3 && req.user.role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: `The user with ID ${req.user.id} has already made 3 bookings`
            });
        }

        const booking = await Booking.create(req.body);

        res.status(200).json({
            success: true,
            data: booking
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: "Cannot create Booking"
        });
    }
}

//@desc     Update booking
//@route    PUT /api/v1/bookings/:id
//@access   Private
exports.updateBooking = async (req, res, next) => {
    try {
        let booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: `No booking with the id of ${req.params.id}`
            });
        }

        //make sure user is the appointment owner
        if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: `User ${req.params.id} is not authorized to update this booking`
            });
        }

        booking = await Booking.findByIdAndUpdate(req.params.id, req.body,{
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: booking
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: "Cannot update Booking"
        });
    }
}

//@desc     Delete booking
//@route    DELETE /api/v1/bookings/:id
//@access   Private
exports.deleteBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: `No booking with the id of ${req.params.id}`
            });
        }

        //make sure user is the booking owner
        if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: `User ${req.params.id} is not authorized to delete this booking`
            });
        }

        await booking.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: "Cannot delete Booking"
        });
    }
}