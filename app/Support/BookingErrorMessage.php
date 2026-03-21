<?php

namespace App\Support;

use Illuminate\Database\QueryException;
use Throwable;

class BookingErrorMessage
{
    private const SAFE_MESSAGES = [
        'Invalid booking window. Allowed range is Today to Today + 30 days.',
        'No schedule found for the selected time.',
        'This time slot is unavailable.',
        'This time slot is already booked.',
        'Booking not found.',
        'Booking cannot be cancelled from the current status.',
        'Online-paid bookings cannot be cancelled automatically. Please contact the clinic.',
        'Doctors must cancel at least 24 hours in advance.',
        'Only new bookings can be confirmed.',
        'This booking is awaiting online payment.',
        'Booking has already been confirmed.',
        'Booking must be confirmed before sending prescription.',
        'Booking must be confirmed before marking no-show.',
        'Doctor profile is not ready for booking.',
        'This doctor currently accepts online payment only.',
        'Online payment is not available for this doctor yet.',
        'Online payment is not configured yet. Please use Pay at clinic for now.',
        'The consultation fee is unavailable for online payment.',
        'Unsupported consultation fee format for online payment.',
        'Stripe checkout session could not be created.',
    ];

    public static function resolve(Throwable $exception, string $fallback): string
    {
        $message = trim($exception->getMessage());

        if ($message === '') {
            return $fallback;
        }

        if ($exception instanceof QueryException || self::looksLikeRawSql($message)) {
            return $fallback;
        }

        if (in_array($message, self::SAFE_MESSAGES, true)) {
            return $message;
        }

        return $fallback;
    }

    private static function looksLikeRawSql(string $message): bool
    {
        $needles = [
            'SQLSTATE[',
            'Connection:',
            'insert into',
            'update `',
            'select * from',
            'Unknown column',
        ];

        foreach ($needles as $needle) {
            if (str_contains($message, $needle)) {
                return true;
            }
        }

        return false;
    }
}
