export const normalizePaymentMethod = (booking) => booking?.paymentMethod || 'pay_at_clinic';

export const normalizePaymentStatus = (booking) => {
    const paymentMethod = normalizePaymentMethod(booking);
    if (booking?.paymentStatus) return booking.paymentStatus;
    return paymentMethod === 'stripe' ? 'paid' : 'pay_at_clinic';
};

export const isOnlinePaymentPending = (booking) =>
    normalizePaymentMethod(booking) === 'stripe' && normalizePaymentStatus(booking) === 'pending';

export const isOnlinePaymentPaid = (booking) =>
    normalizePaymentMethod(booking) === 'stripe' && normalizePaymentStatus(booking) === 'paid';

export const isClinicPaymentPaid = (booking) =>
    normalizePaymentMethod(booking) === 'pay_at_clinic' && normalizePaymentStatus(booking) === 'paid';

export const canPatientCancelBooking = (booking) => {
    if (!booking || booking.statusId !== 'S1' || booking.confirmedAt) return false;
    return !isOnlinePaymentPaid(booking);
};

export const canDoctorConfirmBooking = (booking) => {
    if (!booking || booking.statusId !== 'S1' || booking.confirmedAt) return false;
    return normalizePaymentMethod(booking) !== 'stripe' || isOnlinePaymentPaid(booking);
};

export const getPaymentSummary = (booking) => {
    if (isOnlinePaymentPending(booking)) {
        return {
            label: 'Online payment',
            tone: 'pending',
            detail: 'Stripe checkout is still pending.',
        };
    }

    if (isOnlinePaymentPaid(booking)) {
        return {
            label: 'Paid online',
            tone: 'paid',
            detail: 'Paid securely by card or Apple Pay.',
        };
    }

    if (isClinicPaymentPaid(booking)) {
        return {
            label: 'Paid at clinic',
            tone: 'clinic_paid',
            detail: 'Collected at the clinic and recognized after the visit was completed.',
        };
    }

    return {
        label: 'Pay at clinic',
        tone: 'clinic',
        detail: 'Payment will be collected at the clinic.',
    };
};
