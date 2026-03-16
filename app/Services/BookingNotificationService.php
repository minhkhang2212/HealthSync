<?php

namespace App\Services;

use App\Mail\DoctorBookingConfirmationMail;
use App\Mail\DoctorPrescriptionMail;
use App\Models\Booking;
use Illuminate\Support\Facades\Mail;
use RuntimeException;

class BookingNotificationService
{
    public function sendConfirmation(Booking $booking): void
    {
        $recipient = $this->resolveRecipient($booking);
        if ($recipient === '') {
            throw new RuntimeException('Patient email is missing, so confirmation email could not be sent.');
        }

        Mail::to($recipient)->send(new DoctorBookingConfirmationMail($booking));
    }

    public function sendPrescription(Booking $booking): void
    {
        $recipient = $this->resolveRecipient($booking);
        if ($recipient === '') {
            throw new RuntimeException('Patient email is missing, so prescription email could not be sent.');
        }

        Mail::to($recipient)->send(new DoctorPrescriptionMail($booking));
    }

    private function resolveRecipient(Booking $booking): string
    {
        $preferred = trim((string) ($booking->patientContactEmail ?? ''));
        if ($preferred !== '') {
            return $preferred;
        }

        return trim((string) ($booking->patient?->email ?? ''));
    }
}
