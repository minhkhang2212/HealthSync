<?php

namespace App\Helpers;

use Carbon\Carbon;

class TimeHelper
{
    private const TIMEZONE = 'Europe/London';
    private const TIME_SLOT_HOURS = [
        'T1' => '08:00',
        'T2' => '09:00',
        'T3' => '10:00',
        'T4' => '11:00',
        'T5' => '13:00',
        'T6' => '14:00',
        'T7' => '15:00',
        'T8' => '16:00',
    ];

    /**
     * Get current time in London timezone
     */
    public static function nowLondon(): Carbon
    {
        return Carbon::now(self::TIMEZONE);
    }

    /**
     * Parse a date string into London timezone
     */
    public static function parseLondon(string $date): Carbon
    {
        return Carbon::parse($date, self::TIMEZONE);
    }

    public static function isBookingWindowValid(string $bookingDate, string $timeType): bool
    {
        if (!array_key_exists($timeType, self::TIME_SLOT_HOURS)) {
            return false;
        }

        $now = self::nowLondon();
        $today = $now->copy()->startOfDay();
        $maxDay = $now->copy()->addDays(2)->endOfDay();
        $appointmentAt = self::getAppointmentDateTime($bookingDate, $timeType);

        if ($appointmentAt->lessThan($now)) {
            return false;
        }

        return $appointmentAt->between($today, $maxDay, true);
    }

    public static function isDoctorCancellationAllowed(string $bookingDate, string $timeType): bool
    {
        if (!array_key_exists($timeType, self::TIME_SLOT_HOURS)) {
            return false;
        }

        $appointmentAt = self::getAppointmentDateTime($bookingDate, $timeType);
        $hoursToAppointment = self::nowLondon()->diffInHours($appointmentAt, false);

        return $hoursToAppointment >= 24;
    }

    public static function getAppointmentDateTime(string $bookingDate, string $timeType): Carbon
    {
        return Carbon::createFromFormat(
            'Y-m-d H:i',
            "{$bookingDate} " . self::TIME_SLOT_HOURS[$timeType],
            self::TIMEZONE
        );
    }
}
