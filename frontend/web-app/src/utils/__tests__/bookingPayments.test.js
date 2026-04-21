import { describe, expect, it } from 'vitest';
import { getPaymentSummary } from '../bookingPayments';

describe('bookingPayments', () => {
    it('labels Stripe payments as paid online once paid', () => {
        expect(getPaymentSummary({
            paymentMethod: 'stripe',
            paymentStatus: 'paid',
        })).toMatchObject({
            label: 'Paid online',
            tone: 'paid',
        });
    });

    it('labels completed clinic payments as paid at clinic', () => {
        expect(getPaymentSummary({
            paymentMethod: 'pay_at_clinic',
            paymentStatus: 'paid',
        })).toMatchObject({
            label: 'Paid at clinic',
            tone: 'clinic_paid',
        });
    });

    it('keeps unpaid clinic bookings as pay at clinic', () => {
        expect(getPaymentSummary({
            paymentMethod: 'pay_at_clinic',
            paymentStatus: 'pay_at_clinic',
        })).toMatchObject({
            label: 'Pay at clinic',
            tone: 'clinic',
        });
    });
});
